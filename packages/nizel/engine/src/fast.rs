//! Tier 1 (NIZEL-005): a single pass that writes HTML directly, for the
//! documents it can reproduce exactly. Anything outside its subset makes it
//! decline, and the caller renders the document with the full engine
//! (`block` + `render`), which is the reference for every byte here.
//!
//! The subset grows construct by construct; each addition is checked against
//! the full engine by `examples/fastfuzz.rs` and every Nizel gate.
//!
//! Covered now:
//! - blank lines (empty or ASCII spaces only)
//! - paragraphs whose lines start with an ASCII letter, with plain text, soft
//!   breaks and code spans; no line but the last may end in a space
//! - ATX headings (content outside the subset goes through the full engine's
//!   own heading function) and fenced code opening at column 0
//! - thematic breaks
//!
//! Paragraphs are read in place from the source and classified one byte at a
//! time against a table, copying runs of plain bytes at once.

use crate::block::{self, Options};
use crate::inline::Ctx;
use crate::js::escape_html_into;
use crate::refs::References;
use std::collections::HashMap;

/// Renders `source` into `out` when every construct is in the subset.
/// Returns false (with `out` restored) when it declines.
pub fn render(source: &str, options: &Options, out: &mut String) -> bool {
    let start = out.len();
    let handled = render_inner(source, options, out).is_some();
    if !handled {
        out.truncate(start);
    }
    handled
}

fn line_end(b: &[u8], from: usize) -> usize {
    crate::scan::find_byte(b, from, b'\n').unwrap_or(b.len())
}

fn render_inner(source: &str, options: &Options, out: &mut String) -> Option<()> {
    let b = source.as_bytes();
    // Tabs and CR change line handling (tab expansion, line-ending
    // normalization) before any block is seen: every construct below
    // declines on its own lines when it meets one.
    let references = References::new();
    let ctx = Ctx { options, references: &references };
    let mut seen = HashMap::new();
    let mut first_block = true;
    let mut pos = 0;
    while pos < b.len() {
        let lead = b[pos];
        if lead == b'\n' {
            pos += 1;
            continue;
        }
        if lead == b' ' {
            // Blank (JavaScript's trim would see only ASCII spaces here); an
            // indented line is outside the subset.
            if is_blank_from(b, pos) {
                pos = line_end(b, pos) + 1;
                continue;
            }
            return None;
        }
        if !first_block {
            out.push('\n');
        }
        first_block = false;

        if lead.is_ascii_alphabetic() {
            pos = paragraph(source, pos, out)?;
            continue;
        }
        let eol = line_end(b, pos);
        let line = &source[pos..eol];
        if lead != b'`' && line.bytes().any(|c| c == b'\t' || c == b'\r') {
            return None;
        }
        match lead {
            b'#' => heading(line, options, &ctx, &mut seen, out)?,
            b'`' => {
                pos = fenced_code(source, pos, eol, out)?;
                continue;
            }
            b'-' | b'*' | b'_' if block::is_thematic_break(line) => out.push_str("<hr />"),
            _ => return None,
        }
        pos = eol + 1;
    }
    Some(())
}

/// A paragraph starting at `start` (an ASCII letter); the position after it.
/// Its lines are contiguous in the source and joined by `\n`, exactly the
/// paragraph source the full engine builds, so it is read in place, in one
/// pass that also decides where it ends.
fn paragraph(source: &str, start: usize, out: &mut String) -> Option<usize> {
    let b = source.as_bytes();
    out.push_str("<p>");
    // The paragraph's (space-trimmed) end, computed at the first backtick:
    // a code span must close inside the paragraph.
    let mut text_limit: Option<usize> = None;
    let mut run = start;
    let mut i = start;
    let end = loop {
        // Eight bytes at a time while none of them needs a look.
        while i + 8 <= b.len() {
            let w = &b[i..i + 8];
            let any = CLASS[w[0] as usize] | CLASS[w[1] as usize] | CLASS[w[2] as usize] | CLASS[w[3] as usize]
                | CLASS[w[4] as usize] | CLASS[w[5] as usize] | CLASS[w[6] as usize] | CLASS[w[7] as usize];
            if any != PLAIN {
                break;
            }
            i += 8;
        }
        if i >= b.len() {
            break b.len();
        }
        match CLASS[b[i] as usize] {
            PLAIN => i += 1,
            NEWLINE => {
                if continues_after(b, i)? {
                    i += 1;
                } else {
                    break i;
                }
            }
            GREATER | QUOTE => {
                out.push_str(&source[run..i]);
                out.push_str(if b[i] == b'>' { "&gt;" } else { "&quot;" });
                i += 1;
                run = i;
            }
            COLON => {
                // `://` may start a bare URL.
                if b[i + 1..].starts_with(b"//") {
                    return None;
                }
                i += 1;
            }
            BACKTICK => {
                let limit = match text_limit {
                    Some(limit) => limit,
                    None => {
                        let limit = trim_spaces_end(b, i, paragraph_end(b, i)?);
                        text_limit = Some(limit);
                        limit
                    }
                };
                match crate::inline::match_code_span(&b[..limit], i) {
                    Some((span_end, (value_start, value_end))) => {
                        let value = &source[value_start..value_end];
                        if !code_span_in_subset(value) {
                            return None;
                        }
                        out.push_str(&source[run..i]);
                        code_span(value, out, None);
                        i = span_end;
                        run = span_end;
                    }
                    None => i += 1,
                }
            }
            _ => return None,
        }
    };
    // `source.trimEnd()` of spaces: the last text run loses them.
    out.push_str(&source[run..trim_spaces_end(b, run, end)]);
    out.push_str("</p>");
    Some(if end < b.len() { end + 1 } else { b.len() })
}

/// At the newline `i` inside a paragraph: does the paragraph go on (Some(true)),
/// end at a blank line (Some(false)), or leave the subset (None)? A
/// continuation line must start with a letter (anything else could
/// interrupt the paragraph or underline it), and a space before the newline
/// makes a hard or trimmed soft break.
fn continues_after(b: &[u8], i: usize) -> Option<bool> {
    let next = i + 1;
    if is_blank_from(b, next) {
        return Some(false);
    }
    (b[next].is_ascii_alphabetic() && b[i - 1] != b' ').then_some(true)
}

/// Is the line starting at `at` blank (empty or ASCII spaces only)? Steps
/// over its spaces instead of searching for its end.
fn is_blank_from(b: &[u8], at: usize) -> bool {
    let mut i = at;
    while i < b.len() && b[i] == b' ' {
        i += 1;
    }
    i >= b.len() || b[i] == b'\n'
}

/// The end of the paragraph containing `from` (the newline that ends it, or
/// the input's end), checking every line on the way as `continues_after` does.
fn paragraph_end(b: &[u8], from: usize) -> Option<usize> {
    let mut eol = line_end(b, from);
    while eol < b.len() {
        if !continues_after(b, eol)? {
            break;
        }
        eol = line_end(b, eol + 1);
    }
    Some(eol)
}

fn trim_spaces_end(b: &[u8], floor: usize, mut end: usize) -> usize {
    while end > floor && b[end - 1] == b' ' {
        end -= 1;
    }
    end
}

/// Code span content tier 1 can take: the balanced-link pre-scan sees `[`
/// inside code too, tables see `|` anywhere on a line, and tabs or CR change
/// how the whole document is read.
fn code_span_in_subset(value: &str) -> bool {
    !value.bytes().any(|c| matches!(c, b'[' | b'|' | b'\t' | b'\r'))
}

const PLAIN: u8 = 0;
const GREATER: u8 = 1;
const QUOTE: u8 = 2;
const BACKTICK: u8 = 3;
const COLON: u8 = 4;
const OUTSIDE: u8 = 5;
const NEWLINE: u8 = 6;

/// What each byte means inside a paragraph. Outside the subset: escapes,
/// HTML and autolinks, entities, links and images, emphasis,
/// strikethrough, pipes and emails.
static CLASS: [u8; 256] = {
    let mut table = [PLAIN; 256];
    table[b'>' as usize] = GREATER;
    table[b'"' as usize] = QUOTE;
    table[b'`' as usize] = BACKTICK;
    table[b':' as usize] = COLON;
    table[b'\n' as usize] = NEWLINE;
    let outside = b"\\<&[*_~|@\t\r";
    let mut i = 0;
    while i < outside.len() {
        table[outside[i] as usize] = OUTSIDE;
        i += 1;
    }
    table
};

/// `parseInline` + `renderInline` for plain text, soft breaks (`\n`, which
/// renders as itself) and code spans, in one pass. With `text`, also
/// collects `stripInline` of the result (for heading IDs).
fn inline(source: &str, out: &mut String, mut text: Option<&mut String>) -> Option<()> {
    let b = source.as_bytes();
    let mut run = 0;
    let mut i = 0;
    while i < b.len() {
        let class = CLASS[b[i] as usize];
        if class == PLAIN {
            i += 1;
            continue;
        }
        match class {
            GREATER | QUOTE => {
                out.push_str(&source[run..i]);
                out.push_str(if class == GREATER { "&gt;" } else { "&quot;" });
                if let Some(text) = text.as_deref_mut() {
                    text.push_str(&source[run..=i]);
                }
                i += 1;
                run = i;
            }
            COLON => {
                // `://` may start a bare URL.
                if b[i + 1..].starts_with(b"//") {
                    return None;
                }
                i += 1;
            }
            BACKTICK => match crate::inline::match_code_span(b, i) {
                Some((end, (value_start, value_end))) => {
                    let value = &source[value_start..value_end];
                    if !code_span_in_subset(value) {
                        return None;
                    }
                    out.push_str(&source[run..i]);
                    if let Some(text) = text.as_deref_mut() {
                        text.push_str(&source[run..i]);
                    }
                    code_span(value, out, text.as_deref_mut());
                    i = end;
                    run = end;
                }
                None => i += 1,
            },
            _ => return None,
        }
    }
    out.push_str(&source[run..]);
    if let Some(text) = text {
        text.push_str(&source[run..]);
    }
    Some(())
}

/// `<code>` with `normalizeCodeSpan` applied: newlines become spaces, and one
/// space comes off each end when both ends have one and it is not all spaces.
fn code_span(value: &str, out: &mut String, text: Option<&mut String>) {
    let b = value.as_bytes();
    let strip = b.len() >= 2
        && matches!(b[0], b' ' | b'\n')
        && matches!(b[b.len() - 1], b' ' | b'\n')
        && b.iter().any(|&c| c != b' ' && c != b'\n');
    let inner = if strip { &value[1..value.len() - 1] } else { value };
    out.push_str("<code>");
    let mark = out.len();
    escape_html_into(out, inner);
    if inner.contains('\n') {
        // Only the newlines change, and escaping leaves them alone.
        let replaced = out[mark..].replace('\n', " ");
        out.truncate(mark);
        out.push_str(&replaced);
    }
    if let Some(text) = text {
        text.push_str(&inner.replace('\n', " "));
    }
    out.push_str("</code>");
}

/// An ATX heading line. The common shape (ASCII, `#` run, a space, content
/// with no closing hashes) is read here; anything else, and content outside
/// the inline subset, goes through the full engine's own functions.
fn heading(line: &str, options: &Options, ctx: &Ctx, seen: &mut HashMap<String, usize>, out: &mut String) -> Option<()> {
    let b = line.as_bytes();
    let hashes = b.iter().take_while(|&&c| c == b'#').count();
    let simple = (1..=6).contains(&hashes)
        && b.is_ascii()
        // JavaScript's \s also trims vertical tabs and form feeds.
        && !b.iter().any(|c| (0x09..=0x0d).contains(c))
        && (hashes == b.len() || b[hashes] == b' ')
        && !line.trim_end_matches(' ').ends_with('#');
    if simple {
        let content = line[hashes..].trim_matches(' ');
        let mark = out.len();
        out.push_str("<h");
        out.push((b'0' + hashes as u8) as char);
        if !options.anchors || content.is_empty() {
            out.push('>');
            if inline(content, out, None).is_some() {
                close_heading(hashes as u8, out);
                return Some(());
            }
        } else {
            let mut body = String::with_capacity(content.len() + 8);
            let mut text = String::with_capacity(content.len());
            if inline(content, &mut body, Some(&mut text)).is_some() {
                if !text.is_empty() {
                    let id = crate::slug::unique_slug(crate::slug::slugify(&text, options.slug_classic), seen);
                    out.push_str(" id=\"");
                    escape_html_into(out, &id);
                    out.push('"');
                }
                out.push('>');
                out.push_str(&body);
                close_heading(hashes as u8, out);
                return Some(());
            }
        }
        out.truncate(mark);
    }
    let (depth, content) = block::atx_heading(line)?;
    let content = block::trim_closing_heading_hashes(content);
    let heading = block::heading(depth, &content, ctx, seen).ok()?;
    crate::render::render_block(&heading, out);
    Some(())
}

fn close_heading(depth: u8, out: &mut String) {
    out.push_str("</h");
    out.push((b'0' + depth) as char);
    out.push('>');
}

/// A fenced code block opening on the line `start..eol`, as `parseBlocks`
/// reads it; the position after its closing fence. The code is the source
/// between the fences, escaped in place in one pass that also finds the
/// closing fence and declines on tabs and CR.
fn fenced_code(source: &str, start: usize, eol: usize, out: &mut String) -> Option<usize> {
    let b = source.as_bytes();
    let opening = &source[start..eol];
    if opening.bytes().any(|c| c == b'\t' || c == b'\r') {
        return None;
    }
    let fence = block::opening_fence(opening)?;
    // A plain info string (one ASCII word, or none): it is the language, and
    // there is no filename or highlight list to find in it.
    let word = fence.info.trim_matches(' ');
    let (lang, filename, highlight_lines) = if word.bytes().all(|c| c.is_ascii_alphanumeric() || matches!(c, b'-' | b'+' | b'.' | b'_' | b'#')) {
        ((!word.is_empty()).then(|| word.to_string()), None, None)
    } else {
        let info = block::parse_fence_info(fence.info, fence.marker)?;
        let (filename, highlight_lines) = block::parse_code_meta(&info.meta);
        (info.lang, filename, highlight_lines)
    };
    out.push_str("<pre><code");
    if let Some(lang) = lang.as_deref().filter(|l| !l.is_empty()) {
        out.push_str(" class=\"language-");
        escape_html_into(out, lang);
        out.push('"');
    }
    if let Some(filename) = filename {
        out.push_str(" data-filename=\"");
        escape_html_into(out, &filename);
        out.push('"');
    }
    if let Some(lines) = highlight_lines {
        let joined: Vec<String> = lines.iter().map(|&n| crate::jsnum::to_string(n)).collect();
        out.push_str(" data-highlight-lines=\"");
        escape_html_into(out, &joined.join(","));
        out.push('"');
    }
    out.push('>');

    // Does the line starting at `at` close the fence? Its tabs or CR leave the subset.
    let closes = |at: usize| -> Option<Option<usize>> {
        // A closing fence starts with up to three spaces and the fence marker.
        let indent = b[at.min(b.len())..].iter().take(3).take_while(|&&c| c == b' ').count();
        if b.get(at + indent) != Some(&fence.marker) {
            return Some(None);
        }
        let end = line_end(b, at);
        let line = &source[at..end];
        if block::closes_fence(line, fence.marker, fence.length) {
            if line.bytes().any(|c| c == b'\t' || c == b'\r') {
                return None;
            }
            return Some(Some(end));
        }
        Some(None)
    };
    let content_start = (eol + 1).min(b.len());
    let mut run = content_start;
    let mut pos = content_start;
    let mut next = None;
    if content_start < b.len() {
        if let Some(close_end) = closes(content_start)? {
            next = Some(close_end + 1);
        }
    }
    while next.is_none() {
        match crate::scan::find_any_n(b, pos, *b"\n&<>\"\t\r") {
            Some(i) => match b[i] {
                b'\n' => {
                    if let Some(close_end) = closes(i + 1)? {
                        // Every content line plus its newline: the source up to the closing fence.
                        out.push_str(&source[run..=i]);
                        next = Some(close_end + 1);
                    } else {
                        pos = i + 1;
                    }
                }
                b'\t' | b'\r' => return None,
                c => {
                    out.push_str(&source[run..i]);
                    out.push_str(match c {
                        b'&' => "&amp;",
                        b'<' => "&lt;",
                        b'>' => "&gt;",
                        _ => "&quot;",
                    });
                    run = i + 1;
                    pos = i + 1;
                }
            },
            None => {
                // Unclosed: every line to the end, each with a newline, where a
                // final empty line is dropped; that is the rest of the source,
                // plus a newline when it does not end in one.
                out.push_str(&source[run..]);
                if content_start < b.len() && !source.ends_with('\n') {
                    out.push('\n');
                }
                next = Some(b.len());
            }
        }
    }
    out.push_str("</code></pre>");
    next.map(|n| n.min(b.len()))
}
