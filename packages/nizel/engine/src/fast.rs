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
//! - emphasis and strong in their unambiguous shape (`emphasis_pair`), and
//!   intraword underscores
//! - tight lists of single-line items (`-`, `*`, `+`, or `1.`/`1)`), one
//!   space after the marker, content starting with a letter, ended by a blank
//!   line or the input's end that nothing could continue
//!
//! A block tier 1 cannot render is not the end of it: the full engine
//! renders the stretch up to the next point where it provably starts a new
//! top-level block (`segment_end`), with the same heading-ID map, and tier 1
//! goes on from there.
//!
//! Paragraphs are read in place from the source and classified one byte at a
//! time against a table, copying runs of plain bytes at once.

use crate::block::{self, Options};
use crate::inline::Ctx;
use crate::js::escape_html_into;
use crate::refs::References;

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
    // Document-wide: CR changes how lines split, and reference definitions
    // are extracted from the whole document before any block is parsed.
    // A document with either stays whole with the full engine. Whether it
    // has definitions is the full engine's own extraction (which skips
    // fenced code and HTML blocks); with none, it leaves every line as is.
    if crate::scan::find_byte(b, 0, b'\r').is_some() {
        return None;
    }
    // Whether the document defines references is decided lazily (see
    // `defines_references`): only a stretch handed to the full engine can
    // hold a definition's line, since tier 1's paragraphs and items start
    // with letters and its fences are code, which extraction skips too.
    let mut references_checked = false;
    let references = References::new();
    let ctx = Ctx { options, references: &references };
    let mut seen = crate::slug::Seen::default();
    // Heading text for IDs, reused across headings.
    let mut text = String::new();
    let mut first_block = true;
    let mut pos = 0;
    while pos < b.len() {
        let lead = b[pos];
        if lead == b'\n' {
            pos += 1;
            continue;
        }
        if lead == b' ' && is_blank_from(b, pos) {
            // Blank (JavaScript's trim would see only ASCII spaces here).
            pos = line_end(b, pos) + 1;
            continue;
        }
        let before_separator = out.len();
        if !first_block {
            out.push('\n');
        }
        let block_start = out.len();
        match block(source, pos, options, &ctx, &mut seen, &mut text, out) {
            Some(next) => pos = next,
            None => {
                // Tier 1 cannot render this block: the full engine renders the
                // stretch up to the next point where it starts afresh.
                out.truncate(block_start);
                let end = segment_end(source, pos, options.safe).min(b.len());
                if !references_checked && block::has_possible_reference_definition_start(&source[pos..end]) {
                    if defines_references(source) {
                        return None;
                    }
                    references_checked = true;
                }
                let blocks = block::parse_markdown_with_seen(&source[pos..end], options, &mut seen, false).ok()?;
                if blocks.is_empty() {
                    out.truncate(before_separator);
                    pos = end;
                    continue;
                }
                crate::render::render_blocks(&blocks, out);
                pos = end;
            }
        }
        first_block = false;
    }
    Some(())
}

/// Does the whole document define references, by the full engine's own
/// extraction (which skips fenced code and HTML blocks)? With none, it
/// leaves every line unchanged, so tier 1 and the stretches see what the
/// full engine sees. Tabs change how it reads indentation: a document with
/// tabs counts as defining them.
fn defines_references(source: &str) -> bool {
    let b = source.as_bytes();
    if !b.windows(2).any(|w| w == b"]:") {
        return false;
    }
    if crate::scan::find_byte(b, 0, b'\t').is_some() {
        return true;
    }
    !crate::refs::extract(&crate::scan::lines(source)).1.is_empty()
}

/// One block at `pos` (not blank) in tier 1; the position after it, or None
/// when it is outside the subset (`out` may hold a partial block then).
fn block(source: &str, pos: usize, options: &Options, ctx: &Ctx, seen: &mut crate::slug::Seen, text: &mut String, out: &mut String) -> Option<usize> {
    let b = source.as_bytes();
    let lead = b[pos];
    if lead.is_ascii_alphabetic() {
        return paragraph(source, pos, out);
    }
    let eol = line_end(b, pos);
    let line = &source[pos..eol];
    if lead != b'`' && line.bytes().any(|c| c == b'\t' || c == b'\r') {
        return None;
    }
    match lead {
        b'#' => heading(line, options, ctx, seen, text, out)?,
        b'`' => return fenced_code(source, pos, eol, out),
        b'-' | b'*' | b'_' if block::is_thematic_break(line) => out.push_str("<hr />"),
        b'-' | b'*' | b'+' | b'0'..=b'9' => return list(source, pos, out),
        _ => return None,
    }
    Some(eol + 1)
}

/// Where a stretch handed to the full engine can end: the first line, after
/// at least one line, that follows a blank line and starts at column 0 with
/// an ASCII letter, `#` or a fence. There the full engine starts a new
/// top-level block whatever came before: a blank line ends paragraphs,
/// quotes, tables and setext candidates, and a column-0 line that is not a
/// list marker ends any list item and indented code.
///
/// A fence at column 0 is always top-level (list item content is indented
/// at least two columns, quote lines start with `>`), so the scan steps over
/// it exactly, by the full engine's own fence rules. Constructs that can
/// span blank lines past a boundary send the rest of the document instead:
/// any other fence-like text (an indented fence keeps a list item open
/// across blank lines), custom blocks, and HTML blocks when HTML is allowed.
fn segment_end(source: &str, from: usize, safe: bool) -> usize {
    let b = source.as_bytes();
    let mut pos = from;
    let mut previous_blank = false;
    let mut first = true;
    while pos < b.len() {
        let eol = line_end(b, pos);
        let line = &b[pos..eol];
        if !first && previous_blank && line.first().is_some_and(|&c| c.is_ascii_alphabetic() || c == b'#' || c == b'`' || c == b'~') {
            return pos;
        }
        first = false;
        if matches!(line.first(), Some(b'`' | b'~')) {
            if let Some(after) = column_zero_fence_end(source, pos, eol) {
                pos = after;
                previous_blank = false;
                continue;
            }
        }
        let indent = line.iter().take_while(|&&c| c == b' ').count();
        let hazard = line.windows(3).any(|w| w == b"```" || w == b"~~~")
            || line[indent..].starts_with(b"::")
            || (!safe && indent <= 3 && line.get(indent) == Some(&b'<'));
        if hazard {
            return b.len();
        }
        previous_blank = line.iter().all(|&c| c == b' ');
        pos = eol + 1;
    }
    b.len()
}

/// A fenced code block opening at column 0 on `start..eol`, read by the full
/// engine's rules: the position after its closing fence (or the end of the
/// input when it never closes). None when the line does not open one.
fn column_zero_fence_end(source: &str, start: usize, eol: usize) -> Option<usize> {
    let b = source.as_bytes();
    let fence = block::opening_fence(&source[start..eol])?;
    block::parse_fence_info(fence.info, fence.marker)?;
    let mut pos = eol + 1;
    while pos < b.len() {
        let end = line_end(b, pos);
        if block::closes_fence(&source[pos..end], fence.marker, fence.length) {
            return Some(end + 1);
        }
        pos = end + 1;
    }
    Some(b.len())
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
            STAR => {
                let limit = match text_limit {
                    Some(limit) => limit,
                    None => {
                        let limit = trim_spaces_end(b, i, paragraph_end(b, i)?);
                        text_limit = Some(limit);
                        limit
                    }
                };
                let pair = emphasis_pair(b, start, i, limit)?;
                out.push_str(&source[run..i]);
                emphasis(source, &pair, out, None);
                i = pair.end;
                run = pair.end;
            }
            UNDERSCORE => i = literal_underscores(b, start, i)?,
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

/// A list item marker at `at`: (ordered, marker byte, start number, content
/// position). Exactly one space after it, and content starting with a letter.
fn item_marker(b: &[u8], at: usize) -> Option<(bool, u8, u64, usize)> {
    let lead = *b.get(at)?;
    let (ordered, marker, start, after) = if matches!(lead, b'-' | b'*' | b'+') {
        (false, lead, 0, at + 1)
    } else {
        let digits = b[at..].iter().take(10).take_while(|c| c.is_ascii_digit()).count();
        if !(1..=9).contains(&digits) {
            return None;
        }
        let delimiter = *b.get(at + digits)?;
        if delimiter != b'.' && delimiter != b')' {
            return None;
        }
        let start = std::str::from_utf8(&b[at..at + digits]).ok()?.parse().ok()?;
        (true, delimiter, start, at + digits + 1)
    };
    (b.get(after) == Some(&b' ') && b.get(after + 1).is_some_and(u8::is_ascii_alphabetic)).then_some((ordered, marker, start, after + 1))
}

/// A tight list of single-line items starting at `start`; the position after
/// it. Each item is one paragraph, rendered without `<p>` in a tight list.
fn list(source: &str, start: usize, out: &mut String) -> Option<usize> {
    let b = source.as_bytes();
    let (ordered, marker, first_number, _) = item_marker(b, start)?;
    let tag = if ordered { "ol" } else { "ul" };
    out.push('<');
    out.push_str(tag);
    if ordered && first_number != 1 {
        out.push_str(" start=\"");
        out.push_str(&first_number.to_string());
        out.push('"');
    }
    out.push_str(">\n");
    let mut pos = start;
    let mut first_item = true;
    loop {
        let (item_ordered, item_marker_byte, _, content) = item_marker(b, pos)?;
        if item_ordered != ordered || item_marker_byte != marker {
            return None;
        }
        let eol = line_end(b, pos);
        // The marker regex's `(.*)$` fails on a JavaScript line terminator
        // (U+2028/U+2029), which makes the line a paragraph instead.
        if crate::js::has_line_terminator(&source[content..eol]) {
            return None;
        }
        if !first_item {
            out.push('\n');
        }
        first_item = false;
        out.push_str("<li>");
        inline(&source[content..trim_spaces_end(b, content, eol)], out, None)?;
        out.push_str("</li>");
        if eol >= b.len() {
            pos = b.len();
            break;
        }
        let next = eol + 1;
        if is_blank_from(b, next) {
            let mut after = next;
            while after < b.len() && is_blank_from(b, after) {
                after = line_end(b, after) + 1;
            }
            // Only a line that provably cannot continue it may follow: an ASCII
            // letter, `#` or a backtick at column 0. (Spaces and tabs indent a
            // continuation, markers continue the list loosely, and a line that
            // only looks non-blank here, such as NBSP alone, is blank to
            // JavaScript's trim.)
            if after < b.len() && !(b[after].is_ascii_alphabetic() || matches!(b[after], b'#' | b'`')) {
                return None;
            }
            pos = next;
            break;
        }
        // The next line must be the next item; anything else could be a lazy
        // continuation or interrupt the list.
        pos = next;
    }
    out.push_str("\n</");
    out.push_str(tag);
    out.push('>');
    Some(pos)
}

const PLAIN: u8 = 0;
const GREATER: u8 = 1;
const QUOTE: u8 = 2;
const BACKTICK: u8 = 3;
const COLON: u8 = 4;
const OUTSIDE: u8 = 5;
const NEWLINE: u8 = 6;
const STAR: u8 = 7;
const UNDERSCORE: u8 = 8;

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
    table[b'*' as usize] = STAR;
    table[b'_' as usize] = UNDERSCORE;
    let outside = b"\\<&[~|@\t\r";
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
            STAR => {
                let pair = emphasis_pair(b, 0, i, b.len())?;
                out.push_str(&source[run..i]);
                if let Some(text) = text.as_deref_mut() {
                    text.push_str(&source[run..i]);
                }
                emphasis(source, &pair, out, text.as_deref_mut());
                i = pair.end;
                run = pair.end;
            }
            UNDERSCORE => i = literal_underscores(b, 0, i)?,
            _ => return None,
        }
    }
    out.push_str(&source[run..]);
    if let Some(text) = text {
        text.push_str(&source[run..]);
    }
    Some(())
}

/// An emphasis or strong pair in the subset: the run at `opener` and its
/// closer, with the content between them.
struct EmphasisPair {
    strong: bool,
    content_start: usize,
    content_end: usize,
    end: usize,
}

/// A `*` pair whose result is provably the emphasis algorithm's: a run of one
/// or two `*` after a space, a newline or the start (`floor`), followed by an
/// ASCII letter or digit, so it can only open; plain text up to a run of the
/// same length after an ASCII letter or digit, followed by a space, a
/// newline, the end (`limit`) or `.,;:!?)`, so it can only close. With every
/// `*` in such disjoint pairs, each closer pairs with its own opener. Content
/// may hold soft breaks but no other delimiter, code or syntax.
fn emphasis_pair(b: &[u8], floor: usize, opener: usize, limit: usize) -> Option<EmphasisPair> {
    let length = b[opener..limit].iter().take_while(|&&c| c == b'*').count();
    if length > 2 || (opener > floor && !matches!(b[opener - 1], b' ' | b'\n')) {
        return None;
    }
    let content_start = opener + length;
    if !b.get(content_start).is_some_and(u8::is_ascii_alphanumeric) || content_start >= limit {
        return None;
    }
    let mut j = content_start;
    while j < limit {
        match b[j] {
            b'*' => {
                let run = b[j..limit].iter().take_while(|&&c| c == b'*').count();
                let after = j + run;
                let closes = run == length
                    && b[j - 1].is_ascii_alphanumeric()
                    && (after == limit || matches!(b[after], b' ' | b'\n' | b'.' | b',' | b';' | b':' | b'!' | b'?' | b')'));
                return closes.then_some(EmphasisPair { strong: length == 2, content_start, content_end: j, end: after });
            }
            b':' if b[j + 1..limit].starts_with(b"//") => return None,
            c if CLASS[c as usize] != PLAIN && !matches!(c, b'\n' | b'>' | b'"' | b':') => return None,
            _ => j += 1,
        }
    }
    None
}

fn emphasis(source: &str, pair: &EmphasisPair, out: &mut String, text: Option<&mut String>) {
    let content = &source[pair.content_start..pair.content_end];
    let tag = if pair.strong { "strong" } else { "em" };
    out.push('<');
    out.push_str(tag);
    out.push('>');
    escape_html_into(out, content);
    out.push_str("</");
    out.push_str(tag);
    out.push('>');
    if let Some(text) = text {
        text.push_str(content);
    }
}

/// An `_` run between two ASCII letters or digits (`snake_case`) can neither
/// open nor close emphasis, so it stays text; any other `_` leaves the subset.
/// The position after the run.
fn literal_underscores(b: &[u8], floor: usize, at: usize) -> Option<usize> {
    let end = at + b[at..].iter().take_while(|&&c| c == b'_').count();
    (at > floor && b[at - 1].is_ascii_alphanumeric() && b.get(end).is_some_and(u8::is_ascii_alphanumeric)).then_some(end)
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
fn heading(line: &str, options: &Options, ctx: &Ctx, seen: &mut crate::slug::Seen, text: &mut String, out: &mut String) -> Option<()> {
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
            // The body goes straight into the output; the ID, which comes
            // first, is inserted once the text is known.
            out.push('>');
            let body_start = out.len();
            text.clear();
            if inline(content, out, Some(text)).is_some() {
                if !text.is_empty() {
                    let id = crate::slug::unique_slug(crate::slug::slugify(text, options.slug_classic), seen);
                    let mut attribute = String::with_capacity(id.len() + 6);
                    attribute.push_str(" id=\"");
                    escape_html_into(&mut attribute, &id);
                    attribute.push('"');
                    out.insert_str(body_start - 1, &attribute);
                }
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
