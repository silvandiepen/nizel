//! Native throughput of tier 1 and the full engine on one document.
//! `cargo run --release --example fastbench -- file.md [--defaults]`: bare
//! options, or the defaults (heading IDs, autolinks, safe mode).
use std::time::Instant;
fn main() {
    let path = std::env::args().nth(1).expect("file");
    let source = std::fs::read_to_string(&path).expect("read");
    let defaults = std::env::args().any(|arg| arg == "--defaults");
    let options = nizel_engine::block::Options { anchors: defaults, autolinks: defaults, safe: defaults, slug_classic: false };
    let mut out = String::with_capacity(source.len() * 2);
    let rounds = (200_000_000 / source.len().max(1)).max(10);
    for (name, fast) in [("tier 1", true), ("full engine", false)] {
        let mut best = f64::MAX;
        for _ in 0..5 {
            let start = Instant::now();
            for _ in 0..rounds {
                out.clear();
                if fast {
                    assert!(nizel_engine::fast::render(&source, &options, &mut out));
                } else {
                    nizel_engine::render_markdown_full(&source, 0, &mut out).unwrap();
                }
            }
            best = best.min(start.elapsed().as_secs_f64());
        }
        println!("{name:<12} {:>7.1} MiB/s", source.len() as f64 * rounds as f64 / best / 1048576.0);
    }
}
