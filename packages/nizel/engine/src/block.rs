//! `parseMarkdown` / `parseBlocks` from `parse.ts`.
//!
//! Every branch the JavaScript loop takes is checked in the same order.
//! Branches whose constructs are not ported yet return `UNSUPPORTED` at
//! exactly the point the JavaScript would enter them, so a document either
//! comes out byte-identical or is declined — never different.

use crate::ast::{strip_inline, Block};
use crate::html::{is_interrupting_html_block_start, read_html_block};
use crate::inline::{parse_inline, Ctx};
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

pub fn parse_markdown(markdown: &str, options: &Options) -> Result<Vec<Block>> {
    let normalized = if markdown.contains('\r') { normalize_line_endings(markdown) } else { markdown.to_string() };
    let lines: Vec<String> = if normalized.contains('\t') {
        normalized.split('\n').map(expand_leading_tabs_in_line).collect()
    } else {
        normalized.split('\n').map(str::to_string).collect()
    };
    let (lines, references) = if normalized.contains("]:") && has_possible_reference_definition_start(&normalized) {
        refs::extract(&lines)
    } else {
        (lines, References::new())
    };
    let ctx = Ctx { options, references: &references };
    let mut seen = HashMap::new();
    parse_blocks(&lines, &ctx, &mut seen)
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

fn parse_blocks(lines: &[String], ctx: &Ctx, seen: &mut HashMap<String, usize>) -> Result<Vec<Block>> {
    let options = ctx.options;
    let mut children = Vec::new();
    let mut index = 0;
    while index < lines.len() {
        let line = lines[index].as_str();
        let trimmed = js::trim(line);
        if trimmed.is_empty() {
            index += 1;
            continue;
        }

        if !options.safe {
            if let Some((value, end)) = read_html_block(lines, index) {
                children.push(Block::Html { value });
                index = end + 1;
                continue;
            }
        }
        // Custom blocks, fences and indented code are not ported yet.
        if trimmed.starts_with("::") {
            return Err(UNSUPPORTED);
        }
        if fence_start(line) || line.starts_with("    ") {
            return Err(UNSUPPORTED);
        }

        if is_thematic_break(line) {
            children.push(Block::ThematicBreak);
            index += 1;
            continue;
        }

        if let Some((depth, source)) = atx_heading(line) {
            let source = trim_closing_heading_hashes(source);
            children.push(heading(depth, &source, ctx, seen)?);
            index += 1;
            continue;
        }

        let next = lines.get(index + 1).map(String::as_str).filter(|next| !next.is_empty());
        if let Some(depth) = next.and_then(setext_underline) {
            if !is_block_start(line, options, lines, index) {
                children.push(heading(depth, trimmed, ctx, seen)?);
                index += 2;
                continue;
            }
        }

        if is_table_start(lines, index) || blockquote_start(line) || parse_list_marker(line).is_some() {
            return Err(UNSUPPORTED);
        }

        let mut paragraph = vec![normalize_paragraph_line(line)];
        while index + 1 < lines.len() && can_continue_paragraph(&lines[index + 1], lines, index + 1, options)? {
            index += 1;
            paragraph.push(normalize_paragraph_line(&lines[index]));
        }
        let source = normalize_paragraph_source(&paragraph);
        let next = lines.get(index + 1).map(String::as_str).filter(|next| !next.is_empty());
        if let Some(depth) = next.and_then(setext_underline) {
            children.push(heading(depth, &source, ctx, seen)?);
            index += 2;
            continue;
        }
        children.push(Block::Paragraph { children: parse_inline(&source, ctx)? });
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
fn can_continue_paragraph(line: &str, lines: &[String], index: usize, options: &Options) -> Result<bool> {
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
    if line.contains('|') {
        return true;
    }
    let first = js::trim_start(line).chars().next();
    if !options.safe && first == Some('<') {
        return true;
    }
    first.is_some_and(|c| "#`~:->*+=0123456789".contains(c))
}

/// `isBlockStart`.
fn is_block_start(line: &str, options: &Options, lines: &[String], index: usize) -> bool {
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
fn is_table_start(lines: &[String], index: usize) -> bool {
    lines[index].contains('|') && lines.get(index + 1).is_some_and(|next| !next.is_empty() && is_table_delimiter_row(next))
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

/// `parseListMarker` from `parse/list.ts`, reduced to "is there one" and
/// the fields paragraph interruption needs.
pub struct ListMarker {
    pub ordered: bool,
    pub start: Option<u64>,
    pub body_empty: bool,
}

pub fn parse_list_marker(line: &str) -> Option<ListMarker> {
    let expanded;
    let line = if line.contains('\t') {
        expanded = expand_list_marker_tabs(line);
        expanded.as_str()
    } else {
        line
    };
    let indent = js::up_to_three_spaces(line);
    let rest = &line[indent..];
    let first = *rest.as_bytes().first()?;
    if matches!(first, b'-' | b'*' | b'+') {
        let after = &rest[1..];
        let padding = after.bytes().take_while(|b| *b == b' ' || *b == b'\t').count();
        let body = &after[padding..];
        // `(.*)$` without the `m` flag: a line terminator in the body fails the whole match.
        if (padding > 0 || body.is_empty()) && body.chars().all(js::is_dot) {
            return Some(ListMarker { ordered: false, start: None, body_empty: list_marker_body_empty(padding, body) });
        }
    }
    let digits = rest.bytes().take_while(u8::is_ascii_digit).count();
    if (1..=9).contains(&digits) {
        let delimiter = rest.as_bytes().get(digits).copied();
        if matches!(delimiter, Some(b'.') | Some(b')')) {
            let after = &rest[digits + 1..];
            let padding = after.bytes().take_while(|b| *b == b' ' || *b == b'\t').count();
            let body = &after[padding..];
            if (padding > 0 || body.is_empty()) && body.chars().all(js::is_dot) {
                return Some(ListMarker {
                    ordered: true,
                    start: rest[..digits].parse().ok(),
                    body_empty: list_marker_body_empty(padding, body),
                });
            }
        }
    }
    None
}

/// `listMarkerBody(...) === ''`: padding beyond four columns stays in the body.
fn list_marker_body_empty(padding: usize, body: &str) -> bool {
    if padding > 4 { false } else { body.is_empty() }
}

/// `isParagraphInterruptingListMarker`.
fn is_paragraph_interrupting_list_marker(line: &str) -> bool {
    parse_list_marker(line).is_some_and(|marker| !marker.body_empty && (!marker.ordered || marker.start == Some(1)))
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
fn normalize_paragraph_line(line: &str) -> String {
    js::trim_start(&line[js::up_to_three_spaces(line)..]).to_string()
}

/// `normalizeParagraphSource`: `lines.join('\n').replace(/[ \t]+$/, '')`.
fn normalize_paragraph_source(lines: &[String]) -> String {
    let joined = lines.join("\n");
    joined.trim_end_matches([' ', '\t']).to_string()
}
