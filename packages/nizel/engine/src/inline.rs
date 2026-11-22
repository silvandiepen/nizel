//! `parseInlineWithState` from `parse/inline.ts`.

use crate::ast::Inline;
use crate::block::Options;
use crate::status::UNSUPPORTED;

/// Only the no-syntax fast path is ported so far: anything that would reach
/// the tokenizer or emphasis resolution is declined.
pub fn parse_inline(source: &str, options: &Options) -> Result<Vec<Inline>, i32> {
    if !has_inline_syntax(source, options.autolinks) {
        return Ok(if source.is_empty() { Vec::new() } else { vec![Inline::Text { value: source.to_string() }] });
    }
    Err(UNSUPPORTED)
}

/// `hasInlineSyntax`.
fn has_inline_syntax(source: &str, autolinks: bool) -> bool {
    if source.is_empty() {
        return false;
    }
    if source.bytes().any(|b| matches!(b, b'\\' | b'`' | b'<' | b'&' | b'\n' | b'[' | b']' | b'*' | b'_' | b'~')) {
        return true;
    }
    autolinks && (source.contains("http://") || source.contains("https://") || source.contains('@'))
}
