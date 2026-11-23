//! Tier-1 coverage: the share of each document's bytes tier 1 renders itself.
//! `cargo run --release --example coverage -- file.md...`.
fn main() {
    let options = nizel_engine::block::Options { anchors: true, autolinks: true, safe: true, slug_classic: false };
    let (mut all, mut handed) = (0usize, 0usize);
    for path in std::env::args().skip(1) {
        let source = std::fs::read_to_string(&path).expect("read");
        let accepted = nizel_engine::fast::render(&source, &options, &mut String::new());
        let over = if accepted { nizel_engine::fast::handed_over_bytes() } else { source.len() };
        all += source.len();
        handed += over;
        println!("{:<24} {:>5.1}% by tier 1{}", path.rsplit('/').next().unwrap_or(&path), 100.0 * (1.0 - over as f64 / source.len().max(1) as f64), if accepted { "" } else { " (whole document to the full engine)" });
    }
    println!("{:<24} {:>5.1}%", "all", 100.0 * (1.0 - handed as f64 / all.max(1) as f64));
}
