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

/// `escapeHtml` from `utils.ts`: jumps from one special byte to the next,
/// eight bytes at a time.
pub fn escape_html_into(out: &mut String, text: &str) {
    let bytes = text.as_bytes();
    out.reserve(bytes.len());
    let mut start = 0;
    let mut index = 0;
    while index < bytes.len() {
        let special = if index + 8 <= bytes.len() {
            let mask = html_special_mask(u64::from_le_bytes(bytes[index..index + 8].try_into().expect("eight bytes")));
            if mask == 0 {
                index += 8;
                continue;
            }
            index + (mask.trailing_zeros() / 8) as usize
        } else if HTML_SPECIAL[bytes[index] as usize] {
            index
        } else {
            index += 1;
            continue;
        };
        out.push_str(&text[start..special]);
        out.push_str(match bytes[special] {
            b'&' => "&amp;",
            b'<' => "&lt;",
            b'>' => "&gt;",
            _ => "&quot;",
        });
        start = special + 1;
        index = special + 1;
    }
    out.push_str(&text[start..]);
}

/// A mask with the high bit set in each byte of `word` that is `&`, `<`,
/// `>` or `"` (SWAR zero-byte test). Bits above a true match can be false
/// positives, but the lowest set bit is always the first match.
#[inline]
fn html_special_mask(word: u64) -> u64 {
    const ONES: u64 = 0x0101_0101_0101_0101;
    const HIGHS: u64 = 0x8080_8080_8080_8080;
    let zero = |x: u64| x.wrapping_sub(ONES) & !x & HIGHS;
    zero(word ^ (ONES * b'&' as u64)) | zero(word ^ (ONES * b'<' as u64)) | zero(word ^ (ONES * b'>' as u64)) | zero(word ^ (ONES * b'"' as u64))
}

static INLINE_SYNTAX: [bool; 256] = byte_table(b"\\`<&\n[]*_~");
/// With autolinks, `@` is syntax and `h` may start `http://`.
static INLINE_SYNTAX_AUTOLINKS: [bool; 256] = byte_table(b"\\`<&\n[]*_~@h");

/// `hasInlineSyntax` in one pass: a syntax byte, or (with autolinks) `@`,
/// `http://` or `https://` (case-sensitive, as the JavaScript checks them).
pub fn has_inline_syntax(source: &str, autolinks: bool) -> bool {
    let b = source.as_bytes();
    let table = if autolinks { &INLINE_SYNTAX_AUTOLINKS } else { &INLINE_SYNTAX };
    for (i, &byte) in b.iter().enumerate() {
        if table[byte as usize] && (byte != b'h' || b[i..].starts_with(b"http://") || b[i..].starts_with(b"https://")) {
            return true;
        }
    }
    false
}
