//! Native timing loop for profiling: `cargo run --release --example bench -- <file> <iterations>`.
use std::time::Instant;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let source = std::fs::read_to_string(&args[1]).expect("fixture");
    let iterations: usize = args.get(2).and_then(|n| n.parse().ok()).unwrap_or(200);
    let mut out = String::new();
    let start = Instant::now();
    for _ in 0..iterations {
        out.clear();
        nizel_engine::render_markdown(&source, 7, &mut out).expect("rendered");
    }
    println!("{:.3} ms per render ({} bytes out)", start.elapsed().as_secs_f64() * 1000.0 / iterations as f64, out.len());
}
