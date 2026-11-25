//! A fast, non-cryptographic hasher for the engine's maps and sets.
//!
//! On `wasm32-unknown-unknown` the standard `RandomState` has no source of
//! randomness, so SipHash runs with fixed keys there: it costs more than
//! the lookups it guards and resists no crafted input either.

use std::hash::{BuildHasherDefault, Hasher};

#[derive(Default)]
pub struct FastHasher(u64);

pub type FastBuild = BuildHasherDefault<FastHasher>;

const K: u64 = 0x9e37_79b9_7f4a_7c15;

impl FastHasher {
    #[inline]
    fn add(&mut self, word: u64) {
        let mixed = (self.0 ^ word).wrapping_mul(K);
        self.0 = mixed ^ (mixed >> 29);
    }
}

impl Hasher for FastHasher {
    #[inline]
    fn finish(&self) -> u64 {
        let h = self.0.wrapping_mul(K);
        h ^ (h >> 32)
    }

    fn write(&mut self, bytes: &[u8]) {
        let mut chunks = bytes.chunks_exact(8);
        for chunk in &mut chunks {
            self.add(u64::from_le_bytes(chunk.try_into().expect("eight bytes")));
        }
        let rest = chunks.remainder();
        if !rest.is_empty() {
            let mut word = [0u8; 8];
            word[..rest.len()].copy_from_slice(rest);
            self.add(u64::from_le_bytes(word) ^ ((rest.len() as u64) << 59));
        }
    }

    #[inline]
    fn write_u8(&mut self, n: u8) {
        self.add(u64::from(n));
    }

    #[inline]
    fn write_usize(&mut self, n: usize) {
        self.add(n as u64);
    }

    #[inline]
    fn write_u64(&mut self, n: u64) {
        self.add(n);
    }
}
