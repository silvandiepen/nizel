//! Writes the blocks of a document that tier 1 accepts on their own (fences
//! kept whole), joined by blank lines: a real-text document inside the subset.
//! `cargo run --release --example subset -- in.md out.md`.
use nizel_engine::block::Options;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let source = std::fs::read_to_string(&args[1]).expect("input");
    let options = Options { anchors: true, autolinks: true, safe: true, slug_classic: false };
    let (mut blocks, mut current, mut in_fence) = (Vec::new(), Vec::new(), false);
    for line in source.split('\n') {
        if line.starts_with("```") {
            in_fence = !in_fence;
        }
        if line.trim().is_empty() && !in_fence {
            if !current.is_empty() {
                blocks.push(current.join("\n"));
                current.clear();
            }
        } else {
            current.push(line);
        }
    }
    if !current.is_empty() {
        blocks.push(current.join("\n"));
    }
    let total = blocks.len();
    let kept: Vec<String> = blocks.into_iter().filter(|b| nizel_engine::fast::render(b, &options, &mut String::new())).collect();
    let doc = kept.join("\n\n") + "\n";
    let whole = nizel_engine::fast::render(&doc, &options, &mut String::new());
    std::fs::write(&args[2], &doc).expect("output");
    println!("{} of {total} blocks kept, {} bytes, whole document accepted: {whole}", kept.len(), doc.len());
}
