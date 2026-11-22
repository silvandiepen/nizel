//! Negative return codes. Every one of these makes JavaScript fall back.

/// The input uses something the port does not cover yet.
pub const UNSUPPORTED: i32 = -1;
/// The input bytes were not valid UTF-8 (JavaScript always encodes valid UTF-8).
pub const INVALID_UTF8: i32 = -2;
/// The JavaScript throws or produces a lone surrogate here, neither of
/// which crosses as UTF-8; the caller lets JavaScript produce it.
pub const NEEDS_JAVASCRIPT: i32 = -3;
