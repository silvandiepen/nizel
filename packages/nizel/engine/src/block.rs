//! `parseMarkdown` / `parseBlocks` from `parse.ts`.
//!
//! Every branch the JavaScript loop takes is checked in the same order.
//! Branches whose constructs are not ported yet return `UNSUPPORTED` at
//! exactly the point the JavaScript would enter them, so a document either
//! comes out byte-identical or is declined — never different.

use crate::ast::{strip_inline, Block, ListItem};
use crate::common::decode_string_content;
use crate::jsnum;
use crate::html::{is_interrupting_html_block_start, read_html_block};
use crate::inline::{parse_inline, parse_inline_owned, Ctx};
use crate::refs::{self, References};
use crate::js;
use crate::slug::{slugify, unique_slug};
use crate::status::UNSUPPORTED;
use std::collections::HashMap;

pub struct Options {
    pub anchors: bool,
    pub autolinks: bool,
    pub safe: bool,
    pub slug_classic: bool,
}

type Result<T> = std::result::Result<T, i32>;

thread_local! {
    /// Whether the document holds a `|` / a tab at all: every line (and every
    /// container line derived from them) is a slice of it, so when it does not,
    /// the per-line searches for them can be skipped.
    static DOC_HAS_PIPE: std::cell::Cell<bool> = const { std::cell::Cell::new(true) };
    static DOC_HAS_TAB: std::cell::Cell<bool> = const { std::cell::Cell::new(true) };
}

fn doc_has_pipe() -> bool {
    DOC_HAS_PIPE.with(std::cell::Cell::get)
}

fn doc_has_tab() -> bool {
    DOC_HAS_TAB.with(std::cell::Cell::get)
}

static SOURCE_MARKERS: [bool; 256] = {
    let mut table = [false; 256];
    table[b'\r' as usize] = true;
    table[b'\t' as usize] = true;
    table[b'|' as usize] = true;
    table[b']' as usize] = true;
    table
};

/// One pass over the source: CR, tab, `|`, and a `]:` pair.
fn scan_source(markdown: &str) -> (bool, bool, bool, bool) {
    let (mut cr, mut tab, mut pipe, mut reference) = (false, false, false, false);
    let b = markdown.as_bytes();
    let mut at = 0;
    while let Some(i) = crate::scan::find_in_table(b, at, &SOURCE_MARKERS, b"\r\t|]") {
        match b[i] {
            b'\r' => cr = true,
            b'\t' => tab = true,
            b'|' => pipe = true,
            _ => reference |= b.get(i + 1) == Some(&b':'),
        }
        if cr && tab && pipe && reference {
            break;
        }
        at = i + 1;
    }
    (cr, tab, pipe, reference)
}

pub fn parse_markdown(markdown: &str, options: &Options) -> Result<Vec<Block>> {
    let (has_cr, has_tab, has_pipe, has_reference) = scan_source(markdown);
    DOC_HAS_PIPE.with(|flag| flag.set(has_pipe));
    DOC_HAS_TAB.with(|flag| flag.set(has_tab));
    let normalized: std::borrow::Cow<str> = if has_cr { normalize_line_endings(markdown).into() } else { markdown.into() };
    // Lines borrow the source unless tabs had to be expanded.
    let expanded: Vec<String>;
    let base: Vec<&str> = if has_tab {
        expanded = normalized.split('\n').map(expand_leading_tabs_in_line).collect();
        as_strs(&expanded)
    } else {
        crate::scan::lines(&normalized)
    };
    let (content, references) = if has_reference && has_possible_reference_definition_start(&normalized) {
        let (content, references) = refs::extract(&base);
        (Some(content), references)
    } else {
        (None, References::new())
    };
    let content_lines: Vec<&str>;
    let lines: &[&str] = match &content {
        Some(content) => {
            content_lines = as_strs(content);
            &content_lines
        }
        None => &base,
    };
    let ctx = Ctx { options, references: &references };
    let mut seen = HashMap::new();
    parse_blocks(lines, &ctx, &mut seen)
}

/// `markdown.replace(/\r\n?/g, '\n')`
fn normalize_line_endings(markdown: &str) -> String {
    let mut out = String::with_capacity(markdown.len());
    let mut chars = markdown.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\r' {
            if chars.peek() == Some(&'\n') {
                chars.next();
            }
            out.push('\n');
        } else {
            out.push(c);
        }
    }
    out
}

/// `expandLeadingTabsInLine` from `parse/lines.ts`.
fn expand_leading_tabs_in_line(line: &str) -> String {
    let mut result = String::with_capacity(line.len() + 8);
    let mut column = 0usize;
    let mut rest = line;
    while let Some(c) = rest.chars().next() {
        rest = &rest[c.len_utf8()..];
        if c == '\t' {
            let spaces = 4 - (column % 4);
            result.extend(std::iter::repeat_n(' ', spaces));
            column += spaces;
            continue;
        }
        result.push(c);
        column += c.len_utf16();
        if c != ' ' {
            break;
        }
    }
    result.push_str(rest);
    result
}

/// `/(^|\n)(?: {0,3}> ?| {0,3})\[/`
fn has_possible_reference_definition_start(markdown: &str) -> bool {
    markdown.split('\n').any(|line| {
        let after = &line[js::up_to_three_spaces(line)..];
        if after.starts_with('[') {
            return true;
        }
        if let Some(quoted) = after.strip_prefix('>') {
            let quoted = quoted.strip_prefix(' ').unwrap_or(quoted);
            return quoted.starts_with('[');
        }
        false
    })
}

fn as_strs(lines: &[String]) -> Vec<&str> {
    lines.iter().map(String::as_str).collect()
}

fn parse_blocks(lines: &[&str], ctx: &Ctx, seen: &mut HashMap<String, usize>) -> Result<Vec<Block>> {
    let options = ctx.options;
    let mut children = Vec::new();
    let mut index = 0;
    while index < lines.len() {
        let line = lines[index];
        let trimmed = js::trim(line);
        if trimmed.is_empty() {
            index += 1;
            continue;
        }
        // After up to three spaces, an ASCII letter cannot start HTML, a
        // custom block, a fence, indented code, a break, a heading, a quote or
        // a list; only setext underlines and tables (decided by other lines)
        // and paragraphs remain.
        let letter_start = line.as_bytes().get(js::up_to_three_spaces(line)).is_some_and(u8::is_ascii_alphabetic);

        if !options.safe && !letter_start {
            if let Some((value, end)) = read_html_block(lines, index) {
                children.push(Block::Html { value });
                index = end + 1;
                continue;
            }
        }
        if let Some((name, args)) = custom_block_name(trimmed).filter(|_| !letter_start) {
            let (content, end, props) = read_custom_block(lines, index);
            let content_lines: Vec<String> = content.split('\n').map(str::to_string).collect();
            let children_blocks = parse_blocks(&as_strs(&content_lines), ctx, seen)?;
            children.push(Block::CustomBlock { name: name.to_string(), args: split_words(args), props, content, children: children_blocks });
            index = end + 1;
            continue;
        }

        if let Some(fence) = opening_fence(line).filter(|_| !letter_start) {
            if let Some(info) = parse_fence_info(fence.info, fence.marker) {
                // `code.join('\n') + '\n'` built in one buffer; a trailing empty
                // line at the end of the input is dropped, as the JavaScript pops it.
                let mut code = String::new();
                let mut code_lines = 0usize;
                let mut last_line_start = 0usize;
                index += 1;
                while index < lines.len() && !closes_fence(lines[index], fence.marker, fence.length) {
                    last_line_start = code.len();
                    code.push_str(strip_fence_indent(lines[index], fence.indent));
                    code.push('\n');
                    code_lines += 1;
                    index += 1;
                }
                if index >= lines.len() && code_lines > 0 && code.len() == last_line_start + 1 {
                    code.truncate(last_line_start);
                }
                let (filename, highlight_lines) = parse_code_meta(&info.meta);
                children.push(Block::Code {
                    code,
                    fenced: true,
                    meta: (!info.meta.is_empty()).then(|| info.meta.clone()),
                    lang: info.lang,
                    filename,
                    highlight_lines,
                });
                index += 1;
                continue;
            }
        }

        if !letter_start && line.starts_with("    ") {
            let mut code: Vec<&str> = Vec::new();
            while index < lines.len() && (lines[index].starts_with("    ") || js::trim(&lines[index]).is_empty()) {
                let l = lines[index];
                code.push(&l[l.bytes().take(4).take_while(|&b| b == b' ').count()..]);
                index += 1;
            }
            while code.last().is_some_and(|l| js::trim(l).is_empty()) {
                code.pop();
            }
            children.push(Block::Code {
                code: if code.is_empty() { String::new() } else { format!("{}\n", code.join("\n")) },
                fenced: false,
                lang: None,
                meta: None,
                filename: None,
                highlight_lines: None,
            });
            continue;
        }

        if !letter_start && is_thematic_break(line) {
            children.push(Block::ThematicBreak);
            index += 1;
            continue;
        }

        if let Some((depth, source)) = atx_heading(line).filter(|_| !letter_start) {
            let source = trim_closing_heading_hashes(source);
            children.push(heading(depth, &source, ctx, seen)?);
            index += 1;
            continue;
        }

        let next = lines.get(index + 1).copied().filter(|next| !next.is_empty());
        if let Some(depth) = next.and_then(setext_underline) {
            if !is_block_start(line, options, lines, index) {
                children.push(heading(depth, trimmed, ctx, seen)?);
                index += 2;
                continue;
            }
        }

        if is_table_start(lines, index) {
            // Cells go through `parseInline`: the document's references are not visible there.
            let empty = References::new();
            let cell_ctx = Ctx { options, references: &empty };
            let align = split_table_row(&lines[index + 1]).into_iter().map(cell_alignment).collect();
            let mut rows = vec![table_cells(&lines[index], &cell_ctx)?];
            index += 2;
            while index < lines.len() && lines[index].contains('|') && !js::trim(&lines[index]).is_empty() {
                rows.push(table_cells(&lines[index], &cell_ctx)?);
                index += 1;
            }
            children.push(Block::Table { align, rows });
            continue;
        }

        if !letter_start && blockquote_start(line) {
            let start = index;
            let mut quote_lines: Vec<String> = Vec::new();
            let mut allow_lazy = false;
            while index < lines.len() {
                if let Some((marker_len, marker_ends_space, rest)) = quote_marker(&lines[index]) {
                    let column = if marker_ends_space { marker_len } else { marker_len + 1 };
                    let quote_line = expand_leading_tabs_from_column(rest, column);
                    quote_lines.push(quote_line);
                    // Only the last quoted line matters to the table check there (it looks one line ahead).
                    let last = quote_lines[quote_lines.len() - 1].as_str();
                    allow_lazy = can_start_lazy_continuation(last, options, &[last], 0);
                    index += 1;
                    continue;
                }
                if allow_lazy && can_continue_lazily(&lines[index], options, lines, index) {
                    let l = &lines[index];
                    quote_lines.push(if setext_underline(l).is_some() { format!("\\{l}") } else { l.to_string() });
                    allow_lazy = true;
                    index += 1;
                    continue;
                }
                break;
            }
            if quote_lines.last().is_some_and(String::is_empty) {
                quote_lines.pop();
            }
            // `if (index > 0) index -= 1; else index += 1;` then the loop's `+= 1`.
            if index > 0 {
                if index == start {
                    // Nothing was consumed: the JavaScript revisits this line forever (NIZEL-002).
                    return Err(UNSUPPORTED);
                }
            } else {
                index += 2;
            }
            children.push(Block::Blockquote { children: parse_blocks(&as_strs(&quote_lines), ctx, seen)? });
            continue;
        }

        if let Some(opening) = parse_list_marker(line).filter(|_| !letter_start) {
            let mut items: Vec<ListItem> = Vec::new();
            let mut tight = true;
            while index < lines.len() {
                if !items.is_empty() && is_thematic_break(&lines[index]) {
                    break;
                }
                let Some(marker) = parse_list_marker(&lines[index]) else { break };
                if marker.ordered != opening.ordered || marker.marker != opening.marker {
                    break;
                }
                let (checked, clean_body) = task_box(&marker.body);
                let (item_children, end, loose) = parse_list_item_blocks(clean_body, lines, index, &opening, marker.content_indent, ctx, seen)?;
                if loose {
                    tight = false;
                }
                items.push(ListItem { checked, children: item_children });
                index = end + 1;
            }
            children.push(Block::List { ordered: opening.ordered, start: opening.start, tight, items });
            continue;
        }

        // `normalizeParagraphSource(lines.map(normalizeParagraphLine))` in one buffer.
        let mut source = String::with_capacity(line.len() + 1);
        source.push_str(normalize_paragraph_line(line));
        while index + 1 < lines.len() && can_continue_paragraph(lines[index + 1], lines, index + 1, options)? {
            index += 1;
            source.push('\n');
            source.push_str(normalize_paragraph_line(lines[index]));
        }
        let kept = source.trim_end_matches([' ', '\t']).len();
        source.truncate(kept);
        let next = lines.get(index + 1).copied().filter(|next| !next.is_empty());
        if let Some(depth) = next.and_then(setext_underline) {
            children.push(heading(depth, &source, ctx, seen)?);
            index += 2;
            continue;
        }
        children.push(Block::Paragraph { children: parse_inline_owned(source, ctx)? });
        index += 1;
    }
    Ok(children)
}

fn heading(depth: u8, source: &str, ctx: &Ctx, seen: &mut HashMap<String, usize>) -> Result<Block> {
    let options = ctx.options;
    let children = parse_inline(source, ctx)?;
    let text = strip_inline(&children);
    let id = (options.anchors && !text.is_empty()).then(|| unique_slug(slugify(&text, options.slug_classic), seen));
    Ok(Block::Heading { depth, id, children })
}

/// `canContinueParagraph`.
fn can_continue_paragraph(line: &str, lines: &[&str], index: usize, options: &Options) -> Result<bool> {
    if js::trim(line).is_empty() {
        return Ok(false);
    }
    if !has_paragraph_interrupt_candidate(line, options) {
        return Ok(true);
    }
    Ok(setext_underline(line).is_none()
        && !is_thematic_break(line)
        && !atx_at_line_start(line)
        && !fence_start(line)
        && !custom_block_start(js::trim(line))
        && !is_paragraph_interrupting_list_marker(line)
        && !blockquote_start(line)
        && !(!options.safe && is_interrupting_html_block_start(line))
        && !is_table_start(lines, index))
}

/// `hasParagraphInterruptCandidate`.
fn has_paragraph_interrupt_candidate(line: &str, options: &Options) -> bool {
    if doc_has_pipe() && line.contains('|') {
        return true;
    }
    let first = js::trim_start(line).chars().next();
    if !options.safe && first == Some('<') {
        return true;
    }
    first.is_some_and(|c| "#`~:->*+=0123456789".contains(c))
}

/// `isBlockStart`.
fn is_block_start(line: &str, options: &Options, lines: &[&str], index: usize) -> bool {
    atx_start(line)
        || fence_start(line)
        || is_thematic_break(line)
        || blockquote_start(line)
        || parse_list_marker(line).is_some()
        || is_table_start(lines, index)
        || (!options.safe && is_raw_html_block_line(line))
}

/// `/^ {0,3}(#{1,6})(?:\s|$)/`
fn atx_start(line: &str) -> bool {
    let rest = &line[js::up_to_three_spaces(line)..];
    let hashes = js::run_of(rest, b'#');
    if hashes == 0 {
        return false;
    }
    // #{1,6} may backtrack: any count from 1..=min(6, run) followed by \s or end.
    (1..=hashes.min(6)).any(|count| {
        let after = &rest[count..];
        after.is_empty() || after.chars().next().is_some_and(js::is_space)
    })
}

/// `/^(#{1,6})\s+/` (no leading spaces).
fn atx_at_line_start(line: &str) -> bool {
    let hashes = js::run_of(line, b'#');
    (1..=hashes.min(6)).any(|count| line[count..].chars().next().is_some_and(js::is_space))
}

/// `/^ {0,3}(#{1,6})(?:\s+(.*?))?\s*$/` → (depth, group 2 or "").
fn atx_heading(line: &str) -> Option<(u8, &str)> {
    let rest = &line[js::up_to_three_spaces(line)..];
    let hashes = js::run_of(rest, b'#');
    if hashes == 0 || hashes > 6 {
        // With more than six, every shorter count is followed by `#`, which is neither \s nor end.
        return None;
    }
    let after = &rest[hashes..];
    if after.is_empty() {
        return Some((hashes as u8, ""));
    }
    if !after.chars().next().is_some_and(js::is_space) {
        return None;
    }
    let content = js::trim(after);
    if !content.chars().all(js::is_dot) {
        return None;
    }
    Some((hashes as u8, content))
}

/// `trimClosingHeadingHashes`.
fn trim_closing_heading_hashes(source: &str) -> String {
    let without_trailing = js::trim_end(source);
    if !source.is_empty() && without_trailing.bytes().all(|b| b == b'#') && !without_trailing.is_empty() {
        return String::new();
    }
    // `.replace(/\s+#+\s*$/, '')`
    let hashes = without_trailing.bytes().rev().take_while(|&b| b == b'#').count();
    let mut result = source;
    if hashes > 0 {
        let before_hashes = &without_trailing[..without_trailing.len() - hashes];
        let spaces_start = js::trim_end(before_hashes).len();
        if spaces_start < before_hashes.len() {
            result = &source[..spaces_start];
        }
    }
    js::trim(result).to_string()
}

/// `isThematicBreak`: `/^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/`
pub fn is_thematic_break(line: &str) -> bool {
    let rest = &line[js::up_to_three_spaces(line)..];
    let Some(marker) = rest.bytes().next().filter(|b| matches!(b, b'-' | b'*' | b'_')) else {
        return false;
    };
    let mut count = 0;
    for byte in rest.bytes() {
        if byte == marker {
            count += 1;
        } else if byte != b' ' && byte != b'\t' {
            return false;
        }
    }
    count >= 3
}

/// `isSetextUnderline`: `/^ {0,3}(=+|-+)\s*$/` → 1 for `=`, 2 for `-`.
fn setext_underline(line: &str) -> Option<u8> {
    let rest = &line[js::up_to_three_spaces(line)..];
    let marker = rest.bytes().next().filter(|b| *b == b'=' || *b == b'-')?;
    let run = js::run_of(rest, marker);
    js::trim_end(&rest[run..]).is_empty().then_some(if marker == b'=' { 1 } else { 2 })
}

/// `/^ {0,3}(`{3,}|~{3,})/`
fn fence_start(line: &str) -> bool {
    let rest = &line[js::up_to_three_spaces(line)..];
    js::run_of(rest, b'`') >= 3 || js::run_of(rest, b'~') >= 3
}

/// `/^ {0,3}> ?/`
fn blockquote_start(line: &str) -> bool {
    line[js::up_to_three_spaces(line)..].starts_with('>')
}

/// `/^::[A-Za-z][\w-]*/` on the trimmed line.
fn custom_block_start(trimmed: &str) -> bool {
    trimmed.strip_prefix("::").is_some_and(|rest| rest.bytes().next().is_some_and(|b| b.is_ascii_alphabetic()))
}

/// `isRawHtmlBlockLine`: `/^<\/?[A-Za-z][A-Za-z0-9-]*(?=[\s>/])[\s\S]*>$/` on the trimmed line.
fn is_raw_html_block_line(line: &str) -> bool {
    let trimmed = js::trim(line);
    let Some(rest) = trimmed.strip_prefix('<') else { return false };
    let rest = rest.strip_prefix('/').unwrap_or(rest);
    if !rest.bytes().next().is_some_and(|b| b.is_ascii_alphabetic()) {
        return false;
    }
    let name = rest.bytes().take_while(|b| b.is_ascii_alphanumeric() || *b == b'-').count();
    let after = &rest[name..];
    after.chars().next().is_some_and(|c| js::is_space(c) || c == '>' || c == '/') && trimmed.ends_with('>')
}

/// `isTableStart`.
fn is_table_start(lines: &[&str], index: usize) -> bool {
    doc_has_pipe()
        && lines[index].contains('|') && lines.get(index + 1).is_some_and(|next| !next.is_empty() && is_table_delimiter_row(next))
}

/// `/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/`
fn is_table_delimiter_row(line: &str) -> bool {
    let mut rest = js::trim_start(line);
    rest = rest.strip_prefix('|').unwrap_or(rest);
    let cells: Vec<&str> = rest.split('|').collect();
    // Trailing `|?\s*$`: a final empty (whitespace-only) segment is the optional closing pipe.
    let mut cells = cells.as_slice();
    if cells.len() > 1 && js::trim(cells[cells.len() - 1]).is_empty() {
        cells = &cells[..cells.len() - 1];
    }
    cells.len() >= 2
        && cells.iter().all(|cell| {
            let cell = js::trim(cell);
            let cell = cell.strip_prefix(':').unwrap_or(cell);
            let cell = cell.strip_suffix(':').unwrap_or(cell);
            cell.len() >= 3 && cell.bytes().all(|b| b == b'-')
        })
}

/// `parseListMarker` from `parse/list.ts`.
pub struct ListMarker<'a> {
    /// Borrowed from the line unless the padding rule or tab expansion changed it.
    pub body: std::borrow::Cow<'a, str>,
    pub content_indent: usize,
    pub marker: u8,
    pub ordered: bool,
    pub start: Option<u64>,
}

pub fn parse_list_marker(line: &str) -> Option<ListMarker<'_>> {
    if doc_has_tab() && line.contains('\t') {
        let expanded = expand_list_marker_tabs(line);
        return parse_expanded_list_marker(&expanded).map(|marker| ListMarker { body: std::borrow::Cow::Owned(marker.body.into_owned()), ..marker });
    }
    parse_expanded_list_marker(line)
}

/// `parseListMarker` on a line whose marker tabs are already expanded.
fn parse_expanded_list_marker(line: &str) -> Option<ListMarker<'_>> {
    let indent = js::up_to_three_spaces(line);
    let rest = &line[indent..];
    let first = *rest.as_bytes().first()?;
    if matches!(first, b'-' | b'*' | b'+') {
        let after = &rest[1..];
        let padding = after.bytes().take_while(|b| *b == b' ' || *b == b'\t').count();
        let body = &after[padding..];
        // `(.*)$` without the `m` flag: a line terminator in the body fails the whole match.
        if (padding > 0 || body.is_empty()) && !js::has_line_terminator(body) {
            return Some(ListMarker {
                body: list_marker_body(&after[..padding], body),
                content_indent: list_content_indent(indent, 1, padding),
                marker: first,
                ordered: false,
                start: None,
            });
        }
    }
    let digits = rest.bytes().take_while(u8::is_ascii_digit).count();
    if (1..=9).contains(&digits) {
        let delimiter = rest.as_bytes().get(digits).copied();
        if let Some(delimiter @ (b'.' | b')')) = delimiter {
            let after = &rest[digits + 1..];
            let padding = after.bytes().take_while(|b| *b == b' ' || *b == b'\t').count();
            let body = &after[padding..];
            if (padding > 0 || body.is_empty()) && !js::has_line_terminator(body) {
                return Some(ListMarker {
                    body: list_marker_body(&after[..padding], body),
                    content_indent: list_content_indent(indent, digits + 1, padding),
                    marker: delimiter,
                    ordered: true,
                    start: rest[..digits].parse().ok(),
                });
            }
        }
    }
    None
}

/// `listMarkerBody`: padding beyond four columns stays in the body.
fn list_marker_body<'a>(padding: &'a str, body: &'a str) -> std::borrow::Cow<'a, str> {
    if padding.len() > 4 { std::borrow::Cow::Owned(format!("{}{body}", &padding[1..])) } else { std::borrow::Cow::Borrowed(body) }
}

/// `listContentIndent`.
fn list_content_indent(indent: usize, marker_length: usize, padding: usize) -> usize {
    indent + marker_length + if padding > 0 && padding <= 4 { padding } else { 1 }
}

/// `isParagraphInterruptingListMarker`.
fn is_paragraph_interrupting_list_marker(line: &str) -> bool {
    parse_list_marker(line).is_some_and(|marker| !marker.body.is_empty() && (!marker.ordered || marker.start == Some(1)))
}

/// `expandListMarkerTabs` from `parse/list.ts`.
fn expand_list_marker_tabs(line: &str) -> String {
    let mut result = String::with_capacity(line.len() + 8);
    let mut in_marker_padding = false;
    for c in line.chars() {
        if c == '\t' && (in_marker_padding || is_bare_list_marker(&result)) {
            let column = result.encode_utf16().count();
            result.extend(std::iter::repeat_n(' ', 4 - (column % 4)));
            in_marker_padding = true;
            continue;
        }
        result.push(c);
        if is_bare_list_marker(&result) {
            in_marker_padding = true;
        } else if in_marker_padding && c != ' ' {
            in_marker_padding = false;
        }
    }
    result
}

/// `/^ {0,3}(?:[-*+]|\d{1,9}[.)])$/`
fn is_bare_list_marker(text: &str) -> bool {
    let rest = &text[js::up_to_three_spaces(text)..];
    if matches!(rest, "-" | "*" | "+") {
        return true;
    }
    let digits = rest.bytes().take_while(u8::is_ascii_digit).count();
    (1..=9).contains(&digits) && rest.len() == digits + 1 && matches!(rest.as_bytes()[digits], b'.' | b')')
}

/// `normalizeParagraphLine`: `line.replace(/^ {0,3}/, '').trimStart()`.
fn normalize_paragraph_line(line: &str) -> &str {
    js::trim_start(&line[js::up_to_three_spaces(line)..])
}


/// `/^::([A-Za-z][\w-]*)(?:\s+(.*))?$/` on the trimmed line → (name, args source).
fn custom_block_name(trimmed: &str) -> Option<(&str, &str)> {
    let rest = trimmed.strip_prefix("::")?;
    if !rest.bytes().next().is_some_and(|b| b.is_ascii_alphabetic()) {
        return None;
    }
    let name = rest.bytes().take_while(|b| b.is_ascii_alphanumeric() || *b == b'_' || *b == b'-').count();
    let after = &rest[name..];
    let matches = after.is_empty()
        || (after.chars().next().is_some_and(js::is_space) && js::trim_start(after).chars().all(js::is_dot));
    matches.then(|| (&rest[..name], js::trim_start(after)))
}

/// `splitWords`.
fn split_words(source: &str) -> Vec<String> {
    let trimmed = js::trim(source);
    if trimmed.is_empty() {
        return Vec::new();
    }
    trimmed.split(js::is_space).filter(|w| !w.is_empty()).map(str::to_string).collect()
}

/// `parseProps`: `/^([A-Za-z0-9_-]+):\s*(.*)$/` per trimmed line; later keys overwrite.
fn parse_props(lines: &[&str]) -> Vec<(String, crate::ast::Prop)> {
    let mut props: Vec<(String, crate::ast::Prop)> = Vec::new();
    for line in lines {
        let trimmed = js::trim(line);
        let key = trimmed.bytes().take_while(|b| b.is_ascii_alphanumeric() || *b == b'_' || *b == b'-').count();
        if key == 0 || !trimmed[key..].starts_with(':') {
            continue;
        }
        let value = js::trim_start(&trimmed[key + 1..]);
        if !value.chars().all(js::is_dot) {
            continue;
        }
        let prop = parse_primitive(value);
        match props.iter_mut().find(|(name, _)| name == &trimmed[..key]) {
            Some(existing) => existing.1 = prop,
            None => props.push((trimmed[..key].to_string(), prop)),
        }
    }
    props
}

/// `parsePrimitive`.
fn parse_primitive(value: &str) -> crate::ast::Prop {
    use crate::ast::Prop;
    let trimmed = js::trim(value);
    match trimmed {
        "true" => return Prop::Bool(true),
        "false" => return Prop::Bool(false),
        "null" => return Prop::Null,
        _ => {}
    }
    let digits = trimmed.strip_prefix('-').unwrap_or(trimmed);
    let int = digits.bytes().take_while(u8::is_ascii_digit).count();
    let numeric = int > 0
        && (int == digits.len()
            || (digits.as_bytes()[int] == b'.' && digits.len() > int + 1 && digits[int + 1..].bytes().all(|b| b.is_ascii_digit())));
    if numeric {
        return Prop::Number(jsnum::number(trimmed));
    }
    // `.replace(/^["']|["']$/g, '')`
    let start = usize::from(trimmed.starts_with(['"', '\'']));
    let end = if trimmed.len() > start && trimmed.ends_with(['"', '\'']) { trimmed.len() - 1 } else { trimmed.len() };
    Prop::Text(trimmed[start..end].to_string())
}

/// `readCustomBlock` → (content, end index, props).
fn read_custom_block(lines: &[&str], start: usize) -> (String, usize, Vec<(String, crate::ast::Prop)>) {
    let find = |from: usize| (from..lines.len()).find(|&i| js::trim(&lines[i]) == "::");
    let Some(first) = find(start + 1) else {
        return (lines[start + 1..].join("\n"), lines.len() - 1, Vec::new());
    };
    let before = &lines[start + 1..first];
    if !before.is_empty() && before.iter().all(|line| is_prop_or_blank(line)) {
        let closing = find(first + 1);
        let content = lines[first + 1..closing.unwrap_or(lines.len())].join("\n");
        return (content, closing.unwrap_or(lines.len() - 1), parse_props(before));
    }
    (before.join("\n"), first, Vec::new())
}

/// `isPropOrBlank`: blank, or `/^[A-Za-z0-9_-]+:\s*.*$/` on the trimmed line.
fn is_prop_or_blank(line: &str) -> bool {
    let trimmed = js::trim(line);
    if trimmed.is_empty() {
        return true;
    }
    let key = trimmed.bytes().take_while(|b| b.is_ascii_alphanumeric() || *b == b'_' || *b == b'-').count();
    key > 0 && trimmed[key..].starts_with(':') && js::trim_start(&trimmed[key + 1..]).chars().all(js::is_dot)
}

/// `splitTableRow`: trim, drop one leading and one trailing pipe, split on `|`.
fn split_table_row(line: &str) -> Vec<&str> {
    let t = js::trim(line);
    let start = usize::from(t.starts_with('|'));
    let end = if t.len() > start && t.ends_with('|') { t.len() - 1 } else { t.len() };
    t[start..end].split('|').collect()
}

fn cell_alignment(cell: &str) -> Option<&'static str> {
    let trimmed = js::trim(cell);
    match (trimmed.starts_with(':'), trimmed.ends_with(':')) {
        (true, true) => Some("center"),
        (false, true) => Some("right"),
        (true, false) => Some("left"),
        _ => None,
    }
}

fn table_cells(line: &str, ctx: &Ctx) -> Result<Vec<Vec<crate::ast::Inline>>> {
    split_table_row(line).into_iter().map(|cell| parse_inline(js::trim(cell), ctx)).collect()
}

pub struct OpeningFence<'a> {
    pub indent: usize,
    pub marker: u8,
    pub length: usize,
    pub info: &'a str,
}

/// `/^( {0,3})(`{3,}|~{3,})[ \t]*(.*)$/`
pub fn opening_fence(line: &str) -> Option<OpeningFence<'_>> {
    let indent = js::up_to_three_spaces(line);
    let rest = &line[indent..];
    let marker = rest.bytes().next().filter(|b| *b == b'`' || *b == b'~')?;
    let length = js::run_of(rest, marker);
    if length < 3 {
        return None;
    }
    let after = &rest[length..];
    let info = after.trim_start_matches([' ', '\t']);
    info.chars().all(js::is_dot).then_some(OpeningFence { indent, marker, length, info })
}

/// `^ {0,3}\${marker}{${length},}\s*$`
pub fn closes_fence(line: &str, marker: u8, length: usize) -> bool {
    let rest = &line[js::up_to_three_spaces(line)..];
    let run = js::run_of(rest, marker);
    run >= length && js::trim_end(&rest[run..]).is_empty()
}

struct FenceInfo {
    lang: Option<String>,
    meta: String,
}

/// `parseFenceInfo`; `None` when invalid.
fn parse_fence_info(info: &str, marker: u8) -> Option<FenceInfo> {
    let meta = decode_string_content(js::trim(info));
    if marker == b'`' && meta.contains('`') {
        return None;
    }
    if meta.is_empty() {
        return Some(FenceInfo { lang: None, meta });
    }
    let lang_len = meta.char_indices().find(|&(_, c)| js::is_space(c)).map_or(meta.len(), |(i, _)| i);
    Some(FenceInfo { lang: Some(meta[..lang_len].to_string()), meta })
}

/// `stripFenceIndent`.
fn strip_fence_indent(line: &str, indent: usize) -> &str {
    let spaces = line.bytes().take(indent).take_while(|&b| b == b' ').count();
    &line[spaces..]
}

/// `parseCodeMeta` → (filename, highlight lines).
fn parse_code_meta(meta: &str) -> (Option<String>, Option<Vec<f64>>) {
    // Neither `filename=` nor `{…}` can match in less than three bytes.
    if meta.len() < 3 {
        return (None, None);
    }
    let mut filename = None;
    let mut from = 0;
    while let Some(found) = meta[from..].find("filename=") {
        let value = from + found + "filename=".len();
        let rest = &meta[value..];
        let quoted = |q: char| rest.strip_prefix(q).and_then(|r| r.find(q).filter(|&n| n > 0).map(|n| r[..n].to_string()));
        let bare = || {
            let n = rest.char_indices().find(|&(_, c)| js::is_space(c)).map_or(rest.len(), |(i, _)| i);
            (n > 0).then(|| rest[..n].to_string())
        };
        if let Some(name) = quoted('"').or_else(|| quoted('\'')).or_else(bare) {
            filename = Some(name);
            break;
        }
        from = from + found + 1;
    }
    let mut highlight = None;
    for (open, _) in meta.match_indices('{') {
        let rest = &meta[open + 1..];
        if let Some(close) = rest.find('}').filter(|&n| n > 0) {
            highlight = Some(expand_line_ranges(&rest[..close]));
            break;
        }
    }
    (filename, highlight)
}

/// `expandLineRanges`.
fn expand_line_ranges(source: &str) -> Vec<f64> {
    let mut lines: Vec<f64> = Vec::new();
    for part in source.split(',') {
        let mut bounds = js::trim(part).split('-');
        let start = jsnum::number(bounds.next().unwrap_or(""));
        let end = bounds.next().map(jsnum::number);
        if !start.is_finite() {
            continue;
        }
        match end {
            Some(end) if end.is_finite() => {
                let mut line = start;
                while line <= end {
                    lines.push(line);
                    line += 1.0;
                }
            }
            _ => lines.push(start),
        }
    }
    for line in &mut lines {
        if *line == 0.0 {
            *line = 0.0;
        }
    }
    lines.sort_by(|a, b| a.partial_cmp(b).expect("finite"));
    lines.dedup();
    lines
}

/// `/^( {0,3}> ?)(.*)$/` → (marker length, marker ends with a space, rest).
fn quote_marker(line: &str) -> Option<(usize, bool, &str)> {
    let indent = js::up_to_three_spaces(line);
    if line.as_bytes().get(indent) != Some(&b'>') {
        return None;
    }
    let mut marker_len = indent + 1;
    let space = line.as_bytes().get(marker_len) == Some(&b' ');
    if space {
        marker_len += 1;
    }
    let rest = &line[marker_len..];
    rest.chars().all(js::is_dot).then_some((marker_len, space, rest))
}

/// `expandLeadingTabsFromColumn` (columns count code points).
fn expand_leading_tabs_from_column(line: &str, start_column: usize) -> String {
    let mut result = String::with_capacity(line.len() + 4);
    let mut column = start_column;
    let mut leading = true;
    for c in line.chars() {
        if c == '\t' && leading {
            let spaces = 4 - (column % 4);
            result.extend(std::iter::repeat_n(' ', spaces));
            column += spaces;
            continue;
        }
        result.push(c);
        column += 1;
        if c != ' ' {
            leading = false;
        }
    }
    result
}

/// `lazyContinuationCandidate`.
fn lazy_continuation_candidate(line: &str) -> String {
    let mut candidate = line.to_string();
    loop {
        // `/^ {0,3}> ?(.*)$/`
        if let Some((_, _, rest)) = quote_marker(&candidate) {
            candidate = rest.to_string();
            continue;
        }
        if let Some(marker) = parse_list_marker(&candidate) {
            if blockquote_start(&marker.body) {
                candidate = marker.body.into_owned();
                continue;
            }
        }
        return candidate;
    }
}

/// `canStartLazyBlockquoteContinuation`.
fn can_start_lazy_continuation(line: &str, options: &Options, lines: &[&str], index: usize) -> bool {
    let candidate = lazy_continuation_candidate(line);
    !js::trim(&candidate).is_empty()
        && !fence_start(&candidate)
        && !candidate.starts_with("    ")
        && !is_block_start(&candidate, options, lines, index)
}

/// `canContinueBlockquoteLazily`.
fn can_continue_lazily(line: &str, options: &Options, lines: &[&str], index: usize) -> bool {
    !js::trim(line).is_empty()
        && !blockquote_start(line)
        && !fence_start(line)
        && !is_thematic_break(line)
        && parse_list_marker(line).is_none()
        && !is_table_start(lines, index)
        && !(!options.safe && is_interrupting_html_block_start(line))
}

/// `/^\[[ xX]\]\s+/` → (checked, body without the box).
fn task_box(body: &str) -> (Option<bool>, &str) {
    let b = body.as_bytes();
    if b.len() >= 3 && b[0] == b'[' && matches!(b[1], b' ' | b'x' | b'X') && b[2] == b']' {
        let after = &body[3..];
        if after.chars().next().is_some_and(js::is_space) {
            return (Some(b[1] != b' '), js::trim_start(after));
        }
    }
    (None, body)
}

fn count_leading_spaces(line: &str) -> usize {
    line.bytes().take_while(|&b| b == b' ').count()
}

/// `openingFenceClosePattern` → (marker, length).
fn opening_fence_close(line: &str) -> Option<(u8, usize)> {
    opening_fence(line).map(|fence| (fence.marker, fence.length))
}

/// `updateOpenFence`.
fn update_open_fence(open: Option<(u8, usize)>, line: &str) -> Option<(u8, usize)> {
    match open {
        Some((marker, length)) => if closes_fence(line, marker, length) { None } else { open },
        None => opening_fence_close(line),
    }
}

fn same_list(opening: &ListMarker, marker: &ListMarker) -> bool {
    marker.ordered == opening.ordered && marker.marker == opening.marker
}

/// `parseListItemBlocks` → (children, end index, loose).
fn parse_list_item_blocks(
    first_line: &str,
    lines: &[&str],
    index: usize,
    opening: &ListMarker,
    content_indent: usize,
    ctx: &Ctx,
    seen: &mut HashMap<String, usize>,
) -> Result<(Vec<Block>, usize, bool)> {
    let options = ctx.options;
    let mut item_lines: Vec<String> = vec![first_line.to_string()];
    let mut cursor = index + 1;
    let mut loose = false;
    let mut saw_blank = false;
    let mut open_fence = opening_fence_close(first_line);
    while cursor < lines.len() {
        let line = &lines[cursor];
        if let Some(marker) = parse_list_marker(line) {
            if same_list(opening, &marker) && count_leading_spaces(line) < content_indent {
                break;
            }
        }
        if js::trim(line).is_empty() {
            if open_fence.is_some() {
                item_lines.push(String::new());
                cursor += 1;
                continue;
            }
            let Some(next_content) = (cursor + 1..lines.len()).find(|&i| !js::trim(&lines[i]).is_empty()) else { break };
            if let Some(next_marker) = parse_list_marker(&lines[next_content]) {
                if same_list(opening, &next_marker) && count_leading_spaces(&lines[next_content]) < content_indent {
                    item_lines.push(String::new());
                    loose = true;
                    saw_blank = true;
                    cursor += 1;
                    continue;
                }
            }
            if cursor == index + 1 && first_line.is_empty() {
                break;
            }
            let next_indent = count_leading_spaces(&lines[next_content]);
            if next_indent < content_indent {
                break;
            }
            item_lines.push(String::new());
            loose = !has_nested_list_marker_before_blank(&item_lines, next_indent - content_indent);
            saw_blank = true;
            cursor += 1;
            continue;
        }
        if count_leading_spaces(line) >= content_indent {
            let item_line = line[content_indent..].to_string();
            open_fence = update_open_fence(open_fence, &item_line);
            item_lines.push(item_line);
            cursor += 1;
            continue;
        }
        if !saw_blank && !is_block_start(line, options, lines, cursor) {
            open_fence = update_open_fence(open_fence, line);
            item_lines.push(line.to_string());
            cursor += 1;
            continue;
        }
        break;
    }
    while item_lines.last().is_some_and(String::is_empty) {
        item_lines.pop();
    }
    Ok((parse_blocks(&as_strs(&item_lines), ctx, seen)?, cursor - 1, loose))
}

/// `hasNestedListMarkerBeforeBlank`.
fn has_nested_list_marker_before_blank(item_lines: &[String], relative_next_indent: usize) -> bool {
    item_lines.iter().any(|line| parse_list_marker(line).is_some() && count_leading_spaces(line) < relative_next_indent)
}
