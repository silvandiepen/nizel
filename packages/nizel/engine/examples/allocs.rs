//! Counts allocations per render: `cargo run --release --example allocs -- <file>`.
use std::alloc::{GlobalAlloc, Layout, System};
use std::sync::atomic::{AtomicUsize, Ordering::Relaxed};

struct Counting;
static COUNT: AtomicUsize = AtomicUsize::new(0);
static BYTES: AtomicUsize = AtomicUsize::new(0);

unsafe impl GlobalAlloc for Counting {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        COUNT.fetch_add(1, Relaxed);
        BYTES.fetch_add(layout.size(), Relaxed);
        unsafe { System.alloc(layout) }
    }
    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        unsafe { System.dealloc(ptr, layout) }
    }
    unsafe fn realloc(&self, ptr: *mut u8, layout: Layout, new_size: usize) -> *mut u8 {
        COUNT.fetch_add(1, Relaxed);
        BYTES.fetch_add(new_size, Relaxed);
        unsafe { System.realloc(ptr, layout, new_size) }
    }
}

#[global_allocator]
static GLOBAL: Counting = Counting;

fn main() {
    let source = std::fs::read_to_string(std::env::args().nth(1).expect("file")).expect("fixture");
    let mut out = String::new();
    COUNT.store(0, Relaxed);
    BYTES.store(0, Relaxed);
    nizel_engine::render_markdown(&source, 7, &mut out).expect("rendered");
    let (count, bytes) = (COUNT.load(Relaxed), BYTES.load(Relaxed));
    println!("{} bytes in: {count} allocations, {bytes} bytes requested ({:.1}x input)", source.len(), bytes as f64 / source.len() as f64);
}
