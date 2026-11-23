//! Byte scans used on every document, 16 bytes at a time with Wasm SIMD
//! (`simd128`), with a scalar version for native builds.

/// The first index at or after `from` whose byte is in `table`.
#[inline]
pub fn find_in_table(bytes: &[u8], from: usize, table: &[bool; 256], needles: &[u8]) -> Option<usize> {
    #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
    {
        simd::find_any(bytes, from, table, needles)
    }
    #[cfg(not(all(target_arch = "wasm32", target_feature = "simd128")))]
    {
        let _ = needles;
        bytes[from.min(bytes.len())..].iter().position(|&b| table[b as usize]).map(|i| from + i)
    }
}

/// The first index at or after `from` holding `needle`.
#[inline]
pub fn find_byte(bytes: &[u8], from: usize, needle: u8) -> Option<usize> {
    #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
    {
        simd::find_one(bytes, from, needle)
    }
    #[cfg(not(all(target_arch = "wasm32", target_feature = "simd128")))]
    {
        bytes[from.min(bytes.len())..].iter().position(|&b| b == needle).map(|i| from + i)
    }
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

#[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
mod simd {
    use core::arch::wasm32::*;

    #[inline]
    fn load(bytes: &[u8], at: usize) -> v128 {
        // Bounds are checked by the callers (at + 16 <= len).
        unsafe { v128_load(bytes.as_ptr().add(at) as *const v128) }
    }

    pub fn find_one(bytes: &[u8], from: usize, needle: u8) -> Option<usize> {
        let mut at = from;
        let splat = u8x16_splat(needle);
        while at + 16 <= bytes.len() {
            let mask = u8x16_bitmask(u8x16_eq(load(bytes, at), splat));
            if mask != 0 {
                return Some(at + mask.trailing_zeros() as usize);
            }
            at += 16;
        }
        bytes[at.min(bytes.len())..].iter().position(|&b| b == needle).map(|i| at + i)
    }

    /// `needles` lists the bytes of `table` (at most 16); the vector loop
    /// compares against each, the tail uses the table.
    pub fn find_any(bytes: &[u8], from: usize, table: &[bool; 256], needles: &[u8]) -> Option<usize> {
        let mut at = from;
        if needles.len() <= 16 {
            let mut splats = [u8x16_splat(0); 16];
            for (slot, &n) in splats.iter_mut().zip(needles) {
                *slot = u8x16_splat(n);
            }
            let splats = &splats[..needles.len()];
            while at + 16 <= bytes.len() {
                let chunk = load(bytes, at);
                let mut hit = u8x16_eq(chunk, splats[0]);
                for &s in &splats[1..] {
                    hit = v128_or(hit, u8x16_eq(chunk, s));
                }
                let mask = u8x16_bitmask(hit);
                if mask != 0 {
                    return Some(at + mask.trailing_zeros() as usize);
                }
                at += 16;
            }
        }
        bytes[at.min(bytes.len())..].iter().position(|&b| table[b as usize]).map(|i| at + i)
    }
}
