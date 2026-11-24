//! A per-call bump arena for the Wasm build.
//!
//! Every conversion is one self-contained call: while `active`, allocations
//! bump a pointer through large chunks and frees are no-ops (except popping
//! the newest block, and growing it in place). Each export that converts
//! calls `begin` (which resets the arena) and `end` before touching the
//! buffers that outlive the call, which always use the system allocator.

use std::alloc::{GlobalAlloc, Layout, System};
use std::cell::UnsafeCell;

const FIRST_CHUNK: usize = 1 << 20;
const MAX_CHUNKS: usize = 48;
/// Chunks beyond this many bytes are returned to the system on `begin`.
const RETAINED: usize = 16 << 20;

struct Chunk {
    start: usize,
    size: usize,
}

struct State {
    active: bool,
    chunks: [Chunk; MAX_CHUNKS],
    count: usize,
    /// The chunk being bumped, the next free address in it, and its end.
    current: usize,
    next: usize,
    limit: usize,
    /// The newest allocation, which can be popped or grown in place.
    last: usize,
}

pub struct Arena {
    state: UnsafeCell<State>,
}

// Wasm here is single-threaded.
unsafe impl Sync for Arena {}

impl Arena {
    pub const fn new() -> Self {
        const EMPTY: Chunk = Chunk { start: 0, size: 0 };
        Arena {
            state: UnsafeCell::new(State { active: false, chunks: [EMPTY; MAX_CHUNKS], count: 0, current: 0, next: 0, limit: 0, last: 0 }),
        }
    }

    #[allow(clippy::mut_from_ref)]
    fn state(&self) -> &mut State {
        unsafe { &mut *self.state.get() }
    }

    fn contains(&self, ptr: usize) -> bool {
        let state = self.state();
        if state.count == 0 {
            return false;
        }
        // Nearly every pointer is in the chunk being bumped.
        let current = &state.chunks[state.current];
        if ptr >= current.start && ptr < current.start + current.size {
            return true;
        }
        state.chunks[..state.count].iter().any(|c| ptr >= c.start && ptr < c.start + c.size)
    }

    /// Starts a conversion: everything allocated in the previous one is gone.
    pub fn begin(&self) {
        let state = self.state();
        let mut kept = 0;
        let mut retained = 0;
        for index in 0..state.count {
            let (start, size) = (state.chunks[index].start, state.chunks[index].size);
            if retained + size <= RETAINED || index == 0 {
                state.chunks[kept] = Chunk { start, size };
                kept += 1;
                retained += size;
            } else {
                unsafe { System.dealloc(start as *mut u8, Layout::from_size_align_unchecked(size, 16)) };
            }
        }
        state.count = kept;
        state.current = 0;
        state.next = if kept > 0 { state.chunks[0].start } else { 0 };
        state.limit = if kept > 0 { state.chunks[0].start + state.chunks[0].size } else { 0 };
        state.last = 0;
        state.active = true;
    }

    /// Ends a conversion; later allocations outlive it.
    pub fn end(&self) {
        self.state().active = false;
    }

    /// The common case, inlined: the allocation fits in the current chunk.
    #[inline(always)]
    unsafe fn bump(&self, layout: Layout) -> *mut u8 {
        let state = self.state();
        let aligned = (state.next + layout.align() - 1) & !(layout.align() - 1);
        let end = aligned + layout.size();
        if end <= state.limit && state.count > 0 {
            state.next = end;
            state.last = aligned;
            return aligned as *mut u8;
        }
        unsafe { self.bump_slow(layout) }
    }

    /// The next chunk (a retained one, or a new one twice the size).
    #[inline(never)]
    unsafe fn bump_slow(&self, layout: Layout) -> *mut u8 {
        let state = self.state();
        loop {
            if state.count > 0 {
                let chunk = &state.chunks[state.current];
                let aligned = (state.next + layout.align() - 1) & !(layout.align() - 1);
                if aligned + layout.size() <= chunk.start + chunk.size {
                    state.next = aligned + layout.size();
                    state.last = aligned;
                    return aligned as *mut u8;
                }
                if state.current + 1 < state.count && state.chunks[state.current + 1].size >= layout.size() + layout.align() {
                    state.current += 1;
                    state.next = state.chunks[state.current].start;
                    state.limit = state.next + state.chunks[state.current].size;
                    continue;
                }
            }
            if state.count == MAX_CHUNKS {
                return unsafe { System.alloc(layout) };
            }
            let previous = if state.count > 0 { state.chunks[state.count - 1].size } else { FIRST_CHUNK / 2 };
            let size = (previous * 2).max(layout.size() + layout.align()).next_multiple_of(16);
            let start = unsafe { System.alloc(Layout::from_size_align_unchecked(size, 16)) } as usize;
            if start == 0 {
                return std::ptr::null_mut();
            }
            // Keep chunks in allocation order after the current one.
            state.chunks[state.count] = Chunk { start, size };
            state.count += 1;
            state.current = state.count - 1;
            state.next = start;
            state.limit = start + size;
        }
    }
}

impl Default for Arena {
    fn default() -> Self {
        Self::new()
    }
}

unsafe impl GlobalAlloc for Arena {
    #[inline]
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        if self.state().active { unsafe { self.bump(layout) } } else { unsafe { System.alloc(layout) } }
    }

    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        let address = ptr as usize;
        if self.contains(address) {
            let state = self.state();
            if state.active && address == state.last && address + layout.size() == state.next {
                state.next = address;
            }
            return;
        }
        unsafe { System.dealloc(ptr, layout) }
    }

    unsafe fn realloc(&self, ptr: *mut u8, layout: Layout, new_size: usize) -> *mut u8 {
        let address = ptr as usize;
        if !self.contains(address) {
            // Buffers that outlive a call stay with the system allocator.
            return unsafe { System.realloc(ptr, layout, new_size) };
        }
        let state = self.state();
        if state.active && address == state.last && address + layout.size() == state.next && address + new_size <= state.limit {
            state.next = address + new_size;
            return ptr;
        }
        let new_layout = unsafe { Layout::from_size_align_unchecked(new_size, layout.align()) };
        let moved = unsafe { self.alloc(new_layout) };
        if !moved.is_null() {
            unsafe { std::ptr::copy_nonoverlapping(ptr, moved, layout.size().min(new_size)) };
        }
        moved
    }
}
