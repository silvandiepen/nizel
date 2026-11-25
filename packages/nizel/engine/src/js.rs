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

/// Does `text` hold a JavaScript line terminator (`.` fails on it)? U+2028
/// and U+2029 are `E2 80 A8` and `E2 80 A9`. Eight bytes at a time: a word
/// of ASCII bytes from 0x0E up holds none and is skipped whole; only a
/// word with a byte below that or a non-ASCII one is read byte by byte.
pub fn has_line_terminator(text: &str) -> bool {
    const LOW: u64 = 0x0101_0101_0101_0101;
    const HIGH: u64 = 0x8080_8080_8080_8080;
    let b = text.as_bytes();
    let terminator_at = |i: usize| match b[i] {
        b'\n' | b'\r' => true,
        0xe2 => b.get(i + 1) == Some(&0x80) && matches!(b.get(i + 2), Some(0xa8 | 0xa9)),
        _ => false,
    };
    let mut at = 0;
    while at + 8 <= b.len() {
        let word = u64::from_le_bytes(b[at..at + 8].try_into().expect("eight bytes"));
        // Some byte is non-ASCII, or below 0x0E (no false negatives: a
        // borrow only adds flags above a real one).
        if (word | (word.wrapping_sub(LOW * 0x0e) & !word)) & HIGH != 0 && (at..at + 8).any(terminator_at) {
            return true;
        }
        at += 8;
    }
    (at..b.len()).any(terminator_at)
}

/// The ASCII part of `is_space`.
fn is_ascii_space(b: u8) -> bool {
    matches!(b, b'\t' | b'\n' | 0x0b | 0x0c | b'\r' | b' ')
}

/// `String.prototype.trim`: ASCII bytes at each end are tested as bytes;
/// from a non-ASCII one on, characters are.
pub fn trim(s: &str) -> &str {
    trim_end(trim_start(s))
}

pub fn trim_start(s: &str) -> &str {
    let b = s.as_bytes();
    let mut i = 0;
    while i < b.len() && is_ascii_space(b[i]) {
        i += 1;
    }
    if i < b.len() && b[i] >= 0x80 {
        return s[i..].trim_start_matches(is_space);
    }
    &s[i..]
}

pub fn trim_end(s: &str) -> &str {
    let b = s.as_bytes();
    let mut j = b.len();
    while j > 0 && is_ascii_space(b[j - 1]) {
        j -= 1;
    }
    if j > 0 && b[j - 1] >= 0x80 {
        return s[..j].trim_end_matches(is_space);
    }
    &s[..j]
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


/// `escapeHtml` from `utils.ts`: jumps from one special byte to the next,
/// eight bytes at a time.
pub fn escape_html_into(out: &mut String, text: &str) {
    let bytes = text.as_bytes();
    out.reserve(bytes.len());
    let mut start = 0;
    while let Some(special) = crate::scan::find_any4(bytes, start, *b"&<>\"") {
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
    let table = if autolinks { &INLINE_SYNTAX_AUTOLINKS } else { &INLINE_SYNTAX };
    let mut at = 0;
    while let Some(i) = crate::scan::find_in_table(b, at, table) {
        if b[i] != b'h' || b[i..].starts_with(b"http://") || b[i..].starts_with(b"https://") {
            return true;
        }
        at = i + 1;
    }
    false
}

#[cfg(test)]
mod line_terminator_tests {
    use super::has_line_terminator;

    fn reference(text: &str) -> bool {
        text.chars().any(|c| matches!(c, '\n' | '\r' | '\u{2028}' | '\u{2029}'))
    }

    #[test]
    fn has_line_terminator_matches_a_char_scan() {
        // Every placement of each interesting character in strings of
        // filler bytes around the eight-byte boundaries.
        let specials = ["\n", "\r", "\u{2028}", "\u{2029}", "\u{2014}", "\u{2027}", "\u{202a}", "\u{e9}", "\u{1f680}", "\u{0b}", "\u{0d}x", "\u{0e}", "\u{0c}", "\u{7f}", "\u{80}"];
        let fillers = ["a", " ", "\u{0f}", "~"];
        for len in 0..20 {
            for filler in fillers {
                for special in specials {
                    for at in 0..=len {
                        let mut text = filler.repeat(at);
                        text.push_str(special);
                        text.push_str(&filler.repeat(len - at));
                        assert_eq!(has_line_terminator(&text), reference(&text), "{text:?}");
                        for second in specials {
                            let both = format!("{text}{second}");
                            assert_eq!(has_line_terminator(&both), reference(&both), "{both:?}");
                        }
                    }
                }
            }
        }
    }
}


#[cfg(test)]
mod trim_tests {
    use super::*;

    #[test]
    fn trims_as_the_character_definition_does() {
        // Every string up to length 6 over ASCII and non-ASCII spaces and not.
        let alphabet = [" ", "\t", "\n", "\u{0b}", "\r", "a", "\u{a0}", "\u{2028}", "\u{3000}", "\u{feff}", "é", "\u{200b}"];
        let mut strings = vec![String::new()];
        for _ in 0..6 {
            let mut next = Vec::new();
            for s in &strings {
                for c in alphabet {
                    next.push(format!("{s}{c}"));
                }
            }
            for s in &next {
                assert_eq!(trim(s), s.trim_matches(is_space), "{s:?}");
                assert_eq!(trim_start(s), s.trim_start_matches(is_space), "{s:?}");
                assert_eq!(trim_end(s), s.trim_end_matches(is_space), "{s:?}");
            }
            strings = next;
        }
    }
}
