//! Byte scans used on every document. (A Wasm SIMD version measured no faster:
//! most scans in Markdown are short. See NIZEL-001, iteration 24.)

/// The first index at or after `from` whose byte is in `table`.
#[inline]
pub fn find_in_table(bytes: &[u8], from: usize, table: &[bool; 256]) -> Option<usize> {
    bytes[from.min(bytes.len())..].iter().position(|&b| table[b as usize]).map(|i| from + i)
}

/// The first index at or after `from` holding `needle`.
#[inline]
pub fn find_byte(bytes: &[u8], from: usize, needle: u8) -> Option<usize> {
    const LOW: u64 = 0x0101_0101_0101_0101;
    const HIGH: u64 = 0x8080_8080_8080_8080;
    let repeated = LOW * u64::from(needle);
    let mut i = from.min(bytes.len());
    // Eight bytes at a time: a byte equal to the needle becomes zero, and the
    // lowest flagged byte (little-endian) is the first zero; flags above a
    // real zero can be false, never below it.
    while i + 8 <= bytes.len() {
        let word = u64::from_le_bytes(bytes[i..i + 8].try_into().expect("eight bytes")) ^ repeated;
        let zero = word.wrapping_sub(LOW) & !word & HIGH;
        if zero != 0 {
            return Some(i + (zero.trailing_zeros() / 8) as usize);
        }
        i += 8;
    }
    bytes[i..].iter().position(|&b| b == needle).map(|at| i + at)
}

/// Splits on `\n` exactly like `str::split('\n')`.
pub fn lines(text: &str) -> Vec<&str> {
    let bytes = text.as_bytes();
    let mut lines = Vec::with_capacity(bytes.len() / 32 + 1);
    let mut start = 0;
    while let Some(end) = find_byte(bytes, start, b'\n') {
        lines.push(&text[start..end]);
        start = end + 1;
    }
    lines.push(&text[start..]);
    lines
}

const LO: u64 = 0x0101_0101_0101_0101;
const HI: u64 = 0x8080_8080_8080_8080;

/// Per byte of `word`, the high bit set where it equals `needle`. Only the
/// lowest set bit is exact (a borrow can mark bytes above a match), which is
/// all a search needs.
#[inline(always)]
fn equal_bytes(word: u64, needle: u8) -> u64 {
    let x = word ^ (LO * needle as u64);
    x.wrapping_sub(LO) & !x & HI
}

/// The first index at or after `from` holding any of four bytes, eight bytes
/// at a time (`escapeHtml`'s `&<>"`).
#[inline]
pub fn find_any4(bytes: &[u8], from: usize, needles: [u8; 4]) -> Option<usize> {
    let mut at = from;
    while at + 8 <= bytes.len() {
        let word = u64::from_le_bytes(bytes[at..at + 8].try_into().expect("eight bytes"));
        let hits = equal_bytes(word, needles[0]) | equal_bytes(word, needles[1]) | equal_bytes(word, needles[2]) | equal_bytes(word, needles[3]);
        if hits != 0 {
            return Some(at + (hits.trailing_zeros() / 8) as usize);
        }
        at += 8;
    }
    bytes[at.min(bytes.len())..].iter().position(|b| needles.contains(b)).map(|i| at + i)
}

/// The first index at or after `from` holding any of `N` bytes, eight bytes
/// at a time.
#[inline]
pub fn find_any_n<const N: usize>(bytes: &[u8], from: usize, needles: [u8; N]) -> Option<usize> {
    let mut at = from;
    while at + 8 <= bytes.len() {
        let word = u64::from_le_bytes(bytes[at..at + 8].try_into().expect("eight bytes"));
        let mut hits = 0;
        for needle in needles {
            hits |= equal_bytes(word, needle);
        }
        if hits != 0 {
            return Some(at + (hits.trailing_zeros() / 8) as usize);
        }
        at += 8;
    }
    bytes[at.min(bytes.len())..].iter().position(|b| needles.contains(b)).map(|i| at + i)
}

/// The first index at or after `from` holding `\n`, `&`, `<`, `>` or `"`
/// (what code content stops at). Three tests a word cover the five: `<` and
/// `>` differ only in bit 1, `"` and `&` only in bit 2, so setting that bit
/// first makes each pair one byte value. In each test only the lowest flagged
/// byte is exact, so the lowest across the three is a real match.
#[inline]
pub fn find_code_special(bytes: &[u8], from: usize) -> Option<usize> {
    let mut at = from.min(bytes.len());
    while at + 8 <= bytes.len() {
        let word = u64::from_le_bytes(bytes[at..at + 8].try_into().expect("eight bytes"));
        let hits = equal_bytes(word, b'\n') | equal_bytes(word | (LO * 0x02), b'>') | equal_bytes(word | (LO * 0x04), b'&');
        if hits != 0 {
            return Some(at + (hits.trailing_zeros() / 8) as usize);
        }
        at += 8;
    }
    bytes[at..].iter().position(|&c| matches!(c, b'\n' | b'&' | b'<' | b'>' | b'"')).map(|i| at + i)
}

#[cfg(test)]
mod tests {
    use super::find_byte;

    #[test]
    fn find_code_special_matches_a_plain_search() {
        // Every byte value at every position, with a second special after it.
        let special = |c: u8| matches!(c, b'\n' | b'&' | b'<' | b'>' | b'"');
        for len in 0..20usize {
            for value in 0..=255u8 {
                for at in 0..len {
                    for filler in [b'a', b'=', 0x3d, 0x3f, 0x24, 0x27, 0x0b, 0xff] {
                        let mut bytes = vec![filler; len];
                        bytes[at] = value;
                        if at + 2 < len {
                            bytes[at + 2] = b'<';
                        }
                        for from in [0, at.saturating_sub(1), at] {
                            let expected = bytes[from..].iter().position(|&c| special(c)).map(|i| from + i);
                            assert_eq!(super::find_code_special(&bytes, from), expected, "{bytes:?} from {from}");
                        }
                    }
                }
            }
        }
    }

    #[test]
    fn find_byte_matches_a_plain_search() {
        // Every start offset, needle position and needle value next to bytes
        // one above and below it (where the eight-byte trick could misfire).
        for len in 0..40usize {
            for needle in [0u8, 1, b'\n', b'[', 0x7f, 0x80, 0xff] {
                for at in 0..=len {
                    let mut bytes: Vec<u8> = (0..len).map(|i| needle.wrapping_add(if i % 2 == 0 { 1 } else { 255 })).collect();
                    if at < len {
                        bytes[at] = needle;
                        if at + 3 < len {
                            bytes[at + 3] = needle;
                        }
                    }
                    for from in 0..=len + 1 {
                        let expected = bytes.get(from.min(len)..).and_then(|rest| rest.iter().position(|&b| b == needle)).map(|i| from.min(len) + i);
                        assert_eq!(find_byte(&bytes, from, needle), expected, "len {len} needle {needle} at {at} from {from}");
                    }
                }
            }
        }
    }
}
