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

static LINE_TERMINATOR_START: [bool; 256] = {
    let mut table = [false; 256];
    table[b'\n' as usize] = true;
    table[b'\r' as usize] = true;
    table[0xe2] = true;
    table
};

/// Does `text` hold a JavaScript line terminator (`.` fails on it)? One byte scan;
/// U+2028 and U+2029 are `E2 80 A8` and `E2 80 A9`.
pub fn has_line_terminator(text: &str) -> bool {
    let b = text.as_bytes();
    let mut at = 0;
    while let Some(i) = crate::scan::find_in_table(b, at, &LINE_TERMINATOR_START, b"\n\r\xe2") {
        if b[i] != 0xe2 || (b.get(i + 1) == Some(&0x80) && matches!(b.get(i + 2), Some(0xa8 | 0xa9))) {
            return true;
        }
        at = i + 1;
    }
    false
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

/// `escapeHtml` from `utils.ts`: jumps from one special byte to the next.
pub fn escape_html_into(out: &mut String, text: &str) {
    let bytes = text.as_bytes();
    out.reserve(bytes.len());
    let mut start = 0;
    while let Some(special) = crate::scan::find_in_table(bytes, start, &HTML_SPECIAL, b"&<>\"") {
        out.push_str(&text[start..special]);
        out.push_str(match bytes[special] {
            b'&' => "&amp;",
            b'<' => "&lt;",
            b'>' => "&gt;",
            _ => "&quot;",
        });
        start = special + 1;
    }
    out.push_str(&text[start..]);
}

static INLINE_SYNTAX: [bool; 256] = byte_table(b"\\`<&\n[]*_~");
/// With autolinks, `@` is syntax and `h` may start `http://`.
static INLINE_SYNTAX_AUTOLINKS: [bool; 256] = byte_table(b"\\`<&\n[]*_~@h");

/// `hasInlineSyntax` in one pass: a syntax byte, or (with autolinks) `@`,
/// `http://` or `https://` (case-sensitive, as the JavaScript checks them).
pub fn has_inline_syntax(source: &str, autolinks: bool) -> bool {
    let b = source.as_bytes();
    let (table, needles): (&[bool; 256], &[u8]) =
        if autolinks { (&INLINE_SYNTAX_AUTOLINKS, b"\\`<&\n[]*_~@h") } else { (&INLINE_SYNTAX, b"\\`<&\n[]*_~") };
    let mut at = 0;
    while let Some(i) = crate::scan::find_in_table(b, at, table, needles) {
        if b[i] != b'h' || b[i..].starts_with(b"http://") || b[i..].starts_with(b"https://") {
            return true;
        }
        at = i + 1;
    }
    false
}
