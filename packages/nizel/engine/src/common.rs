//! `parse/common.ts`.

use crate::js;

#[derive(Debug, Clone, PartialEq)]
pub struct Reference {
    pub href: String,
    pub title: Option<String>,
}

/// `normalizeReference`: trim, collapse `\s+`, `ẞ`/`ß` → `ss`, lower case.
pub fn normalize_reference(label: &str) -> String {
    let mut collapsed = String::with_capacity(label.len());
    let mut in_space = false;
    for c in js::trim(label).chars() {
        if js::is_space(c) {
            if !in_space {
                collapsed.push(' ');
                in_space = true;
            }
            continue;
        }
        in_space = false;
        if c == 'ẞ' || c == 'ß' {
            collapsed.push_str("ss");
        } else {
            collapsed.push(c);
        }
    }
    collapsed.to_lowercase()
}

/// `normalizeReferenceLabelForLookup`: unescape `\[` / `\]` first.
pub fn normalize_reference_label_for_lookup(label: &str) -> String {
    normalize_reference(&label.replace("\\[", "[").replace("\\]", "]"))
}

/// `decodeStringContent`: backslash escapes, then (on the result) entities.
pub fn decode_string_content(source: &str) -> String {
    let unescaped = if source.contains('\\') {
        let mut out = String::with_capacity(source.len());
        let mut chars = source.chars().peekable();
        while let Some(c) = chars.next() {
            if c == '\\' {
                if let Some(&next) = chars.peek() {
                    if next.is_ascii_punctuation() {
                        out.push(next);
                        chars.next();
                        continue;
                    }
                }
            }
            out.push(c);
        }
        out
    } else {
        source.to_string()
    };
    if !unescaped.contains('&') {
        return unescaped;
    }
    // `&([A-Za-z][A-Za-z0-9]+|#[0-9]+|#[xX][0-9A-Fa-f]+);` (no flags: ASCII).
    let b = unescaped.as_bytes();
    let mut out = String::with_capacity(unescaped.len());
    let mut last = 0;
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'&' {
            if let Some(end) = ascii_entity_end(b, i) {
                out.push_str(&unescaped[last..i]);
                out.push_str(&decode_entity(&unescaped[i + 1..end - 1]));
                last = end;
                i = end;
                continue;
            }
        }
        i += 1;
    }
    out.push_str(&unescaped[last..]);
    out
}

/// End (after `;`) of an ASCII entity at `i`.
fn ascii_entity_end(b: &[u8], i: usize) -> Option<usize> {
    let rest = &b[i + 1..];
    let len = match rest.first()? {
        c if c.is_ascii_alphabetic() => {
            let len = rest.iter().take_while(|c| c.is_ascii_alphanumeric()).count();
            (len >= 2).then_some(len)?
        }
        b'#' => {
            let digits = rest[1..].iter().take_while(|c| c.is_ascii_digit()).count();
            if digits > 0 {
                1 + digits
            } else if matches!(rest.get(1), Some(b'x' | b'X')) {
                let hex = rest[2..].iter().take_while(|c| c.is_ascii_hexdigit()).count();
                (hex > 0).then_some(2 + hex)?
            } else {
                return None;
            }
        }
        _ => return None,
    };
    (rest.get(len) == Some(&b';')).then_some(i + 1 + len + 1)
}

/// `decodeEntity` (without the `&` and `;`).
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

thread_local! {
    /// Set when an entity decodes to U+E000–U+E7FF, the range lone
    /// surrogates travel in when the caller mapped them.
    pub static DECODED_MARKER_RANGE: std::cell::Cell<bool> = const { std::cell::Cell::new(false) };
    /// This conversion's marker characters are lone surrogates.
    pub static MAPPED_SURROGATES: std::cell::Cell<bool> = const { std::cell::Cell::new(false) };
    /// Lone surrogates travel as `base + (unit - 0xD800)`: the caller picks a
    /// 2048-character Private Use block the source doesn't use.
    static MARKER_BASE: std::cell::Cell<u32> = const { std::cell::Cell::new(0xe000) };
}

/// Sets the marker block: U+E000, U+E800 or U+F000.
pub fn set_marker_base(base: u32) {
    MARKER_BASE.with(|b| b.set(if matches!(base, 0xe000 | 0xe800 | 0xf000) { base } else { 0xe000 }));
}

pub fn marker_base() -> u32 {
    MARKER_BASE.with(std::cell::Cell::get)
}

/// Is `code` in the marker block?
pub fn is_marker_code(code: u32) -> bool {
    let base = marker_base();
    (base..base + 0x800).contains(&code)
}

/// The marker for a surrogate unit.
pub fn marker_for(unit: u32) -> char {
    char::from_u32(marker_base() + (unit - 0xd800)).expect("marker")
}

/// Does `text` hold a marker? The block is one lead byte and 32 second bytes in UTF-8.
pub fn has_marker(text: &str) -> bool {
    let base = marker_base();
    let lead = 0xe0 | (base >> 12) as u8;
    let low = 0x80 | ((base >> 6) & 0x3f) as u8;
    text.as_bytes().windows(2).any(|w| w[0] == lead && (low..=low + 0x1f).contains(&w[1]))
}

/// `decodeCodePoint`.
fn decode_code_point(entity: &str, code_point: f64) -> String {
    if code_point >= 0.0 && code_point < 0x110000 as f64 && is_marker_code(code_point as u32) {
        DECODED_MARKER_RANGE.with(|flag| flag.set(true));
    }
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
    // `encodeURI` throws on a lone surrogate, and the JavaScript keeps the destination.
    if MAPPED_SURROGATES.with(std::cell::Cell::get) && has_marker(destination) {
        return destination.to_string();
    }
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
