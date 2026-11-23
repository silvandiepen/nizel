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
