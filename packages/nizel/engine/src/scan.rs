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
    bytes[from.min(bytes.len())..].iter().position(|&b| b == needle).map(|i| from + i)
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
