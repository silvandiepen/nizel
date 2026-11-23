//! Native timing loop for profiling: `cargo run --release --example bench -- <file> <iterations>`.
use std::time::Instant;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let source = std::fs::read_to_string(&args[1]).expect("fixture");
    let iterations: usize = args.get(2).and_then(|n| n.parse().ok()).unwrap_or(200);
    let reverse = args.get(3).is_some_and(|mode| mode == "reverse");
    let mut out = String::new();
    let start = Instant::now();
    for _ in 0..iterations {
        out.clear();
        if reverse {
            nizel_engine::reverse_html(&source, 0, &mut out).expect("converted");
        } else {
            nizel_engine::render_markdown(&source, 7, &mut out).expect("rendered");
        }
    }
    println!("{:.3} ms per render ({} bytes out)", start.elapsed().as_secs_f64() * 1000.0 / iterations as f64, out.len());
}
