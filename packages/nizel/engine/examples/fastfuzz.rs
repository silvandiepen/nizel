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
    "\n- item one", "\n- item two", "\n* star item", "\n+ plus item", "\n1. first", "\n2. second", "\n3) paren", "\n0. zero", "\n007. bond",
    "\n10. ten", "\n1234567890. big", "\n-  two spaces", "\n- ", "\n-x", "\n- [ ] task", "\n- [x] done", "\n  continued", "\n   - nested",
    "\n- `code` item", "\n- item > q", "\n- a  ", "\n1.x", "\n- - -", "\n* * *",
    "\n- ```\n\n  code\n", "\n  ```", "\n- a\n\n  b", "\n> quoted\nlazy", "\n<div>\n\nx\n</div>", "\n<!--\n\ncomment -->", "\n<script>\n\n",
    "\n::note\n\nbody\n::", "\n    code\n\n    more", "\n| a | b |\n| - | - |", "\nTitle\n===", "\n[ref]: /u", "\n- *em* item", "\n**bold** para",
    " *em*", " **strong**", " *a b*", " **a**b", "a*b*", " *a *b**", " ***x***", " *x*.", " *x*)", "(*x*)", " _x_", " snake_case_name", " *x\ny*",
    " * x*", " *x *", " **x*", " *x**", " *`c`*", " _a_b", "a_", "_", " *x*`c`", "`c`*x*", " *x*:", " *x*?y", " *1*", "*z*", " **a b c**,",
    "\n1. item\n\n   ```swift\n   code\n\n   ```\n", "\n- a\n  ```\n\ntext\n  ```", "\n  ```\nx\n    ```", "\n- ```js", "\n   ~~~\n", "\n      ```", "\n  ````\n  ```\n  ````",
    "\n- [x] ```js", "\n- [ ] ```\n\nlazy", "\n- [X]\u{3000}```", "\n> - [x] ```", "\n1. [ ] ~~~",
    "\n\n::note\nbody\n::\n", "\n\n::warning title\nkey: v\n::\ntext\n::\n", "\n\n::tip\n", "\n::inline-ish", "\n  ::indented\n", "\n\n::bad!\n::\n", "\n\n::\n", "\n- item\n::lazy\n",
    "\n| a | b |\n| --- | --- |\n| 1 | 2 |\n", "\n| L | C | R |\n|:--|:-:|--:|\n| x | y | z |", "a | b\n---|---\nc | d", "\n| one |\n| --- |", "\n| `a|b` | c |\n|---|---|",
    "\n| *em* | **s** |\n|---|---|\n| x |", "\n|a|b|\n|-|-|", "\n| a |\n|---|---|\n| 1 | 2 | 3 |", "\nx\n| a | b |\n|---|---|", "\n| a | b |\n|---|---|\n\n", "\n| a\t| b |\n|---|---|",
    "\n| > q | \"d\" |\n| --- | --- |", "\n|  |  |\n|---|---|", "\n| a | b |\n|---|---|\nnext",
    " [link](https://example.com/a)", " [two words](/docs/x.md#y)", "[x](y)", " ![img](a.png)", " [js](javascript:alert)", " [js](JavaScript:x)", " [](x)", " [a]()",
    " [a](b c)", " [a](b(c))", " [a](b \"t\")", " [a][ref]", " [a]", " *[a](b)*", " [a](b)*x*", " `[a](b)`", " [`a`](b)", "# [Head](h)", "\n| [a](b) | c |\n|---|---|",
    " [a](b%20c)", " [a](b&c)", " [a](<b>)", " [a.b](mailto:x)",  " [a](b)c", " [a]  (b)", " [[a]](b)", " [a](b)[c](d)",
    "\n- a\n  - b\n    - c", "\n- a\n  continued", "\n- a\nlazy", "\n- a\n\n  para two", "\n- a\n\n- b", "\n1. a\n   1. b\n2. c", "\n- [x] a\n  - [ ] b",
    "\n- a\n  ```\n  code\n  ```", "\n- a\n  | x | y |\n  |---|---|", "\n- a\n  > q", "\n- # h\n  text", "\n-   wide\n    text", "\n3. three\n4. four", "\n- a\n\n\n- b",
    "\n  - indented item", "\n- a\n    code-ish", "\n* a\n- b", "\n- **a**\n  *b* [c](d)",
    "\npara\n- item", "\npara\n# head", "\npara\n---", "\npara\n***", "\npara\n- ", "\npara\n2. two", "\npara\n1. one", "\npara\n```\nx\n```", "\npara\n> q",
    "\npara  \n- item", "\npara\n#tag", "\npara\n-x", "\npara\n=", "\npara\n* * *", "\npara\n+ p", "\npara\n- a | b", "\npara `x\n- y`",
    "\n**Bold start** text", "\n*em start* x", "\n`code` start", "\n[link](u) start", "\n[ref]: /def", "\n![i](a.png) x", "\n(paren) x", "\n\"q\" x", "\n_u_ x",
    "\ntext\n**more**", "\ntext\n`c` more", "\ntext\n[l](u)", "\ntext\n[ref]: /x", "\ntext\n2. not", "\ntext\n#tag", "\ntext\n-x", "\ntext\n+x", "\n**a\n**b",
    "\n*\tx", "\n**x** | y", "\n``x``", "\n`x\n```",
    "\n<div>\nx\n</div>", "\n<p align=\"center\">\n  <img src=\"a.png\">\n</p>", "\n<style>\na {}\n\nb {}\n</style>", "\n<!-- c\n\nd -->", "\n<!-- open", "\n<span>inline</span> text",
    "\n<br>", "\n<x-y>", "\n<?php x ?>", "\n<![CDATA[ x ]]>", "\n<!DOCTYPE html>", "\n</div>", "\n<script>\n[ref]: /u\n</script>", "\n<pre>\n\n</pre>", "\n<a href=\"x\">a</a>", "\n<notatag",
    "\n- a\n\n  ```\n  x\n\n```\n[ref]: /u\n```", "\n- a\n  ~~~\n", "\n```\n[r]: /x\n```", "\n| a | b |\n|---|---|\n``` | x", "\n| a |\n|---|\n<div> |", "\n> ```\n> x",
    "\ntext\n```a`b", "\n```a`b c", "\n  ```\n  [q]: /y", "\n<!--\n```\n-->", "\n~~~\n[s]: /z\n~~~", "\n- ```\n\n[t]: /w\n```",
    "\n>\t[qa]: /u", "\n>  [qb]: /u", "\n>\u{a0}[qc]: /u", "\n>\u{3000} [qd]: /u", "\n> \t[qe]: /u", "\n````\n[qf]: <a b>\n````",
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
