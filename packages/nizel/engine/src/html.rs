//! `parse/html.ts`: HTML blocks and inline HTML validity, plus the raw tag
//! grammar shared with the inline tokenizer.
//!
//! The tag grammar is `<\/?[A-Za-z][A-Za-z0-9-]*(?:\s+ATTR)*\s*\/?>` with
//! ATTR = `[A-Za-z_:][A-Za-z0-9_.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?`.
//! The inline tokenizer compiles it with `iu` (letters also match ſ and K);
//! `html.ts` without flags (ASCII letters), so the letter class is a parameter.

use crate::backtrack::first_match;
use crate::js;

pub type Letter = fn(char) -> bool;

pub fn ascii_letter(c: char) -> bool {
    c.is_ascii_alphabetic()
}

/// `[A-Za-z]` under the `iu` flags.
pub fn letter_iu(c: char) -> bool {
    c.is_ascii_alphabetic() || c == '\u{17f}' || c == '\u{212a}'
}

fn run_len(s: &str, start: usize, keep: impl Fn(char) -> bool) -> usize {
    s[start..].char_indices().find(|&(_, c)| !keep(c)).map_or(s.len() - start, |(i, _)| i)
}

/// Matches a tag starting at `at` (just after `<`). `closing` allows a
/// leading `/`. Returns the end (after `>`) of the first match, in regex
/// priority order, for which `accept(end)` holds.
pub fn match_tag(s: &str, at: usize, letter: Letter, closing: bool, accept: &dyn Fn(usize) -> bool) -> Option<usize> {
    let mut i = at;
    if closing && s.as_bytes().get(i) == Some(&b'/') {
        i += 1;
    }
    let first = s[i..].chars().next()?;
    if !letter(first) {
        return None;
    }
    i += first.len_utf8();
    let alnum = move |c: char| letter(c) || c.is_ascii_digit();
    i += run_len(s, i, |c| alnum(c) || c == '-');
    first_match(
        i,
        |&position| {
            // `\s+ATTR`, with a value (unquoted values longest first), then without.
            let spaces = run_len(s, position, js::is_space);
            if spaces == 0 {
                return Vec::new();
            }
            let name_start = position + spaces;
            let Some(first) = s[name_start..].chars().next().filter(|&c| letter(c) || c == '_' || c == ':') else {
                return Vec::new();
            };
            let mut name_end = name_start + first.len_utf8();
            name_end += run_len(s, name_end, |c| alnum(c) || matches!(c, '_' | '.' | ':' | '-'));
            let mut options = attribute_values(s, name_end);
            options.push(name_end);
            options
        },
        |&position| tag_stop(s, position).filter(|&end| accept(end)),
    )
}

/// End positions of `\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)` from `i`.
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

fn rest_is_space(s: &str, from: usize) -> bool {
    s[from..].chars().all(js::is_space)
}

/// `isValidInlineHtmlTag`.
pub fn is_valid_inline_html_tag(source: &str) -> bool {
    let Some(rest) = source.strip_prefix('<') else { return false };
    if rest.starts_with('/') {
        // `^<\/[A-Za-z][A-Za-z0-9-]*\s*>\s*$`
        let name = &rest[1..];
        if !name.chars().next().is_some_and(ascii_letter) {
            return false;
        }
        let after = 1 + run_len(rest, 1, |c| c.is_ascii_alphanumeric() || c == '-');
        let close = after + run_len(rest, after, js::is_space);
        return rest.as_bytes().get(close) == Some(&b'>') && rest_is_space(rest, close + 1);
    }
    match_tag(source, 1, ascii_letter, false, &|end| rest_is_space(source, end)).is_some()
}

/// `isValidInlineHtmlToken`.
pub fn is_valid_inline_html_token(source: &str) -> bool {
    let b = source.as_bytes();
    if source == "<!-->" || source == "<!--->" {
        return true;
    }
    if source.starts_with("<!--") && source.ends_with("-->") && source.len() >= 7 {
        return true;
    }
    if source.starts_with("<?") && source.ends_with("?>") && source.len() >= 4 {
        return true;
    }
    // `<![A-Z][^>]*>` (no `i` flag): upper-case ASCII only.
    if b.len() >= 4 && source.starts_with("<!") && b[2].is_ascii_uppercase() && source.ends_with('>') && !source[3..source.len() - 1].contains('>') {
        return true;
    }
    if source.starts_with("<![CDATA[") && source.ends_with("]]>") && source.len() >= 12 {
        return true;
    }
    if is_valid_inline_html_tag(source) {
        return true;
    }
    source.contains('\n')
        && starts_with_open_tag_name(source)
        && !has_bang_between_name_characters(source)
}

/// `/^<[A-Za-z][A-Za-z0-9-]*(?:\s|>)/`
fn starts_with_open_tag_name(source: &str) -> bool {
    let Some(rest) = source.strip_prefix('<') else { return false };
    if !rest.chars().next().is_some_and(ascii_letter) {
        return false;
    }
    let after = run_len(rest, 0, |c| c.is_ascii_alphanumeric() || c == '-');
    rest[after..].chars().next().is_some_and(|c| js::is_space(c) || c == '>')
}

/// `/[A-Za-z0-9_.:-]![A-Za-z0-9_.:-]/`
fn has_bang_between_name_characters(source: &str) -> bool {
    let name = |b: u8| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'.' | b':' | b'-');
    source.as_bytes().windows(3).any(|w| name(w[0]) && w[1] == b'!' && name(w[2]))
}

const BLOCK_TAGS: &[&str] = &[
    "address", "article", "aside", "base", "basefont", "blockquote", "body", "caption", "center", "col", "colgroup", "dd",
    "details", "dialog", "dir", "div", "dl", "dt", "fieldset", "figcaption", "figure", "footer", "form", "frame", "frameset",
    "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hr", "html", "iframe", "legend", "li", "link", "main", "menu",
    "menuitem", "nav", "noframes", "ol", "optgroup", "option", "p", "param", "search", "section", "summary", "table", "tbody",
    "td", "tfoot", "th", "thead", "title", "tr", "track", "ul",
];

/// What closes an HTML block (`htmlBlockClosingPattern`).
#[derive(Clone)]
enum Closing {
    /// `</tag>` case-insensitively.
    Tag(String),
    Literal(&'static str),
}

impl Closing {
    fn test(&self, line: &str) -> bool {
        match self {
            Closing::Literal(text) => line.contains(text),
            Closing::Tag(tag) => {
                let needle = format!("</{tag}>").to_ascii_lowercase();
                line.to_ascii_lowercase().contains(&needle)
            }
        }
    }
}

/// `htmlBlockClosingPattern`.
fn closing_pattern(trimmed: &str) -> Option<Closing> {
    if let Some(rest) = trimmed.strip_prefix('<') {
        for tag in ["script", "pre", "style", "textarea"] {
            let b = rest.as_bytes();
            if b.len() >= tag.len() && b[..tag.len()].eq_ignore_ascii_case(tag.as_bytes()) {
                let after = &rest[tag.len()..];
                if after.is_empty() || after.starts_with('>') || after.chars().next().is_some_and(js::is_space) {
                    // The closing tag uses the name as written (`/^<([A-Za-z][A-Za-z0-9-]*)/`).
                    let name_len = run_len(rest, 0, |c| c.is_ascii_alphanumeric() || c == '-');
                    return Some(Closing::Tag(rest[..name_len].to_string()));
                }
            }
        }
    }
    if trimmed.starts_with("<!--") {
        return Some(Closing::Literal("-->"));
    }
    if trimmed.starts_with("<?") {
        return Some(Closing::Literal("?>"));
    }
    if trimmed.as_bytes().get(2).is_some_and(u8::is_ascii_uppercase) && trimmed.starts_with("<!") {
        return Some(Closing::Literal(">"));
    }
    if trimmed.starts_with("<![CDATA[") {
        return Some(Closing::Literal("]]>"));
    }
    None
}

/// `isBlockTagHtmlBlockStart`.
fn is_block_tag_start(trimmed: &str) -> bool {
    let Some(rest) = trimmed.strip_prefix('<') else { return false };
    let rest = rest.strip_prefix('/').unwrap_or(rest);
    if !rest.chars().next().is_some_and(ascii_letter) {
        return false;
    }
    let name_len = run_len(rest, 0, |c| c.is_ascii_alphanumeric() || c == '-');
    let after = &rest[name_len..];
    let shape = after.is_empty() || after.starts_with('>') || after.starts_with("/>") || after.chars().next().is_some_and(js::is_space);
    shape && BLOCK_TAGS.contains(&rest[..name_len].to_ascii_lowercase().as_str())
}

/// `/^ {0,3}</`
fn html_line_start(line: &str) -> bool {
    line[js::up_to_three_spaces(line)..].starts_with('<')
}

/// `readHtmlBlock` → (value, end index).
pub fn read_html_block(lines: &[&str], start: usize) -> Option<(String, usize)> {
    let line = &lines[start];
    if !html_line_start(line) {
        return None;
    }
    let trimmed = js::trim_start(line);
    if let Some(closing) = closing_pattern(trimmed) {
        let mut end = start;
        while end < lines.len() {
            if closing.test(&lines[end]) {
                break;
            }
            end += 1;
        }
        let last = end.min(lines.len() - 1);
        return Some((lines[start..=last].join("\n"), end));
    }
    if is_block_tag_start(trimmed) || is_valid_inline_html_tag(trimmed) {
        let mut end = start;
        while end < lines.len() && !js::trim(&lines[end]).is_empty() {
            end += 1;
        }
        return Some((lines[start..end].join("\n"), end - 1));
    }
    None
}

/// `isInterruptingHtmlBlockStart`.
pub fn is_interrupting_html_block_start(line: &str) -> bool {
    if !html_line_start(line) {
        return false;
    }
    let trimmed = js::trim_start(line);
    closing_pattern(trimmed).is_some() || is_block_tag_start(trimmed)
}
