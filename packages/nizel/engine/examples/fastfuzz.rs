//! Tier 1 against the full engine: random documents near the edges of the
//! fast subset; wherever tier 1 accepts one, its HTML must equal the full
//! engine's byte for byte.
//! `cargo run --release --example fastfuzz -- [count] [seed]`.
use nizel_engine::block::Options;

const ATOMS: &[&str] = &[
    // Inside the subset.
    "Plain words here", "More text", "a", "Zeta", "x y z", " and ", "`code`", "``a ` b``", "` x `", "`",
    "\n", "\n", "\n\n", "\n\n", "# Title", "## Sub title ##", "### `code` head", "#", "######", "#######",
    "```", "```ts", "```js file=a.js {1,3}", "~~~", "---", "***", "___", "- - -",
    "caf\u{e9}", "\u{1f680}", "na\u{ef}ve", "\u{2014}", "100%", "2024", "x.y", "end.", "Hello, world!", "a ! b",
    "  ", " ", "    indented", "  two",
    "a > b", "say \"hi\"", "`<b>*x*`", "`a|b`", "`[x](y)`", "x: y", "a://b", "`http://e.com`", "` `", "`  `",
    "`\na\n`", "``` ```", "# a > b \"c\"", "# `x` y ##", "#  ", "```\ncode < & >\n```", "```py title\n", "text`", "a `b\n\nc` d", "x `y\n# z` w", "a `\tb`", "```\n\tcode\n```", "# a\tb", "-\t-\t-", "a\r\nb", "`a  ",
    "# Caf\u{e9}", "#\u{b}x", "# x\u{c}", "# C# guide", "# a #", "# a#", "#   spaced   ", "###### six", "## `code` and > \"q\"",
    "```rust,ignore", "```c++", "``` js ", "```{1,2}", "```js filename=\"a.js\"", "```j\u{e9}", "```a b", "    ```", "   ```",
    // Just outside: the tier must decline, never differ.
    "*em*", "**strong**", "_u_", "[link](x)", "<b>", "&amp;", "\\*", "~~d~~", "| a | b |", "a@b.co", "http://e.com",
    "> quote", "- item", "1. one", "+ plus", "===", "--", "\t", "\r\n", ":: note", "[r]: /url", "![i](s)",
    "  \n", "line  \nbreak", "\u{a0}", "\u{2028}", "trailing ",
];

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let count: usize = args.get(1).and_then(|n| n.parse().ok()).unwrap_or(200_000);
    let mut seed: u64 = args.get(2).and_then(|n| n.parse().ok()).unwrap_or(1);
    let mut random = |n: usize| {
        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        ((seed >> 33) as usize) % n
    };
    let profiles = [
        (7u32, Options { anchors: true, autolinks: true, safe: true, slug_classic: false }),
        (0u32, Options { anchors: false, autolinks: false, safe: false, slug_classic: false }),
    ];
    let (mut accepted, mut diffs) = (0usize, 0usize);
    for i in 0..count {
        let mut doc = String::new();
        for _ in 0..1 + random(16) {
            doc.push_str(ATOMS[random(ATOMS.len())]);
        }
        let (flags, options) = &profiles[i % 2];
        let mut fast = String::new();
        if !nizel_engine::fast::render(&doc, options, &mut fast) {
            continue;
        }
        accepted += 1;
        let mut full = String::new();
        if nizel_engine::render_markdown_full(&doc, *flags, &mut full).is_err() {
            continue;
        }
        if fast != full {
            diffs += 1;
            if diffs <= 5 {
                println!("DIFF flags {flags} doc {doc:?}\n  fast {fast:?}\n  full {full:?}");
            }
        }
    }
    println!("fastfuzz: {count} documents, {accepted} accepted by tier 1, {diffs} differences");
}
