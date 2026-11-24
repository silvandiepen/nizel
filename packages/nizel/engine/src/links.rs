//! `parse/inline-links.ts`. Indices are byte offsets; every character the
//! JavaScript tests by index is ASCII, and "skip the escaped unit" skips a
//! whole character (skipping a high surrogate leaves a low surrogate that
//! matches nothing, the same as skipping both).

use crate::common::{normalize_reference_label_for_lookup, Reference};
use crate::html::is_valid_inline_html_token;
use crate::js;
use crate::refs::References;

fn char_len(s: &str, i: usize) -> usize {
    s[i..].chars().next().map_or(1, char::len_utf8)
}

/// `nextInlineLabelOpener`.
pub fn next_inline_label_opener(s: &str, start: usize) -> Option<usize> {
    let b = s.as_bytes();
    let mut i = start;
    while i < b.len() {
        match b[i] {
            b'\\' => {
                i += 1;
                if i < b.len() {
                    i += char_len(s, i);
                }
                continue;
            }
            b'[' => return Some(i),
            b'!' if b.get(i + 1) == Some(&b'[') => return Some(i),
            _ => {}
        }
        i += char_len(s, i);
    }
    None
}

/// `findBalancedLabelEnd`.
pub fn find_balanced_label_end(s: &str, start: usize) -> Option<usize> {
    let b = s.as_bytes();
    let mut depth = 0usize;
    let mut i = start;
    while i < b.len() {
        match b[i] {
            b'\\' => {
                i += 1;
                if i < b.len() {
                    i += char_len(s, i);
                }
                continue;
            }
            b'`' => {
                let ticks = b[i..].iter().take_while(|&&c| c == b'`').count();
                if let Some(close) = s[i + ticks..].find(&s[i..i + ticks]) {
                    i = i + ticks + close + ticks;
                    continue;
                }
            }
            b'<' => {
                if let Some(close) = s[i + 1..].find('>') {
                    let close = i + 1 + close;
                    let token = &s[i..=close];
                    if is_autolink_token(token) || is_valid_inline_html_token(token) {
                        i = close + 1;
                        continue;
                    }
                }
            }
            _ => {}
        }
        match b[i] {
            b'[' => depth += 1,
            b']' => {
                if depth == 0 {
                    return Some(i);
                }
                depth -= 1;
            }
            _ => {}
        }
        i += char_len(s, i);
    }
    None
}

/// `containsInlineLink`: ``/(?<!!)\[[^\]]+\](?:\(|\[)/``.
pub fn contains_inline_link(label: &str) -> bool {
    let b = label.as_bytes();
    (0..b.len()).any(|i| {
        if b[i] != b'[' || (i > 0 && b[i - 1] == b'!') {
            return false;
        }
        match b[i + 1..].iter().position(|&c| c == b']') {
            Some(len) if len > 0 => matches!(b.get(i + 1 + len + 1), Some(b'(' | b'[')),
            _ => false,
        }
    })
}

/// `isAutolinkToken` (the first pattern has no flags, the second only `i`;
/// neither folds non-ASCII letters).
pub fn is_autolink_token(token: &str) -> bool {
    let Some(inner) = token.strip_prefix('<').and_then(|t| t.strip_suffix('>')) else { return false };
    // `^<[A-Za-z][A-Za-z0-9+.-]{1,31}:[^<>\s]*>$`
    let b = inner.as_bytes();
    if b.first().is_some_and(u8::is_ascii_alphabetic) {
        let scheme = b[1..].iter().take_while(|c| c.is_ascii_alphanumeric() || matches!(c, b'+' | b'.' | b'-')).count();
        if (1..=31).contains(&scheme) && b.get(1 + scheme) == Some(&b':') && !inner[2 + scheme..].chars().any(|c| c == '<' || c == '>' || js::is_space(c)) {
            return true;
        }
    }
    // email: local@label(.label)*
    let local = b.iter().take_while(|c| c.is_ascii_alphanumeric() || b".!#$%&'*+/=?^_`{|}~-".contains(c)).count();
    if local == 0 || b.get(local) != Some(&b'@') {
        return false;
    }
    let domain = &inner[local + 1..];
    !domain.is_empty()
        && domain.split('.').all(|label| {
            let l = label.as_bytes();
            (1..=63).contains(&l.len())
                && l.iter().all(|c| c.is_ascii_alphanumeric() || *c == b'-')
                && l[0].is_ascii_alphanumeric()
                && l[l.len() - 1].is_ascii_alphanumeric()
        })
}

/// `findReferenceLabelEnd`.
pub fn find_reference_label_end(s: &str, start: usize) -> Option<usize> {
    let b = s.as_bytes();
    let mut i = start;
    while i < b.len() {
        match b[i] {
            b'\\' => {
                i += 1;
                if i < b.len() {
                    i += char_len(s, i);
                }
                continue;
            }
            b'[' => return None,
            b']' => return Some(i),
            _ => {}
        }
        i += char_len(s, i);
    }
    None
}

pub struct Destination {
    pub href: String,
    pub title: Option<String>,
    pub end: usize,
}

/// `readInlineReferenceDestination`.
pub fn read_inline_reference_destination(s: &str, label_end: usize, label: &str, references: &References) -> Option<Destination> {
    if s.as_bytes().get(label_end + 1) != Some(&b'[') {
        return None;
    }
    let reference_end = find_reference_label_end(s, label_end + 2)?;
    let reference_label = &s[label_end + 2..reference_end];
    let key = normalize_reference_label_for_lookup(if reference_label.is_empty() { label } else { reference_label });
    let Reference { href, title } = references.get(&key)?.clone();
    Some(Destination { href, title, end: reference_end })
}

/// `readUnresolvedInlineReferenceEnd`.
pub fn read_unresolved_inline_reference_end(s: &str, label_end: usize) -> Option<usize> {
    if s.as_bytes().get(label_end + 1) != Some(&b'[') {
        return None;
    }
    find_reference_label_end(s, label_end + 2)
}

fn is_link_space(b: Option<&u8>) -> bool {
    matches!(b, Some(b' ' | b'\t' | b'\n'))
}

/// `readInlineDestination`.
pub fn read_inline_destination(s: &str, open: usize) -> Option<Destination> {
    let b = s.as_bytes();
    if b.get(open) != Some(&b'(') {
        return None;
    }
    let mut cursor = open + 1;
    while is_link_space(b.get(cursor)) {
        cursor += 1;
    }
    let mut href = String::new();
    if b.get(cursor) == Some(&b'<') {
        let close = cursor + 1 + s[cursor + 1..].find('>')?;
        href = s[cursor + 1..close].to_string();
        if href.bytes().any(|c| matches!(c, b'<' | b'>' | b'\\' | b'\n')) {
            return None;
        }
        cursor = close + 1;
    } else {
        let mut depth = 0usize;
        while cursor < b.len() {
            let c = b[cursor];
            if c == b'\\' && cursor + 1 < b.len() {
                if b[cursor + 1].is_ascii_punctuation() {
                    href.push(b[cursor + 1] as char);
                    cursor += 2;
                } else {
                    href.push('\\');
                    cursor += 1;
                }
                continue;
            }
            if c == b'(' {
                depth += 1;
            } else if c == b')' {
                if depth == 0 {
                    break;
                }
                depth -= 1;
            } else if matches!(c, b' ' | b'\t' | b'\n') && depth == 0 {
                break;
            }
            let len = char_len(s, cursor);
            href.push_str(&s[cursor..cursor + len]);
            cursor += len;
        }
        if depth != 0 {
            return None;
        }
    }

    let mut title = None;
    let before_title = cursor;
    while is_link_space(b.get(cursor)) {
        cursor += 1;
    }
    if cursor > before_title && matches!(b.get(cursor), Some(b'"' | b'\'' | b'(')) {
        let opener = b[cursor];
        let closer = if opener == b'(' { b')' } else { opener };
        cursor += 1;
        let mut value = String::new();
        while cursor < b.len() {
            if b[cursor] == b'\\' && cursor + 1 < b.len() {
                // JavaScript appends the next UTF-16 unit; a whole character is the same text.
                let len = char_len(s, cursor + 1);
                value.push_str(&s[cursor + 1..cursor + 1 + len]);
                cursor += 1 + len;
                continue;
            }
            if b[cursor] == closer {
                break;
            }
            let len = char_len(s, cursor);
            value.push_str(&s[cursor..cursor + len]);
            cursor += len;
        }
        if b.get(cursor) != Some(&closer) {
            return None;
        }
        title = Some(value);
        cursor += 1;
        while is_link_space(b.get(cursor)) {
            cursor += 1;
        }
    }
    if b.get(cursor) != Some(&b')') {
        return None;
    }
    Some(Destination { href, title, end: cursor })
}
