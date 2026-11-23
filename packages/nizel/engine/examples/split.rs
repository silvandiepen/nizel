//! Time spent parsing vs rendering the AST vs dropping it, per fixture:
//! `cargo run --release --example split -- <file>...`.
use std::time::Instant;

fn main() {
    let options = nizel_engine::block::Options { anchors: true, autolinks: true, safe: true, slug_classic: false };
    for path in std::env::args().skip(1) {
        let source = std::fs::read_to_string(&path).expect("fixture");
        let rounds = (3_000_000 / source.len().max(1)).clamp(20, 20_000);
        let (mut parse, mut render, mut drop) = (0u128, 0u128, 0u128);
        let mut out = String::new();
        for round in 0..rounds * 2 {
            let t0 = Instant::now();
            let blocks = nizel_engine::block::parse_markdown(&source, &options).expect("parsed");
            let t1 = Instant::now();
            out.clear();
            nizel_engine::render::render_blocks(&blocks, &mut out);
            let t2 = Instant::now();
            std::mem::drop(blocks);
            let t3 = Instant::now();
            if round >= rounds {
                parse += (t1 - t0).as_nanos();
                render += (t2 - t1).as_nanos();
                drop += (t3 - t2).as_nanos();
            }
        }
        let total = (parse + render + drop) as f64;
        println!(
            "{:<22} parse {:>5.1}%  render {:>5.1}%  drop {:>5.1}%",
            path.rsplit('/').next().unwrap_or(&path),
            100.0 * parse as f64 / total,
            100.0 * render as f64 / total,
            100.0 * drop as f64 / total
        );
    }
}
