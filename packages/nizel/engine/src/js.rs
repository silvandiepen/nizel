//! JavaScript string semantics the engine has to reproduce exactly.

/// JavaScript's `\s` (and what `String.prototype.trim` removes):
/// WhiteSpace plus LineTerminator.
pub fn is_space(c: char) -> bool {
    matches!(
        c,
        '\t' | '\n'
            | '\u{0b}'
            | '\u{0c}'
            | '\r'
            | ' '
            | '\u{a0}'
            | '\u{1680}'
            | '\u{2000}'..='\u{200a}'
            | '\u{2028}'
            | '\u{2029}'
            | '\u{202f}'
            | '\u{205f}'
            | '\u{3000}'
            | '\u{feff}'
    )
}

/// JavaScript's `.` without the `s` flag: anything but a line terminator.
pub fn is_dot(c: char) -> bool {
    !matches!(c, '\n' | '\r' | '\u{2028}' | '\u{2029}')
}

pub fn trim(s: &str) -> &str {
    s.trim_matches(is_space)
}

pub fn trim_start(s: &str) -> &str {
    s.trim_start_matches(is_space)
}

pub fn trim_end(s: &str) -> &str {
    s.trim_end_matches(is_space)
}

/// `/^ {0,3}/` — the number of leading spaces, at most three.
pub fn up_to_three_spaces(s: &str) -> usize {
    s.bytes().take(3).take_while(|&b| b == b' ').count()
}

/// Number of leading `ch` bytes.
pub fn run_of(s: &str, ch: u8) -> usize {
    s.bytes().take_while(|&b| b == ch).count()
}

const fn byte_table(bytes: &[u8]) -> [bool; 256] {
    let mut table = [false; 256];
    let mut i = 0;
    while i < bytes.len() {
        table[bytes[i] as usize] = true;
        i += 1;
    }
    table
}

static HTML_SPECIAL: [bool; 256] = byte_table(b"&<>\"");

/// `escapeHtml` from `utils.ts`.
pub fn escape_html_into(out: &mut String, text: &str) {
    let bytes = text.as_bytes();
    let mut start = 0;
    let mut index = 0;
    while index < bytes.len() {
        let byte = bytes[index];
        if HTML_SPECIAL[byte as usize] {
            out.push_str(&text[start..index]);
            out.push_str(match byte {
                b'&' => "&amp;",
                b'<' => "&lt;",
                b'>' => "&gt;",
                _ => "&quot;",
            });
            start = index + 1;
        }
        index += 1;
    }
    out.push_str(&text[start..]);
}

static INLINE_SYNTAX: [bool; 256] = byte_table(b"\\`<&\n[]*_~");

/// `hasInlineSyntax` in one pass: a syntax byte, or (with autolinks) `@`,
/// `http://` or `https://` (case-sensitive, as the JavaScript checks them).
pub fn has_inline_syntax(source: &str, autolinks: bool) -> bool {
    let b = source.as_bytes();
    for (i, &byte) in b.iter().enumerate() {
        if INLINE_SYNTAX[byte as usize] {
            return true;
        }
        if autolinks && (byte == b'@' || (byte == b'h' && (b[i..].starts_with(b"http://") || b[i..].starts_with(b"https://")))) {
            return true;
        }
    }
    false
}
