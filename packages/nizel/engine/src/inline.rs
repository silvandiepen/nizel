//! `parseInlineWithState` from `parse/inline.ts`.
//!
//! The JavaScript tokenizes with one global regex of alternatives. A regex
//! match is the leftmost position where any alternative matches, taking the
//! first alternative (in source order) that matches there. `next_token`
//! reproduces exactly that: each alternative is a matcher below, tried in
//! the regex's order at each position.
//!
//! The pattern has the `iu` flags: every `[A-Za-z]` (and `[A-Z]`) class also
//! matches U+017F (ſ, folds to s) and U+212A (K, folds to k), and literal
//! letters match case-insensitively (`https?` matches `HTTP` and `httpſ`).

use crate::ast::Inline;
use crate::block::Options;
use crate::emphasis::resolve_remaining_emphasis;
use crate::js;
use crate::status::UNSUPPORTED;
use std::collections::HashSet;

type Result<T> = std::result::Result<T, i32>;

pub fn parse_inline(source: &str, options: &Options) -> Result<Vec<Inline>> {
    if !has_inline_syntax(source, options.autolinks) {
        return Ok(if source.is_empty() { Vec::new() } else { vec![Inline::text(source)] });
    }
    let has_at = source.contains('@');
    if !has_at && !has_non_emphasis_syntax(source) {
        return Ok(resolve_remaining_emphasis(vec![Inline::text(source)]));
    }
    // Links, images and the balanced-label scanner all start at a `[`.
    if source.contains('[') {
        return Err(UNSUPPORTED);
    }

    let mut nodes: Vec<Inline> = Vec::new();
    let mut last = 0;
    let mut scanner = Scanner::new(source, has_at);
    while let Some((start, end, token)) = scanner.next_token(last) {
        if start > last {
            nodes.push(Inline::text(&source[last..start]));
        }
        let matched = &source[start..end];
        match token {
            Token::InlineHtml => {
                if !options.safe {
                    // isValidInlineHtmlToken is not ported yet.
                    return Err(UNSUPPORTED);
                }
                nodes.push(Inline::text(matched));
            }
            Token::HardBreak => nodes.push(Inline::LineBreak { hard: true }),
            Token::SoftBreak => {
                trim_trailing_soft_break_space(&mut nodes);
                nodes.push(Inline::LineBreak { hard: false });
            }
            Token::Code { value } => nodes.push(Inline::InlineCode { code: normalize_code_span(&source[value.0..value.1]) }),
            Token::Escaped => nodes.push(Inline::Text { value: matched[1..].to_string(), escaped: true }),
            Token::Entity => nodes.push(Inline::Text { value: decode_entity(&matched[1..matched.len() - 1]), escaped: true }),
            Token::AngleUrl => {
                let url = &matched[1..matched.len() - 1];
                nodes.push(Inline::Link { href: normalize_href(url), title: None, children: vec![Inline::text(url)] });
            }
            Token::AngleEmail => {
                let email = &matched[1..matched.len() - 1];
                nodes.push(Inline::Link { href: format!("mailto:{email}"), title: None, children: vec![Inline::text(email)] });
            }
            Token::Delete => nodes.push(Inline::Delete { children: parse_inline(&matched[2..matched.len() - 2], options)? }),
            Token::BareUrl if options.autolinks => {
                let href = trim_trailing_punctuation(matched);
                nodes.push(Inline::Link { href: href.to_string(), title: None, children: vec![Inline::text(href)] });
                if href.len() < matched.len() {
                    nodes.push(Inline::text(&matched[href.len()..]));
                }
            }
            Token::BareEmail if options.autolinks => {
                nodes.push(Inline::Link { href: format!("mailto:{matched}"), title: None, children: vec![Inline::text(matched)] });
            }
            Token::BareUrl | Token::BareEmail => nodes.push(Inline::text(matched)),
        }
        last = end;
    }
    if last < source.len() {
        nodes.push(Inline::text(&source[last..]));
    }
    Ok(resolve_remaining_emphasis(nodes))
}

/// `hasInlineSyntax` (its URL checks are case-sensitive).
fn has_inline_syntax(source: &str, autolinks: bool) -> bool {
    if source.is_empty() {
        return false;
    }
    if source.bytes().any(|b| matches!(b, b'\\' | b'`' | b'<' | b'&' | b'\n' | b'[' | b']' | b'*' | b'_' | b'~')) {
        return true;
    }
    autolinks && (source.contains("http://") || source.contains("https://") || source.contains('@'))
}

/// `hasNonEmphasisSyntax`: ``/[`<&\n[~\\]|https?:\/\//i``.
fn has_non_emphasis_syntax(source: &str) -> bool {
    if source.bytes().any(|b| matches!(b, b'`' | b'<' | b'&' | b'\n' | b'[' | b'~' | b'\\')) {
        return true;
    }
    source.char_indices().any(|(i, _)| match_http_prefix(source, i).is_some())
}

/// `trimTrailingSoftBreakSpace`: drop one trailing space not preceded by a space.
fn trim_trailing_soft_break_space(nodes: &mut [Inline]) {
    if let Some(Inline::Text { value, .. }) = nodes.last_mut() {
        let bytes = value.as_bytes();
        if bytes.last() == Some(&b' ') && (bytes.len() < 2 || bytes[bytes.len() - 2] != b' ') {
            value.pop();
        }
    }
}

/// `normalizeCodeSpan` from `parse/code.ts`.
fn normalize_code_span(code: &str) -> String {
    let normalized = code.replace("\r\n", " ").replace('\n', " ");
    if normalized.starts_with(' ') && normalized.ends_with(' ') && normalized.bytes().any(|b| b != b' ') {
        normalized[1..normalized.len() - 1].to_string()
    } else {
        normalized
    }
}

/// `trimTrailingPunctuation` from `parse/autolink.ts`.
fn trim_trailing_punctuation(source: &str) -> &str {
    source.trim_end_matches([')', ',', '.', ';', ':', '!', '?'])
}

/// `decodeEntity` from `parse/common.ts` (without the `&` and `;`).
pub fn decode_entity(entity: &str) -> String {
    if let Some(hex) = entity.strip_prefix("#x").or_else(|| entity.strip_prefix("#X")) {
        return decode_code_point(entity, parse_int(hex, 16));
    }
    if let Some(decimal) = entity.strip_prefix('#') {
        return decode_code_point(entity, parse_int(decimal, 10));
    }
    let named = match entity {
        "amp" => "&",
        "lt" => "<",
        "gt" => ">",
        "quot" => "\"",
        "apos" => "'",
        "nbsp" => "\u{a0}",
        "AElig" => "Æ",
        "auml" => "ä",
        "ClockwiseContourIntegral" => "∲",
        "copy" => "©",
        "Dcaron" => "Ď",
        "DifferentialD" => "ⅆ",
        "frac34" => "¾",
        "HilbertSpace" => "ℋ",
        "ngE" => "≧\u{338}",
        "ouml" => "ö",
        _ => return format!("&{entity};"),
    };
    named.to_string()
}

/// `Number.parseInt(digits, radix)` for a run of valid digits.
fn parse_int(digits: &str, radix: u32) -> f64 {
    if radix == 10 {
        return digits.parse::<f64>().unwrap_or(f64::NAN);
    }
    let mut value = 0f64;
    for c in digits.chars() {
        value = value * radix as f64 + c.to_digit(radix).unwrap_or(0) as f64;
    }
    value
}

/// `decodeCodePoint`.
fn decode_code_point(entity: &str, code_point: f64) -> String {
    if !code_point.is_finite() || code_point == 0.0 || (0xd800 as f64..=0xdfff as f64).contains(&code_point) {
        return "\u{fffd}".to_string();
    }
    if code_point > 0x10ffff as f64 {
        return format!("&{entity};");
    }
    char::from_u32(code_point as u32).map_or_else(|| "\u{fffd}".to_string(), |c| c.to_string())
}

/// `normalizeHref`: `encodeURI(destination).replace(/%25([0-9A-Fa-f]{2})/g, '%$1')`.
pub fn normalize_href(destination: &str) -> String {
    const KEEP: &[u8] = b";,/?:@&=+$-_.!~*'()#";
    let mut encoded = String::with_capacity(destination.len() + 8);
    for &byte in destination.as_bytes() {
        if byte.is_ascii_alphanumeric() || KEEP.contains(&byte) {
            encoded.push(byte as char);
        } else {
            encoded.push('%');
            encoded.push(hex_digit(byte >> 4));
            encoded.push(hex_digit(byte & 15));
        }
    }
    let bytes = encoded.as_bytes();
    let mut out = String::with_capacity(encoded.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index..].starts_with(b"%25") && index + 5 <= bytes.len() && bytes[index + 3].is_ascii_hexdigit() && bytes[index + 4].is_ascii_hexdigit() {
            out.push('%');
            out.push(bytes[index + 3] as char);
            out.push(bytes[index + 4] as char);
            index += 5;
        } else {
            out.push(bytes[index] as char);
            index += 1;
        }
    }
    out
}

fn hex_digit(nibble: u8) -> char {
    b"0123456789ABCDEF"[nibble as usize] as char
}

// ---------------------------------------------------------------------------
// The tokenizer.

enum Token {
    InlineHtml,
    HardBreak,
    SoftBreak,
    Code { value: (usize, usize) },
    Escaped,
    Entity,
    AngleUrl,
    AngleEmail,
    Delete,
    BareUrl,
    BareEmail,
}

struct Scanner<'a> {
    source: &'a str,
    has_at: bool,
    /// Starts before this index are inside a bare-email local part already
    /// known not to reach an `@`.
    email_fails_until: usize,
}

impl<'a> Scanner<'a> {
    fn new(source: &'a str, has_at: bool) -> Self {
        Scanner { source, has_at, email_fails_until: 0 }
    }

    /// The leftmost match at or after `from`.
    fn next_token(&mut self, from: usize) -> Option<(usize, usize, Token)> {
        let mut position = from;
        while position < self.source.len() {
            if self.source.is_char_boundary(position) {
                if let Some((end, token)) = self.match_at(position) {
                    return Some((position, end, token));
                }
            }
            position += 1;
        }
        None
    }

    /// The first alternative, in the regex's order, that matches at `p`.
    fn match_at(&mut self, p: usize) -> Option<(usize, Token)> {
        let s = self.source;
        let b = s.as_bytes();
        match b[p] {
            b'<' => {
                if let Some(end) = match_inline_html(s, p) {
                    return Some((end, Token::InlineHtml));
                }
            }
            b' ' => {
                let spaces = js::run_of(&s[p..], b' ');
                if spaces >= 2 && b.get(p + spaces) == Some(&b'\n') {
                    return Some((p + spaces + 1, Token::HardBreak));
                }
            }
            b'\\' if b.get(p + 1) == Some(&b'\n') => return Some((p + 2, Token::HardBreak)),
            b'\n' => return Some((p + 1, Token::SoftBreak)),
            b'`' => {
                if let Some((end, value)) = match_code_span(b, p) {
                    return Some((end, Token::Code { value }));
                }
            }
            _ => {}
        }
        match b[p] {
            b'\\' if b.get(p + 1).is_some_and(u8::is_ascii_punctuation) => return Some((p + 2, Token::Escaped)),
            b'&' => {
                if let Some(end) = match_entity(s, p) {
                    return Some((end, Token::Entity));
                }
            }
            b'<' => {
                if let Some(end) = match_angle_url(s, p) {
                    return Some((end, Token::AngleUrl));
                }
                if let Some(end) = match_angle_email(s, p) {
                    return Some((end, Token::AngleEmail));
                }
            }
            b'~' => {
                if let Some(end) = match_delete(b, p) {
                    return Some((end, Token::Delete));
                }
            }
            _ => {}
        }
        if let Some(after_scheme) = match_http_prefix(s, p) {
            let run = s[after_scheme..]
                .char_indices()
                .find(|&(_, c)| js::is_space(c) || c == '<' || c == '`')
                .map_or(s.len() - after_scheme, |(i, _)| i);
            if run > 0 {
                return Some((after_scheme + run, Token::BareUrl));
            }
        }
        if self.has_at && p >= self.email_fails_until {
            if let Some(end) = self.match_bare_email(p) {
                return Some((end, Token::BareEmail));
            }
        }
        None
    }

    /// `[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}` with `iu`.
    fn match_bare_email(&mut self, p: usize) -> Option<usize> {
        let s = self.source;
        let local = run_len(s, p, is_email_local);
        if local == 0 {
            return None;
        }
        let at = p + local;
        if s.as_bytes().get(at) != Some(&b'@') {
            self.email_fails_until = at;
            return None;
        }
        let domain_start = at + 1;
        let domain = &s[domain_start..domain_start + run_len(s, domain_start, is_email_domain)];
        // The greedy domain backtracks to the last `.` (with at least one
        // domain character before it) followed by two or more letters.
        for (dot, _) in domain.char_indices().rev().filter(|&(i, c)| c == '.' && i > 0) {
            let tld_start = domain_start + dot + 1;
            let tld_len = run_len(s, tld_start, is_letter_iu);
            if s[tld_start..tld_start + tld_len].chars().count() >= 2 {
                return Some(tld_start + tld_len);
            }
        }
        None
    }
}

/// Byte length of the run of characters satisfying `keep` from `start`.
fn run_len(s: &str, start: usize, keep: impl Fn(char) -> bool) -> usize {
    s[start..].char_indices().find(|&(_, c)| !keep(c)).map_or(s.len() - start, |(i, _)| i)
}

/// `[A-Za-z]` under the `iu` flags.
fn is_letter_iu(c: char) -> bool {
    c.is_ascii_alphabetic() || c == '\u{17f}' || c == '\u{212a}'
}

fn is_alnum_iu(c: char) -> bool {
    c.is_ascii_digit() || is_letter_iu(c)
}

fn is_email_local(c: char) -> bool {
    is_alnum_iu(c) || matches!(c, '.' | '_' | '%' | '+' | '-')
}

fn is_email_domain(c: char) -> bool {
    is_alnum_iu(c) || matches!(c, '.' | '-')
}

/// `https?:\/\/` with `iu` at `p`: the index after `//`.
fn match_http_prefix(s: &str, p: usize) -> Option<usize> {
    let b = s.as_bytes();
    if b.len() < p + 7 || !b[p..p + 4].eq_ignore_ascii_case(b"http") {
        return None;
    }
    let mut i = p + 4;
    if matches!(b[i], b's' | b'S') {
        i += 1;
    } else if s[i..].starts_with('\u{17f}') {
        i += 2;
    }
    s[i..].starts_with("://").then_some(i + 3)
}

/// Code span: `` (?<!`)(`+)(?!`)([\s\S]*?)(?<!`)\1(?!`) `` → (end, value range).
fn match_code_span(b: &[u8], p: usize) -> Option<(usize, (usize, usize))> {
    if p > 0 && b[p - 1] == b'`' {
        return None;
    }
    let ticks = b[p..].iter().take_while(|&&c| c == b'`').count();
    let value_start = p + ticks;
    let mut q = value_start;
    while q < b.len() {
        if b[q] == b'`' {
            let run = b[q..].iter().take_while(|&&c| c == b'`').count();
            if run == ticks {
                return Some((q + run, (value_start, q)));
            }
            q += run;
        } else {
            q += 1;
        }
    }
    None
}

/// `&([A-Za-z][A-Za-z0-9]+|#[0-9]+|#[xX][0-9A-Fa-f]+);` with `iu`.
fn match_entity(s: &str, p: usize) -> Option<usize> {
    let start = p + 1;
    let rest = &s[start..];
    let first = rest.chars().next()?;
    let len = if is_letter_iu(first) {
        let len = run_len(s, start, is_alnum_iu);
        (rest[..len].chars().count() >= 2).then_some(len)
    } else if first == '#' {
        let digits = rest[1..].bytes().take_while(u8::is_ascii_digit).count();
        if digits > 0 {
            Some(1 + digits)
        } else if matches!(rest.as_bytes().get(1), Some(b'x' | b'X')) {
            let hex = rest[2..].bytes().take_while(u8::is_ascii_hexdigit).count();
            (hex > 0).then_some(2 + hex)
        } else {
            None
        }
    } else {
        None
    }?;
    (rest.as_bytes().get(len) == Some(&b';')).then_some(start + len + 1)
}

/// `~~([^~`]+)~~`.
fn match_delete(b: &[u8], p: usize) -> Option<usize> {
    if b.get(p + 1) != Some(&b'~') {
        return None;
    }
    let value = b[p + 2..].iter().take_while(|&&c| c != b'~' && c != b'`').count();
    (value > 0 && b[p + 2 + value..].starts_with(b"~~")).then_some(p + 2 + value + 2)
}

/// `<([A-Za-z][A-Za-z0-9+.-]{1,31}:[^<>\s]*)>` with `iu`.
fn match_angle_url(s: &str, p: usize) -> Option<usize> {
    let start = p + 1;
    let first = s[start..].chars().next()?;
    if !is_letter_iu(first) {
        return None;
    }
    let scheme_start = start + first.len_utf8();
    let scheme_len = run_len(s, scheme_start, |c| is_alnum_iu(c) || matches!(c, '+' | '.' | '-'));
    let count = s[scheme_start..scheme_start + scheme_len].chars().count();
    let colon = scheme_start + scheme_len;
    if !(1..=31).contains(&count) || s.as_bytes().get(colon) != Some(&b':') {
        return None;
    }
    let body_start = colon + 1;
    let body_end = body_start + run_len(s, body_start, |c| !(c == '<' || c == '>' || js::is_space(c)));
    (s.as_bytes().get(body_end) == Some(&b'>')).then_some(body_end + 1)
}

/// `<([A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@LABEL(?:\.LABEL)*)>` with `iu`, where a
/// label is `[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?`.
fn match_angle_email(s: &str, p: usize) -> Option<usize> {
    let start = p + 1;
    let local = run_len(s, start, |c| is_alnum_iu(c) || ".!#$%&'*+/=?^_`{|}~-".contains(c));
    let at = start + local;
    if local == 0 || s.as_bytes().get(at) != Some(&b'@') {
        return None;
    }
    let domain_start = at + 1;
    let domain_end = domain_start + run_len(s, domain_start, is_email_domain);
    if s.as_bytes().get(domain_end) != Some(&b'>') {
        return None;
    }
    let valid = s[domain_start..domain_end].split('.').all(|label| {
        (1..=63).contains(&label.chars().count())
            && label.chars().next().is_some_and(is_alnum_iu)
            && label.chars().next_back().is_some_and(is_alnum_iu)
    });
    valid.then_some(domain_end + 1)
}

/// The `inlineHtml` alternative at `p` (which holds `<`).
fn match_inline_html(s: &str, p: usize) -> Option<usize> {
    let rest = &s[p..];
    if rest.starts_with("<!-->") {
        return Some(p + 5);
    }
    if rest.starts_with("<!--->") {
        return Some(p + 6);
    }
    if rest.starts_with("<!--") {
        return rest[4..].find("-->").map(|i| p + 4 + i + 3);
    }
    if let Some(body) = rest.strip_prefix("<?") {
        return body.find("?>").map(|i| p + 2 + i + 2);
    }
    if let Some(body) = rest.strip_prefix("<!") {
        if body.chars().next().is_some_and(is_letter_iu) {
            return body.find('>').map(|i| p + 2 + i + 1);
        }
        let b = body.as_bytes();
        if b.len() >= 7 && b[0] == b'[' && b[1..6].eq_ignore_ascii_case(b"CDATA") && b[6] == b'[' {
            return body[7..].find("]]>").map(|i| p + 2 + 7 + i + 3);
        }
        return None;
    }
    match_html_tag(s, p + 1)
}

/// `\/?[A-Za-z][A-Za-z0-9-]*` then the attribute loop, after the `<`.
fn match_html_tag(s: &str, at: usize) -> Option<usize> {
    let mut i = at;
    if s.as_bytes().get(i) == Some(&b'/') {
        i += 1;
    }
    let first = s[i..].chars().next()?;
    if !is_letter_iu(first) {
        return None;
    }
    i += first.len_utf8();
    i += run_len(s, i, |c| is_alnum_iu(c) || c == '-');
    tag_attributes(s, i, &mut HashSet::new())
}

/// `(?:\s+ATTR)*\s*\/?>` from `i`, depth-first in the regex's priority
/// order: another attribute (with a value, then without) before the end.
/// ATTR is `[A-Za-z_:][A-Za-z0-9_.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?`.
/// `failed` remembers loop positions already shown not to lead to a match.
fn tag_attributes(s: &str, i: usize, failed: &mut HashSet<usize>) -> Option<usize> {
    if failed.contains(&i) {
        return None;
    }
    let spaces = run_len(s, i, js::is_space);
    if spaces > 0 {
        let name_start = i + spaces;
        if let Some(first) = s[name_start..].chars().next().filter(|&c| is_letter_iu(c) || c == '_' || c == ':') {
            let mut name_end = name_start + first.len_utf8();
            name_end += run_len(s, name_end, |c| is_alnum_iu(c) || matches!(c, '_' | '.' | ':' | '-'));
            for next in attribute_values(s, name_end).into_iter().chain(std::iter::once(name_end)) {
                if let Some(end) = tag_attributes(s, next, failed) {
                    return Some(end);
                }
            }
        }
    }
    if let Some(end) = tag_stop(s, i) {
        return Some(end);
    }
    failed.insert(i);
    None
}

/// End positions of `\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)` from `i`, in
/// priority order (an unquoted value longest first).
fn attribute_values(s: &str, i: usize) -> Vec<usize> {
    let eq = i + run_len(s, i, js::is_space);
    if s.as_bytes().get(eq) != Some(&b'=') {
        return Vec::new();
    }
    let v = eq + 1 + run_len(s, eq + 1, js::is_space);
    match s.as_bytes().get(v) {
        Some(&quote @ (b'"' | b'\'')) => s[v + 1..].find(quote as char).map(|close| vec![v + 1 + close + 1]).unwrap_or_default(),
        _ => {
            let mut ends: Vec<usize> = s[v..]
                .char_indices()
                .take_while(|&(_, c)| !(js::is_space(c) || matches!(c, '"' | '\'' | '=' | '<' | '>' | '`')))
                .map(|(n, c)| v + n + c.len_utf8())
                .collect();
            ends.reverse();
            ends
        }
    }
}

/// `\s*\/?>` from `i`.
fn tag_stop(s: &str, i: usize) -> Option<usize> {
    let mut j = i + run_len(s, i, js::is_space);
    if s.as_bytes().get(j) == Some(&b'/') {
        j += 1;
    }
    (s.as_bytes().get(j) == Some(&b'>')).then_some(j + 1)
}
