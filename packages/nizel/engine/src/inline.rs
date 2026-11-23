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

use crate::ast::{strip_inline, Inline};
use crate::backtrack::first_match;
use crate::block::Options;
use crate::common::{decode_string_content, normalize_href, normalize_reference, normalize_reference_label_for_lookup};
use crate::emphasis::resolve_remaining_emphasis;
use crate::html::{is_valid_inline_html_token, letter_iu, match_tag};
use crate::js;
use crate::links;
use crate::refs::References;

type Result<T> = std::result::Result<T, i32>;

/// What every inline parse sees: options and the document's references.
pub struct Ctx<'a> {
    pub options: &'a Options,
    pub references: &'a References,
}

pub fn parse_inline(source: &str, ctx: &Ctx) -> Result<Vec<Inline>> {
    parse_inline_with_state(source, ctx, true)
}

/// `parseInline` for a source the caller owns: plain text is moved, not copied.
pub fn parse_inline_owned(source: String, ctx: &Ctx) -> Result<Vec<Inline>> {
    if !js::has_inline_syntax(&source, ctx.options.autolinks) {
        return Ok(if source.is_empty() { Vec::new() } else { vec![Inline::Text { value: source, escaped: false }] });
    }
    parse_inline_with_state(&source, ctx, true)
}

/// `stripInlineMarkdown`: parsed with the same options but no references.
fn strip_inline_markdown(source: &str, ctx: &Ctx) -> Result<String> {
    let empty = References::new();
    let bare = Ctx { options: ctx.options, references: &empty };
    Ok(strip_inline(&parse_inline_with_state(source, &bare, true)?))
}

/// `parseInlineWithState`.
fn parse_inline_with_state(source: &str, ctx: &Ctx, extract_nested_links: bool) -> Result<Vec<Inline>> {
    let options = ctx.options;
    if !js::has_inline_syntax(source, options.autolinks) {
        return Ok(if source.is_empty() { Vec::new() } else { vec![Inline::text(source)] });
    }
    let has_at = source.contains('@');
    if !has_at && !has_non_emphasis_syntax(source) {
        return Ok(resolve_remaining_emphasis(vec![Inline::text(source)]));
    }
    if extract_nested_links && source.contains('[') {
        if let Some(scanned) = scan_balanced_inline_links(source, ctx)? {
            return Ok(resolve_remaining_emphasis(scanned));
        }
    }

    let mut nodes: Vec<Inline> = Vec::new();
    let mut last = 0;
    let mut scanner = Scanner::new(source, has_at);
    while let Some((start, end, token)) = scanner.next_token(last) {
        if start > last {
            nodes.push(Inline::text(&source[last..start]));
        }
        let matched = &source[start..end];
        let slice = |(a, b): (usize, usize)| &source[a..b];
        match token {
            Token::InlineHtml => {
                if options.safe || !is_valid_inline_html_token(matched) {
                    nodes.push(Inline::text(matched));
                } else {
                    nodes.push(Inline::InlineHtml { value: matched.to_string() });
                }
            }
            Token::HardBreak => nodes.push(Inline::LineBreak { hard: true }),
            Token::SoftBreak => {
                trim_trailing_soft_break_space(&mut nodes);
                nodes.push(Inline::LineBreak { hard: false });
            }
            Token::Code { value } => nodes.push(Inline::InlineCode { code: normalize_code_span(slice(value)) }),
            Token::Escaped => nodes.push(Inline::Text { value: matched[1..].to_string(), escaped: true }),
            Token::Entity => nodes.push(Inline::Text { value: crate::common::decode_entity(&matched[1..matched.len() - 1]), escaped: true }),
            Token::RefImage { alt, label } => {
                let key = normalize_reference_label_for_lookup(if label.0 == label.1 { slice(alt) } else { slice(label) });
                match ctx.references.get(&key) {
                    Some(reference) => nodes.push(Inline::Image {
                        alt: strip_inline_markdown(slice(alt), ctx)?,
                        src: reference.href.clone(),
                        title: reference.title.clone(),
                    }),
                    None => nodes.push(Inline::text(decode_string_content(matched))),
                }
            }
            Token::RefLink { text, label } => {
                let key = normalize_reference_label_for_lookup(if label.0 == label.1 { slice(text) } else { slice(label) });
                match ctx.references.get(&key) {
                    Some(reference) => nodes.push(Inline::Link {
                        href: reference.href.clone(),
                        title: reference.title.clone(),
                        has_title: true,
                        external: is_external_href(&reference.href),
                        children: parse_inline_with_state(slice(text), ctx, true)?,
                    }),
                    None => nodes.push(Inline::text(decode_string_content(matched))),
                }
            }
            Token::InlineImage { text, href, title } => nodes.push(Inline::Image {
                alt: strip_inline_markdown(slice(text), ctx)?,
                src: normalize_href(&decode_string_content(normalize_inline_destination(slice(href)))),
                title: title.map(|t| decode_string_content(slice(t))),
            }),
            Token::InlineLink { text, href, title } => {
                let href = normalize_href(&decode_string_content(normalize_inline_destination(slice(href))));
                nodes.push(Inline::Link {
                    external: is_external_href(&href),
                    href,
                    title: title.map(|t| decode_string_content(slice(t))),
                    has_title: true,
                    children: parse_inline_with_state(slice(text), ctx, true)?,
                });
            }
            Token::AngleUrl => {
                let url = &matched[1..matched.len() - 1];
                let href = normalize_href(url);
                nodes.push(Inline::Link { external: is_external_href(&href), href, title: None, has_title: false, children: vec![Inline::text(url)] });
            }
            Token::AngleEmail => {
                let email = &matched[1..matched.len() - 1];
                nodes.push(Inline::Link { href: format!("mailto:{email}"), title: None, has_title: false, external: false, children: vec![Inline::text(email)] });
            }
            Token::ShortcutImage { text } => {
                let alt = decode_string_content(slice(text));
                match ctx.references.get(&normalize_reference(&alt)) {
                    Some(reference) => nodes.push(Inline::Image {
                        alt: strip_inline_markdown(&alt, ctx)?,
                        src: reference.href.clone(),
                        title: reference.title.clone(),
                    }),
                    None => nodes.push(Inline::text(decode_string_content(matched))),
                }
            }
            Token::ShortcutLink { text } => {
                let label = decode_string_content(slice(text));
                match ctx.references.get(&normalize_reference(&label)) {
                    Some(reference) => nodes.push(Inline::Link {
                        href: reference.href.clone(),
                        title: reference.title.clone(),
                        has_title: true,
                        external: is_external_href(&reference.href),
                        children: parse_inline_with_state(&label, ctx, true)?,
                    }),
                    None => nodes.push(Inline::text(decode_string_content(matched))),
                }
            }
            Token::Delete => nodes.push(Inline::Delete { children: parse_inline_with_state(&matched[2..matched.len() - 2], ctx, true)? }),
            Token::BareUrl if options.autolinks => {
                let href = trim_trailing_punctuation(matched);
                nodes.push(Inline::Link { href: href.to_string(), title: None, has_title: false, external: true, children: vec![Inline::text(href)] });
                if href.len() < matched.len() {
                    nodes.push(Inline::text(&matched[href.len()..]));
                }
            }
            Token::BareEmail if options.autolinks => {
                nodes.push(Inline::Link { href: format!("mailto:{matched}"), title: None, has_title: false, external: false, children: vec![Inline::text(matched)] });
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

/// `scanBalancedInlineLinks`.
fn scan_balanced_inline_links(source: &str, ctx: &Ctx) -> Result<Option<Vec<Inline>>> {
    let b = source.as_bytes();
    let mut nodes: Vec<Inline> = Vec::new();
    let mut cursor = 0;
    let mut search = 0;
    let mut found = false;
    while cursor < source.len() {
        let Some(opener) = links::next_inline_label_opener(source, search) else { break };
        let image = b[opener] == b'!';
        let label_start = opener + if image { 2 } else { 1 };
        let Some(label_end) = links::find_balanced_label_end(source, label_start) else {
            search = opener + 1;
            continue;
        };
        let label = &source[label_start..label_end];
        if !image && links::contains_inline_link(label) {
            search = opener + 1;
            continue;
        }
        let inline = if b.get(label_end + 1) == Some(&b'(') { links::read_inline_destination(source, label_end + 1) } else { None };
        let destination = match inline {
            Some(found) => Some(found),
            None => links::read_inline_reference_destination(source, label_end, label, ctx.references),
        };
        let Some(destination) = destination else {
            if let Some(unresolved_end) = links::read_unresolved_inline_reference_end(source, label_end).filter(|_| !image) {
                let reference_label = &source[label_end + 2..unresolved_end];
                if opener > cursor {
                    nodes.extend(parse_inline_with_state(&source[cursor..opener], ctx, false)?);
                }
                nodes.push(Inline::text("["));
                nodes.extend(parse_inline_with_state(label, ctx, false)?);
                nodes.push(Inline::text("]"));
                if links::read_inline_reference_destination(source, unresolved_end, reference_label, ctx.references).is_none() {
                    nodes.push(Inline::text("["));
                    nodes.extend(parse_inline_with_state(reference_label, ctx, false)?);
                    nodes.push(Inline::text("]"));
                    cursor = unresolved_end + 1;
                } else {
                    cursor = label_end + 1;
                }
                found = true;
                search = unresolved_end + 1;
                continue;
            }
            search = opener + 1;
            continue;
        };
        if opener > cursor {
            nodes.extend(parse_inline_with_state(&source[cursor..opener], ctx, false)?);
        }
        let href = normalize_href(&decode_string_content(&destination.href));
        let title = destination.title.as_deref().map(decode_string_content);
        if image {
            nodes.push(Inline::Image { alt: strip_inline_markdown(label, ctx)?, src: href, title });
        } else {
            nodes.push(Inline::Link { external: is_external_href(&href), href, title, has_title: true, children: parse_inline_with_state(label, ctx, false)? });
        }
        found = true;
        cursor = destination.end + 1;
        search = cursor;
    }
    if !found {
        return Ok(None);
    }
    if cursor < source.len() {
        nodes.extend(parse_inline_with_state(&source[cursor..], ctx, false)?);
    }
    Ok(Some(nodes))
}

/// `isExternalHref`: `/^(?:https?:)?\/\//`.
pub fn is_external_href(href: &str) -> bool {
    let rest = href.strip_prefix("https:").or_else(|| href.strip_prefix("http:")).unwrap_or(href);
    rest.starts_with("//")
}

/// `normalizeInlineDestination`.
fn normalize_inline_destination(destination: &str) -> &str {
    if destination.len() >= 2 && destination.starts_with('<') && destination.ends_with('>') {
        &destination[1..destination.len() - 1]
    } else {
        destination
    }
}

/// `hasNonEmphasisSyntax`: ``/[`<&\n[~\\]|https?:\/\//i``.
fn has_non_emphasis_syntax(source: &str) -> bool {
    let b = source.as_bytes();
    b.iter().enumerate().any(|(i, &c)| {
        matches!(c, b'`' | b'<' | b'&' | b'\n' | b'[' | b'~' | b'\\') || ((c == b'h' || c == b'H') && match_http_prefix(source, i).is_some())
    })
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
    let normalized = if code.contains('\n') { code.replace("\r\n", " ").replace('\n', " ") } else { code.to_string() };
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

// ---------------------------------------------------------------------------
// The tokenizer.

type Range = (usize, usize);

enum Token {
    RefImage { alt: Range, label: Range },
    RefLink { text: Range, label: Range },
    InlineImage { text: Range, href: Range, title: Option<Range> },
    InlineLink { text: Range, href: Range, title: Option<Range> },
    ShortcutImage { text: Range },
    ShortcutLink { text: Range },
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

/// Bytes an alternative can start with: inline HTML and angle links (`<`),
/// hard breaks (` `, `\\`), soft breaks, code spans, escapes, entities,
/// images and links (`!`, `[`), strikethrough and bare URLs (`h`/`H`).
static TOKEN_START: [bool; 256] = {
    let mut table = [false; 256];
    let starts = b"< \\\n`&![~hH";
    let mut i = 0;
    while i < starts.len() {
        table[starts[i] as usize] = true;
        i += 1;
    }
    table
};

/// With an `@`, a bare email can start at any local-part character too:
/// ASCII letters, digits, `._%+-`, and the lead bytes of ſ (C5) and K (E2).
static TOKEN_START_WITH_AT: [bool; 256] = {
    let mut table = TOKEN_START;
    let mut b = 0;
    while b < 256 {
        let c = b as u8;
        if c.is_ascii_alphanumeric() || c == b'.' || c == b'_' || c == b'%' || c == b'+' || c == b'-' || c == 0xc5 || c == 0xe2 {
            table[b] = true;
        }
        b += 1;
    }
    table
};

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

    /// The leftmost match at or after `from`. Only a few bytes can start an
    /// alternative; every other position is skipped without trying them.
    fn next_token(&mut self, from: usize) -> Option<(usize, usize, Token)> {
        let bytes = self.source.as_bytes();
        let table = if self.has_at { &TOKEN_START_WITH_AT } else { &TOKEN_START };
        let mut position = from;
        while position < bytes.len() {
            if table[bytes[position] as usize] && self.source.is_char_boundary(position) {
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
            b'!' if b.get(p + 1) == Some(&b'[') => {
                if let Some((end, alt, label)) = match_reference_form(s, p + 2, |_| true) {
                    return Some((end, Token::RefImage { alt, label }));
                }
                if let Some((end, text, href, title)) = match_inline_resource(s, p + 2) {
                    return Some((end, Token::InlineImage { text, href, title }));
                }
            }
            b'[' => {
                if let Some((end, text, label)) = match_reference_form(s, p + 1, |c| !matches!(c, ']' | '`' | '<' | '[')).filter(|(_, t, _)| t.1 > t.0) {
                    return Some((end, Token::RefLink { text, label }));
                }
                if let Some((end, text, href, title)) = match_inline_resource(s, p + 1) {
                    return Some((end, Token::InlineLink { text, href, title }));
                }
            }
            _ => {}
        }
        match b[p] {
            b'<' => {
                if let Some(end) = match_angle_url(s, p) {
                    return Some((end, Token::AngleUrl));
                }
                if let Some(end) = match_angle_email(s, p) {
                    return Some((end, Token::AngleEmail));
                }
            }
            b'!' if b.get(p + 1) == Some(&b'[') => {
                if let Some((end, text)) = match_shortcut(s, p + 2) {
                    return Some((end, Token::ShortcutImage { text }));
                }
            }
            b'[' => {
                if let Some((end, text)) = match_shortcut(s, p + 1) {
                    return Some((end, Token::ShortcutLink { text }));
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
    letter_iu(c)
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

/// Matches a reference form `TEXT\]\[LABEL\]` after the opening bracket,
/// where TEXT is a run of characters satisfying `text` (`[^\]]*` for
/// images) and LABEL is `[^\]]*`.
fn match_reference_form(s: &str, start: usize, text: impl Fn(char) -> bool) -> Option<(usize, Range, Range)> {
    let text_end = start + s[start..].char_indices().find(|&(_, c)| c == ']' || !text(c)).map_or(s.len() - start, |(i, _)| i);
    if !s[text_end..].starts_with("][") {
        return None;
    }
    let label_start = text_end + 2;
    let label_end = label_start + s[label_start..].find(']')?;
    Some((label_end + 1, (start, text_end), (label_start, label_end)))
}

fn is_link_space(b: Option<&u8>) -> bool {
    matches!(b, Some(b' ' | b'\t' | b'\n'))
}

/// `TEXT\]\([ \t\n]*HREF(?:[ \t\n]+TITLE)?[ \t\n]*\)` after the opening
/// bracket, TEXT being `[^\]`<]*`.
fn match_inline_resource(s: &str, start: usize) -> Option<(usize, Range, Range, Option<Range>)> {
    let b = s.as_bytes();
    let text_end = start + b[start..].iter().position(|&c| matches!(c, b']' | b'`' | b'<')).unwrap_or(b.len() - start);
    if !s[text_end..].starts_with("](") {
        return None;
    }
    let mut q = text_end + 2;
    while is_link_space(b.get(q)) {
        q += 1;
    }
    let href_start = q;
    if b.get(q) == Some(&b'<') {
        // `<[^<>\n\\]*>`; the other alternative starts with (?!<).
        let len = b[q + 1..].iter().position(|&c| matches!(c, b'<' | b'>' | b'\n' | b'\\'))?;
        if b[q + 1 + len] != b'>' {
            return None;
        }
        q += len + 2;
    } else {
        q = href_loop_end(s, q);
    }
    let href = (href_start, q);
    // With a title first (the optional group is greedy), then without.
    let spaces = b[q..].iter().take_while(|&&c| matches!(c, b' ' | b'\t' | b'\n')).count();
    if spaces > 0 {
        if let Some((title, end)) = match_title(s, q + spaces) {
            return Some((end, (start, text_end), href, Some(title)));
        }
    }
    let close = q + spaces;
    (b.get(close) == Some(&b')')).then_some((close + 1, (start, text_end), href, None))
}

/// The greedy href loop `(?:\\.|[^() \t\n`\\]|\([^()\n]*(?:\([^()\n]*\)[^()\n]*)*\))*`.
fn href_loop_end(s: &str, mut q: usize) -> usize {
    let b = s.as_bytes();
    loop {
        match b.get(q) {
            Some(b'\\') => match s[q + 1..].chars().next() {
                Some(c) if js::is_dot(c) => q += 1 + c.len_utf8(),
                _ => return q,
            },
            Some(b'(') => match paren_group_end(b, q) {
                Some(end) => q = end,
                None => return q,
            },
            Some(b')' | b' ' | b'\t' | b'\n' | b'`') | None => return q,
            Some(_) => q += s[q..].chars().next().map_or(1, char::len_utf8),
        }
    }
}

/// `\([^()\n]*(?:\([^()\n]*\)[^()\n]*)*\)` at `q` → end.
fn paren_group_end(b: &[u8], q: usize) -> Option<usize> {
    let plain = |from: usize| from + b[from..].iter().take_while(|&&c| !matches!(c, b'(' | b')' | b'\n')).count();
    let mut i = plain(q + 1);
    loop {
        match b.get(i) {
            Some(b')') => return Some(i + 1),
            Some(b'(') => {
                let inner = plain(i + 1);
                if b.get(inner) != Some(&b')') {
                    return None;
                }
                i = plain(inner + 1);
            }
            _ => return None,
        }
    }
}

/// A title at `q` (`"…"`, `'…'` or `(…)`) followed by `[ \t\n]*\)` →
/// (title content range, end after `)`).
fn match_title(s: &str, q: usize) -> Option<(Range, usize)> {
    let b = s.as_bytes();
    let close_after = |p: usize| {
        let spaces = b[p..].iter().take_while(|&&c| matches!(c, b' ' | b'\t' | b'\n')).count();
        (b.get(p + spaces) == Some(&b')')).then_some(p + spaces + 1)
    };
    match b.get(q)? {
        b'"' => {
            // `"((?:\\.|[^"`])*)"`, depth-first like the regex.
            let start = q + 1;
            first_match(
                start,
                |&p| {
                    let mut next = Vec::with_capacity(2);
                    if b.get(p) == Some(&b'\\') {
                        if let Some(c) = s[p + 1..].chars().next().filter(|&c| js::is_dot(c)) {
                            next.push(p + 1 + c.len_utf8());
                        }
                    }
                    if let Some(c) = s[p..].chars().next().filter(|&c| c != '"' && c != '`') {
                        next.push(p + c.len_utf8());
                    }
                    next
                },
                |&p| if b.get(p) == Some(&b'"') { close_after(p + 1).map(|end| ((start, p), end)) } else { None },
            )
        }
        b'\'' => {
            let len = s[q + 1..].find('\'')?;
            close_after(q + 1 + len + 1).map(|end| ((q + 1, q + 1 + len), end))
        }
        b'(' => {
            let len = s[q + 1..].find(')')?;
            close_after(q + 1 + len + 1).map(|end| ((q + 1, q + 1 + len), end))
        }
        _ => None,
    }
}

/// `(?:\\\]|[^\]`<\[])+\]` after the opening bracket → (end, text range).
fn match_shortcut(s: &str, start: usize) -> Option<(usize, Range)> {
    let b = s.as_bytes();
    first_match(
        (start, false),
        |&(p, _)| {
            let mut next = Vec::with_capacity(2);
            if b.get(p) == Some(&b'\\') && b.get(p + 1) == Some(&b']') {
                next.push((p + 2, true));
            }
            if let Some(c) = s[p..].chars().next().filter(|&c| !matches!(c, ']' | '`' | '<' | '[')) {
                next.push((p + c.len_utf8(), true));
            }
            next
        },
        |&(p, any)| (any && b.get(p) == Some(&b']')).then_some((p + 1, (start, p))),
    )
}

/// The tag alternative of `inlineHtml` (letters folded by `iu`).
fn match_html_tag(s: &str, at: usize) -> Option<usize> {
    match_tag(s, at, letter_iu, true, &|_| true)
}
