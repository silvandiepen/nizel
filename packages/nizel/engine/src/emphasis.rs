//! `resolveRemainingEmphasis` and its helpers from `parse/emphasis.ts`.
//!
//! "Character" in the JavaScript is one UTF-16 unit: next to an astral
//! character it sees a lone surrogate, which is neither whitespace nor
//! punctuation. `Unit` reproduces that.

use crate::ast::Inline;
use crate::js;
use crate::unicode::{in_table, PUNCTUATION};

#[derive(Clone, Copy, PartialEq)]
enum Unit {
    /// `''`: no character.
    None,
    /// A BMP character.
    Char(char),
    /// Half of a surrogate pair.
    Surrogate,
}

impl Unit {
    fn first_of(text: &str) -> Unit {
        text.chars().next().map_or(Unit::None, Unit::of)
    }

    fn last_of(text: &str) -> Unit {
        text.chars().next_back().map_or(Unit::None, Unit::of)
    }

    fn of(c: char) -> Unit {
        if c.len_utf16() == 2 { Unit::Surrogate } else { Unit::Char(c) }
    }

    fn is_whitespace(self) -> bool {
        matches!(self, Unit::Char(c) if js::is_space(c))
    }

    fn is_punctuation(self) -> bool {
        matches!(self, Unit::Char(c) if in_table(PUNCTUATION, c))
    }
}

enum Token {
    Node(Inline),
    Delimiter { ch: u8, open: bool, close: bool, length: usize },
}

pub fn resolve_remaining_emphasis(nodes: Vec<Inline>) -> Vec<Inline> {
    // Without a delimiter in unescaped text, resolving only merges adjacent
    // text (dropping `escaped`), exactly as `inlineTokensToNodes` does.
    let has_delimiter = nodes.iter().any(|node| matches!(node, Inline::Text { value, escaped: false } if value.bytes().any(|b| b == b'*' || b == b'_')));
    if !has_delimiter {
        return merge_text(nodes);
    }
    let mut tokens = tokenize(nodes);
    let mut close_index = 0;
    'closers: while close_index < tokens.len() {
        let Token::Delimiter { ch: close_ch, open: close_open, close: true, length: close_length } = tokens[close_index] else {
            close_index += 1;
            continue;
        };
        if close_length == 0 {
            close_index += 1;
            continue;
        }
        for open_index in (0..close_index).rev() {
            let Token::Delimiter { ch, open: true, close: open_close, length: open_length } = tokens[open_index] else { continue };
            if ch != close_ch || open_length == 0 {
                continue;
            }
            if is_forbidden_match(open_close, open_length, close_open, close_length) {
                continue;
            }
            let size = if open_length >= 2 && close_length >= 2 { 2 } else { 1 };
            let inner: Vec<Token> = tokens.drain(open_index + 1..close_index).collect();
            let children = resolve_remaining_emphasis(tokens_to_nodes(inner));
            let wrapped = if size == 2 { Inline::Strong { children } } else { Inline::Emphasis { children } };

            // tokens[open_index] is the opener, tokens[open_index + 1] the closer.
            let mut replacement = Vec::with_capacity(3);
            if open_length > size {
                replacement.push(Token::Delimiter { ch, open: true, close: open_close, length: open_length - size });
            }
            replacement.push(Token::Node(wrapped));
            if close_length > size {
                replacement.push(Token::Delimiter { ch, open: close_open, close: true, length: close_length - size });
            }
            tokens.splice(open_index..open_index + 2, replacement);
            close_index = open_index;
            continue 'closers;
        }
        close_index += 1;
    }
    tokens_to_nodes(tokens)
}

/// `isForbiddenDelimiterMatch` (same character already checked).
fn is_forbidden_match(opener_close: bool, opener_length: usize, closer_open: bool, closer_length: usize) -> bool {
    if !(opener_close || closer_open) {
        return false;
    }
    (opener_length + closer_length) % 3 == 0 && opener_length % 3 != 0 && closer_length % 3 != 0
}

/// `tokenizeEmphasisDelimiters`. Nodes are moved into the tokens; the
/// lookahead past a node's end reads the nodes not yet moved.
fn tokenize(nodes: Vec<Inline>) -> Vec<Token> {
    let mut slots: Vec<Option<Inline>> = nodes.into_iter().map(Some).collect();
    let mut tokens = Vec::with_capacity(slots.len() * 2);
    for node_index in 0..slots.len() {
        let node = slots[node_index].take().expect("each node is taken once");
        let value = match node {
            Inline::Text { value, escaped: false } if value.bytes().any(|b| b == b'*' || b == b'_') => value,
            other => {
                tokens.push(Token::Node(other));
                continue;
            }
        };
        let bytes = value.as_bytes();
        let mut cursor = 0;
        while cursor < bytes.len() {
            let ch = bytes[cursor];
            if ch != b'*' && ch != b'_' {
                let next = bytes[cursor + 1..].iter().position(|&b| b == b'*' || b == b'_').map_or(bytes.len(), |p| cursor + 1 + p);
                tokens.push(Token::Node(Inline::text(&value[cursor..next])));
                cursor = next;
                continue;
            }
            let run_start = cursor;
            while cursor < bytes.len() && bytes[cursor] == ch {
                cursor += 1;
            }
            let before = previous_character(&tokens);
            let after = if cursor < bytes.len() {
                Unit::first_of(&value[cursor..])
            } else {
                slots[node_index + 1..].iter().flatten().map(first_inline_character).find(|u| *u != Unit::None).unwrap_or(Unit::None)
            };
            let (open, close) = classify(ch, before, after);
            tokens.push(Token::Delimiter { ch, open, close, length: cursor - run_start });
        }
    }
    tokens
}

fn next_inline_character(nodes: &[Inline]) -> Unit {
    nodes.iter().map(first_inline_character).find(|unit| *unit != Unit::None).unwrap_or(Unit::None)
}

fn first_inline_character(node: &Inline) -> Unit {
    match node {
        Inline::Text { value, .. } => Unit::first_of(value),
        Inline::LineBreak { .. } => Unit::Char('\n'),
        Inline::InlineCode { code } => Unit::first_of(code),
        Inline::Image { alt, .. } => Unit::first_of(alt),
        Inline::InlineHtml { .. } => Unit::None,
        other => next_inline_character(other.children().unwrap_or(&[])),
    }
}

fn previous_character(tokens: &[Token]) -> Unit {
    for token in tokens.iter().rev() {
        match token {
            Token::Delimiter { ch, length, .. } if *length > 0 => return Unit::Char(*ch as char),
            Token::Delimiter { .. } => {}
            Token::Node(node) => {
                let unit = last_inline_character(node);
                if unit != Unit::None {
                    return unit;
                }
            }
        }
    }
    Unit::None
}

fn last_inline_character(node: &Inline) -> Unit {
    match node {
        Inline::Text { value, .. } => Unit::last_of(value),
        Inline::LineBreak { .. } => Unit::Char('\n'),
        Inline::InlineCode { code } => Unit::last_of(code),
        Inline::Image { alt, .. } => Unit::last_of(alt),
        Inline::InlineHtml { .. } => Unit::None,
        other => other.children().unwrap_or(&[]).iter().rev().map(last_inline_character).find(|u| *u != Unit::None).unwrap_or(Unit::None),
    }
}

/// `classifyDelimiterRun`.
fn classify(ch: u8, before: Unit, after: Unit) -> (bool, bool) {
    let before_whitespace = before == Unit::None || before.is_whitespace();
    let after_whitespace = after == Unit::None || after.is_whitespace();
    let before_punctuation = before.is_punctuation();
    let after_punctuation = after.is_punctuation();
    let left = !after_whitespace && (!after_punctuation || before_whitespace || before_punctuation);
    let right = !before_whitespace && (!before_punctuation || after_whitespace || after_punctuation);
    if ch == b'_' {
        (left && (!right || before_punctuation), right && (!left || after_punctuation))
    } else {
        (left, right)
    }
}

/// `inlineTokensToNodes`: delimiters become text, adjacent text merges, and
/// merged text loses its `escaped` mark.
fn tokens_to_nodes(tokens: Vec<Token>) -> Vec<Inline> {
    let mut nodes: Vec<Inline> = Vec::with_capacity(tokens.len());
    for token in tokens {
        match token {
            Token::Delimiter { length: 0, .. } => {}
            Token::Delimiter { ch, length, .. } => match nodes.last_mut() {
                Some(Inline::Text { value, .. }) => value.extend(std::iter::repeat_n(ch as char, length)),
                _ => nodes.push(Inline::text((ch as char).to_string().repeat(length))),
            },
            Token::Node(Inline::Text { value, .. }) => append_owned_text(&mut nodes, value),
            Token::Node(node) => nodes.push(node),
        }
    }
    nodes
}

/// `inlineTokensToNodes` over nodes alone: adjacent text merges, `escaped` drops.
fn merge_text(nodes: Vec<Inline>) -> Vec<Inline> {
    let mut merged: Vec<Inline> = Vec::with_capacity(nodes.len());
    for node in nodes {
        match node {
            Inline::Text { value, .. } => append_owned_text(&mut merged, value),
            other => merged.push(other),
        }
    }
    merged
}

/// `appendTextNode` for an owned value: reuse it when it starts a new node.
fn append_owned_text(nodes: &mut Vec<Inline>, value: String) {
    if value.is_empty() {
        return;
    }
    if let Some(Inline::Text { value: previous, .. }) = nodes.last_mut() {
        previous.push_str(&value);
        return;
    }
    nodes.push(Inline::Text { value, escaped: false });
}

