//! Tier-1 coverage: the share of each document's bytes tier 1 renders itself.
//! `cargo run --release --example coverage -- [--why] file.md...`; with
//! `--why`, also the largest stretches handed to the full engine.
fn main() {
    let options = nizel_engine::block::Options { anchors: true, autolinks: true, safe: true, slug_classic: false };
    let (mut all, mut handed) = (0usize, 0usize);
    let why = std::env::args().any(|arg| arg == "--why");
    for path in std::env::args().skip(1).filter(|arg| arg != "--why") {
        let source = std::fs::read_to_string(&path).expect("read");
        nizel_engine::fast::trace_handed_over(why);
        let accepted = nizel_engine::fast::render(&source, &options, &mut String::new());
        let mut stretches = nizel_engine::fast::trace_handed_over(false);
        let over = if accepted { nizel_engine::fast::handed_over_bytes() } else { source.len() };
        all += source.len();
        handed += over;
        println!("{:<24} {:>5.1}% by tier 1{}", path.rsplit('/').next().unwrap_or(&path), 100.0 * (1.0 - over as f64 / source.len().max(1) as f64), if accepted { "" } else { " (whole document to the full engine)" });
        stretches.sort_by(|a, b| b.0.cmp(&a.0));
        for (bytes, line) in stretches.iter().take(8) {
            println!("    {bytes:>6}  {}", line.chars().take(70).collect::<String>());
        }
    }
    println!("{:<24} {:>5.1}%", "all", 100.0 * (1.0 - handed as f64 / all.max(1) as f64));
}
