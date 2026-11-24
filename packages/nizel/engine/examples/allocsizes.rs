//! Allocation sizes per render: `cargo run --release --example allocsizes -- <file>`.
use std::alloc::{GlobalAlloc, Layout, System};
use std::sync::atomic::{AtomicUsize, Ordering::Relaxed};

struct Counting;
static BUCKETS: [AtomicUsize; 8] = [const { AtomicUsize::new(0) }; 8];
static REALLOCS: AtomicUsize = AtomicUsize::new(0);

fn bucket(size: usize) -> usize {
    match size { 0..=8 => 0, 9..=16 => 1, 17..=32 => 2, 33..=64 => 3, 65..=256 => 4, 257..=1024 => 5, 1025..=16384 => 6, _ => 7 }
}

unsafe impl GlobalAlloc for Counting {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        BUCKETS[bucket(layout.size())].fetch_add(1, Relaxed);
        unsafe { System.alloc(layout) }
    }
    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        unsafe { System.dealloc(ptr, layout) }
    }
    unsafe fn realloc(&self, ptr: *mut u8, layout: Layout, new_size: usize) -> *mut u8 {
        REALLOCS.fetch_add(1, Relaxed);
        unsafe { System.realloc(ptr, layout, new_size) }
    }
}

#[global_allocator]
static GLOBAL: Counting = Counting;

fn main() {
    let source = std::fs::read_to_string(std::env::args().nth(1).expect("file")).expect("fixture");
    let mut out = String::new();
    for b in &BUCKETS { b.store(0, Relaxed); }
    REALLOCS.store(0, Relaxed);
    nizel_engine::render_markdown(&source, 7, &mut out).expect("rendered");
    let labels = ["<=8", "9-16", "17-32", "33-64", "65-256", "257-1K", "1K-16K", ">16K"];
    for (label, b) in labels.iter().zip(&BUCKETS) { println!("{label:>7}: {}", b.load(Relaxed)); }
    println!("reallocs: {}", REALLOCS.load(Relaxed));
}
