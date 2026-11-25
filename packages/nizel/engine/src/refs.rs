//! `parse/references.ts`: link reference definitions, extracted before
//! block parsing.

use crate::backtrack::first_match;
use crate::block::is_thematic_break;
use crate::common::{decode_string_content, normalize_href, normalize_reference, Reference};
use crate::html::html_block_lines;
use crate::js;
use std::collections::HashMap;

pub type References = HashMap<String, Reference, crate::hash::FastBuild>;

/// `extractReferenceDefinitions` → (content lines, references).
/// The content lines borrow the input (a quoted definition becomes `>`).
pub fn extract<'a>(lines: &[&'a str]) -> (Vec<&'a str>, References) {
    let mut content: Vec<&'a str> = Vec::with_capacity(lines.len());
    let references = scan_definitions(lines, Some(&mut content), false);
    (content, references)
}

/// Whether `extract` finds any definition in `lines` (the same scan,
/// stopping at the first one, without collecting content lines).
pub fn defines_any(lines: &[&str]) -> bool {
    !scan_definitions(lines, None, true).is_empty()
}

fn scan_definitions<'a>(lines: &[&'a str], mut content: Option<&mut Vec<&'a str>>, first_only: bool) -> References {
    let mut references = References::default();
    let mut previous_was_reference = false;
    let mut index = 0;
    while index < lines.len() {
        // A line whose first byte after up to three spaces is none of `[`
        // (a definition), `<` (HTML), a fence marker or `>` (a quoted
        // definition), and that is not indented code, is a content line:
        // every reader below declines it.
        let line = lines[index];
        let lead = line.as_bytes().get(js::up_to_three_spaces(line)).copied();
        if !matches!(lead, Some(b'[' | b'<' | b'`' | b'~' | b'>' | b' ')) {
            if let Some(content) = content.as_deref_mut() {
                content.push(line);
            }
            previous_was_reference = false;
            index += 1;
            continue;
        }
        if let Some((_, end)) = html_block_lines(lines, index) {
            if let Some(content) = content.as_deref_mut() {
                content.extend_from_slice(&lines[index..(end + 1).min(lines.len())]);
            }
            index = end + 1;
            previous_was_reference = false;
            continue;
        }

        let line = lines[index];
        let after_indent = &line[js::up_to_three_spaces(line)..];
        let fence_marker = after_indent.bytes().next().filter(|b| *b == b'`' || *b == b'~');
        if let Some(marker) = fence_marker.filter(|&m| js::run_of(after_indent, m) >= 3) {
            let length = js::run_of(after_indent, marker);
            if let Some(content) = content.as_deref_mut() {
                content.push(line);
            }
            index += 1;
            while index < lines.len() {
                if let Some(content) = content.as_deref_mut() {
                    content.push(lines[index]);
                }
                if closes_fence(&lines[index], marker, length) {
                    break;
                }
                index += 1;
            }
            index += 1;
            previous_was_reference = false;
            continue;
        }

        if line.starts_with("    ") {
            if let Some(content) = content.as_deref_mut() {
                content.push(line);
            }
            index += 1;
            previous_was_reference = false;
            continue;
        }

        if let Some(quoted) = blockquote_reference_line(line) {
            if let Some((label, reference, _)) = read_reference_definition(&[quoted], 0) {
                references.entry(normalize_reference(&label)).or_insert(reference);
                if first_only {
                    return references;
                }
                if let Some(content) = content.as_deref_mut() {
                    content.push(">");
                }
                previous_was_reference = true;
                index += 1;
                continue;
            }
        }

        let can_start = index == 0
            || js::trim(&lines[index - 1]).is_empty()
            || previous_was_reference
            || is_reference_start_after_block(&lines[index - 1]);
        if !can_start {
            if let Some(content) = content.as_deref_mut() {
                content.push(line);
            }
            previous_was_reference = false;
            index += 1;
            continue;
        }

        match read_reference_definition(lines, index) {
            Some((label, reference, end)) => {
                references.entry(normalize_reference(&label)).or_insert(reference);
                if first_only {
                    return references;
                }
                index = end + 1;
                previous_was_reference = true;
            }
            None => {
                if let Some(content) = content.as_deref_mut() {
                    content.push(line);
                }
                previous_was_reference = false;
                index += 1;
            }
        }
    }
    references
}

/// `^ {0,3}\${marker}{${length},}\s*$`
fn closes_fence(line: &str, marker: u8, length: usize) -> bool {
    let rest = &line[js::up_to_three_spaces(line)..];
    let run = js::run_of(rest, marker);
    run >= length && js::trim_end(&rest[run..]).is_empty()
}

/// `/^>\s?(.*)$/` → group 1.
fn blockquote_reference_line(line: &str) -> Option<&str> {
    let rest = line.strip_prefix('>')?;
    if let Some(c) = rest.chars().next().filter(|&c| js::is_space(c)) {
        let after = &rest[c.len_utf8()..];
        if after.chars().all(js::is_dot) {
            return Some(after);
        }
    }
    rest.chars().all(js::is_dot).then_some(rest)
}

/// `isReferenceStartAfterBlock`.
pub(crate) fn is_reference_start_after_block(line: &str) -> bool {
    let rest = &line[js::up_to_three_spaces(line)..];
    let hashes = js::run_of(rest, b'#');
    let atx = (1..=hashes.min(6)).any(|n| rest[n..].is_empty() || rest[n..].chars().next().is_some_and(js::is_space));
    atx || is_thematic_break(line)
}

type Definition = (String, Reference, usize);

/// `readReferenceDefinition`.
pub fn read_reference_definition(lines: &[&str], start: usize) -> Option<Definition> {
    if let Some(found) = read_multiline_reference_definition(lines, start) {
        return Some(found);
    }
    let line = &lines[start];
    let open = js::up_to_three_spaces(line);
    if line.as_bytes().get(open) != Some(&b'[') {
        return None;
    }
    let (label_end, rest) = single_line_label(line, open + 1)?;
    let mut parts = vec![rest.to_string()];
    let mut cursor = start + 1;
    while cursor < lines.len() && !js::trim(&lines[cursor]).is_empty() && can_continue_reference_definition(&parts, &lines[cursor]) {
        parts.push(lines[cursor].to_string());
        cursor += 1;
    }
    let reference = parse_reference_definition_content(&parts.join("\n"))?;
    Some((decode_string_content(&line[open + 1..label_end]), reference, cursor - 1))
}

/// A label item: `\\[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]` or `[^\[\]\n]`.
/// Returns the next positions in regex priority order.
fn label_items(s: &str, p: usize) -> Vec<usize> {
    let mut next = Vec::with_capacity(2);
    let b = s.as_bytes();
    if b.get(p) == Some(&b'\\') && b.get(p + 1).is_some_and(u8::is_ascii_punctuation) {
        next.push(p + 2);
    }
    if let Some(c) = s[p..].chars().next() {
        if c != '[' && c != ']' && c != '\n' {
            // `[^\[\]\n]` matches one UTF-16 unit; an astral character is two
            // items, which only matters for the {1,999} count below.
            next.push(p + c.len_utf8());
        }
    }
    next
}

/// `^ {0,3}\[(ITEM{1,999})\]:[ \t]*(.*)$` from after the `[` → (label end, group 2).
fn single_line_label(line: &str, start: usize) -> Option<(usize, &str)> {
    // States carry the item count, as `{1,999}` bounds it.
    first_match(
        (start, 0usize),
        |&(p, count)| {
            if count >= 999 {
                return Vec::new();
            }
            label_items(line, p)
                .into_iter()
                .map(|q| (q, count + if q - p == 4 { 2 } else { 1 }))
                .filter(|&(_, n)| n <= 999)
                .collect()
        },
        |&(p, count)| {
            if count == 0 || !line[p..].starts_with("]:") {
                return None;
            }
            let after = p + 2 + line[p + 2..].bytes().take_while(|b| *b == b' ' || *b == b'\t').count();
            line[after..].chars().all(js::is_dot).then(|| (p, &line[after..]))
        },
    )
}

/// `readMultilineReferenceDefinition`.
fn read_multiline_reference_definition(lines: &[&str], start: usize) -> Option<Definition> {
    let line = &lines[start];
    let open = js::up_to_three_spaces(line);
    if line.as_bytes().get(open) != Some(&b'[') {
        return None;
    }
    // `^ {0,3}\[(ITEM*)$`
    let whole = first_match(open + 1, |&p| label_items(line, p), |&p| (p == line.len()).then_some(()));
    whole?;
    let mut label_parts = vec![line[open + 1..].to_string()];
    for cursor in start + 1..lines.len() {
        let candidate = &lines[cursor];
        let Some((label_end, rest)) = multiline_closer(candidate) else {
            if js::trim(candidate).is_empty() {
                return None;
            }
            label_parts.push(candidate.to_string());
            continue;
        };
        let indent = js::up_to_three_spaces(candidate);
        label_parts.push(candidate[indent..label_end].to_string());
        let label = label_parts.join("\n");
        if js::trim(&label).is_empty() || label.encode_utf16().count() > 999 {
            return None;
        }
        let mut parts = vec![rest.to_string()];
        let mut content_cursor = cursor + 1;
        while content_cursor < lines.len()
            && !js::trim(&lines[content_cursor]).is_empty()
            && can_continue_reference_definition(&parts, &lines[content_cursor])
        {
            parts.push(lines[content_cursor].to_string());
            content_cursor += 1;
        }
        let reference = parse_reference_definition_content(&parts.join("\n"))?;
        return Some((decode_string_content(&label), reference, content_cursor - 1));
    }
    None
}

/// `^ {0,3}(ITEM*)\]:[ \t]*(.*)$` → (label end, group 2).
fn multiline_closer(line: &str) -> Option<(usize, &str)> {
    let start = js::up_to_three_spaces(line);
    first_match(
        start,
        |&p| label_items(line, p),
        |&p| {
            if !line[p..].starts_with("]:") {
                return None;
            }
            let after = p + 2 + line[p + 2..].bytes().take_while(|b| *b == b' ' || *b == b'\t').count();
            line[after..].chars().all(js::is_dot).then(|| (p, &line[after..]))
        },
    )
}

/// `canContinueReferenceDefinition`.
fn can_continue_reference_definition(parts: &[String], line: &str) -> bool {
    let joined = parts.join("\n");
    let collected = js::trim(&joined);
    if collected.is_empty() || line.starts_with(' ') || has_open_reference_title(parts) {
        return true;
    }
    let parsed = parse_reference_definition_content(collected);
    parsed.is_none_or(|reference| reference.title.is_none())
        && js::trim(line).starts_with(['"', '\'', '('])
        && parse_reference_definition_content(&format!("{collected}\n{line}")).is_some()
}

/// `parseReferenceDefinitionContent`.
pub fn parse_reference_definition_content(content: &str) -> Option<Reference> {
    let mut rest = js::trim(content);
    if rest.is_empty() {
        return None;
    }
    let destination;
    if let Some(after) = rest.strip_prefix('<') {
        let close = after.find('>')?;
        destination = &after[..close];
        rest = &after[close + 1..];
        if !rest.is_empty() && !rest.chars().next().is_some_and(js::is_space) {
            return None;
        }
    } else {
        let len = rest.char_indices().find(|&(_, c)| js::is_space(c)).map_or(rest.len(), |(i, _)| i);
        destination = &rest[..len];
        rest = &rest[len..];
    }
    let title = parse_reference_title(rest)?;
    Some(Reference {
        href: normalize_href(&decode_string_content(destination)),
        title: title.map(decode_string_content),
    })
}

/// `parseReferenceTitle`: `None` = invalid, `Some(None)` = no title.
fn parse_reference_title(source: &str) -> Option<Option<&str>> {
    let rest = js::trim(source);
    if rest.is_empty() {
        return Some(None);
    }
    let opener = rest.as_bytes()[0];
    let closer = match opener {
        b'(' => b')',
        b'"' | b'\'' => opener,
        _ => return None,
    };
    if !rest.ends_with(closer as char) {
        return None;
    }
    // `rest.slice(1, -1)`: a lone quote is both opener and closer → "".
    Some(Some(if rest.len() >= 2 { &rest[1..rest.len() - 1] } else { "" }))
}

/// `hasOpenReferenceTitle`.
fn has_open_reference_title(parts: &[String]) -> bool {
    let joined = parts.join("\n");
    let content = js::trim(&joined);
    // `/^<?\S+>?/` is always the first run of non-whitespace.
    let destination = content.char_indices().find(|&(_, c)| js::is_space(c)).map_or(content.len(), |(i, _)| i);
    if destination == 0 {
        return false;
    }
    let rest = js::trim_start(&content[destination..]);
    let Some(&opener) = rest.as_bytes().first() else { return false };
    let closer = match opener {
        b'(' => b')',
        b'"' | b'\'' => opener,
        _ => return false,
    };
    rest.encode_utf16().count() == 1 || !rest.ends_with(closer as char)
}
