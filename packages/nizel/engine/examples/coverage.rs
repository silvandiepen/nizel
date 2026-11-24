//! Tier-1 coverage: the share of each document's bytes tier 1 renders itself.
//! `cargo run --release --example coverage -- [--why] file.md...`; with
//! `--why`, also the largest stretches handed to the full engine; with
//! `--bare`, under bare options (no heading IDs, autolinks or safe mode).
fn main() {
    let bare = std::env::args().any(|arg| arg == "--bare");
    let options = if bare {
        nizel_engine::block::Options { anchors: false, autolinks: false, safe: false, slug_classic: false }
    } else {
        nizel_engine::block::Options { anchors: true, autolinks: true, safe: true, slug_classic: false }
    };
    let (mut all, mut handed, mut inline_all) = (0usize, 0usize, 0usize);
    let why = std::env::args().any(|arg| arg == "--why");
    for path in std::env::args().skip(1).filter(|arg| arg != "--why" && arg != "--bare") {
        let source = std::fs::read_to_string(&path).expect("read");
        nizel_engine::fast::trace_handed_over(why);
        let accepted = nizel_engine::fast::render(&source, &options, &mut String::new());
        let mut stretches = nizel_engine::fast::trace_handed_over(false);
        let over = if accepted { nizel_engine::fast::handed_over_bytes() } else { source.len() };
        let inline = if accepted { nizel_engine::fast::inline_fallback_bytes() } else { 0 };
        all += source.len();
        handed += over;
        inline_all += inline;
        let share = |bytes: usize| 100.0 * bytes as f64 / source.len().max(1) as f64;
        println!(
            "{:<24} {:>5.1}% by tier 1 ({:>4.1}% of it with full-engine inline){}",
            path.rsplit('/').next().unwrap_or(&path),
            100.0 - share(over),
            share(inline),
            if accepted { "" } else { " (whole document to the full engine)" }
        );
        // Paragraphs left to the full engine's inline parser come with length
        // 0; `--why` lists the stretches.
        stretches.retain(|(bytes, _)| *bytes > 0);
        stretches.sort_by(|a, b| b.0.cmp(&a.0));
        for (bytes, line) in stretches.iter().take(8) {
            println!("    {bytes:>6}  {}", line.chars().take(70).collect::<String>());
        }
    }
    let share = |bytes: usize| 100.0 * bytes as f64 / all.max(1) as f64;
    println!("{:<24} {:>5.1}% by tier 1 ({:>4.1}% of it with full-engine inline)", "all", 100.0 - share(handed), share(inline_all));
}
