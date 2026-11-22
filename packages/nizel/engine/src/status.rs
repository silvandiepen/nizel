//! Negative return codes. Every one of these makes JavaScript fall back.

/// The input uses something the port does not cover yet.
pub const UNSUPPORTED: i32 = -1;
/// The input bytes were not valid UTF-8 (JavaScript always encodes valid UTF-8).
pub const INVALID_UTF8: i32 = -2;
