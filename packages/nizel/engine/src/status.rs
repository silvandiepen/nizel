//! Negative return codes. Every one of these makes JavaScript fall back.

/// The input bytes were not valid UTF-8 (JavaScript always encodes valid UTF-8).
pub const INVALID_UTF8: i32 = -2;
/// The host must step in: a decoded character collides with the block lone
/// surrogates travel in (the host retries in another block), or a plugin
/// handler gave up on a claimed element.
pub const NEEDS_JAVASCRIPT: i32 = -3;
/// The JavaScript throws here (`String.fromCodePoint` on an out-of-range
/// entity); `thrown_code_point` holds the value it throws for.
pub const THROWS: i32 = -4;
