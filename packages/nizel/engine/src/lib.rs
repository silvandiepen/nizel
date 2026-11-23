//! Nizel's Markdown engine, compiled to WebAssembly.
//!
//! A behaviour-for-behaviour port of the JavaScript engine in
//! `packages/nizel/src`: the JavaScript output is the specification, so
//! every function here mirrors the TypeScript function it is named after.
//!
//! Interface (linear memory, no bindings):
//! - `input(len)` reserves `len` bytes and returns where JavaScript writes
//!   the UTF-8 source.
//! - `render(len, flags)` / `reverse(len, flags)` convert that input and
//!   return the output length, or a negative status when the engine cannot
//!   produce JavaScript's exact output for it yet.
//! - `output()` returns where the output bytes start.

pub mod arena;
pub mod ast;
pub mod backtrack;
pub mod block;
pub mod codec;
pub mod common;
pub mod emphasis;
pub mod host;
pub mod html;
pub mod inline;
pub mod js;
pub mod jsnum;
pub mod links;
pub mod refs;
pub mod render;
pub mod scan;
pub mod reverse;
pub mod slug;
pub mod status;
pub mod unicode;

use std::cell::RefCell;

#[cfg(target_arch = "wasm32")]
#[global_allocator]
static ALLOCATOR: arena::Arena = arena::Arena::new();

/// Starts a conversion: its allocations come from the per-call arena.
fn arena_begin() {
    #[cfg(target_arch = "wasm32")]
    ALLOCATOR.begin();
}

/// Ends a conversion: what is allocated next outlives the call.
fn arena_end() {
    #[cfg(target_arch = "wasm32")]
    ALLOCATOR.end();
}

/// Copies a finished result into the output buffer, which outlives the call.
fn publish(bytes: &[u8]) -> i32 {
    OUTPUT.with(|output| {
        let mut output = output.borrow_mut();
        output.clear();
        output.extend_from_slice(bytes);
        output.len() as i32
    })
}

thread_local! {
    static INPUT: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
    static OUTPUT: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
}

/// Option bits shared with `src/wasm/backend.ts`.
pub mod flags {
    pub const ANCHORS: u32 = 1;
    pub const AUTOLINKS: u32 = 2;
    pub const SAFE: u32 = 4;
    pub const SLUG_CLASSIC: u32 = 8;
    /// `htmlToMarkdown({ unsupported: 'drop' })`.
    pub const DROP_UNSUPPORTED: u32 = 16;
    /// Offer elements to JavaScript handlers: the input holds the tags to
    /// offer separated by newlines, then a NUL, then the source.
    pub const HANDLERS: u32 = 32;
    /// A handler without declared tags: offer every element.
    pub const HANDLERS_ALL: u32 = 64;
}

#[unsafe(no_mangle)]
pub extern "C" fn input(len: usize) -> *mut u8 {
    arena_end();
    INPUT.with(|buffer| {
        let mut buffer = buffer.borrow_mut();
        buffer.clear();
        buffer.resize(len, 0);
        buffer.as_mut_ptr()
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn output() -> *const u8 {
    OUTPUT.with(|buffer| buffer.borrow().as_ptr())
}

#[unsafe(no_mangle)]
pub extern "C" fn render(len: usize, flags: u32) -> i32 {
    convert(len, |source, out| render_markdown(source, flags, out))
}

/// Markdown → binary AST (`codec.rs`), for documents whose plugins,
/// transforms, element rules or block definitions run in JavaScript.
#[unsafe(no_mangle)]
pub extern "C" fn parse(len: usize, flags: u32) -> i32 {
    arena_begin();
    let result = INPUT.with(|input| {
        let input = input.borrow();
        let source = std::str::from_utf8(&input[..len.min(input.len())]).map_err(|_| status::INVALID_UTF8)?;
        block::parse_markdown(source, &parse_options(flags)).map(|blocks| codec::encode(&blocks))
    });
    arena_end();
    match result {
        Ok(bytes) => publish(&bytes),
        Err(code) => code,
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn reverse(len: usize, flags: u32) -> i32 {
    convert(len, |input, out| {
        let (tags, source) = match input.split_once('\0') {
            Some((tags, source)) if flags & flags::HANDLERS != 0 => (tags, source),
            _ => ("", input),
        };
        let claim = (flags & flags::HANDLERS != 0).then(|| reverse::Claim {
            all: flags & flags::HANDLERS_ALL != 0,
            tags: tags.split('\n').filter(|t| !t.is_empty()).map(str::to_string).collect(),
        });
        let options = reverse::ReverseOptions { preserve: flags & flags::DROP_UNSUPPORTED == 0, claim };
        out.push_str(&reverse::html_to_markdown(source, &options)?);
        Ok(())
    })
}

fn convert(len: usize, run: impl FnOnce(&str, &mut String) -> Result<(), i32>) -> i32 {
    arena_begin();
    let result = INPUT.with(|input| {
        let input = input.borrow();
        let source = std::str::from_utf8(&input[..len.min(input.len())]).map_err(|_| status::INVALID_UTF8)?;
        let mut out = String::with_capacity(source.len() + source.len() / 4 + 16);
        run(source, &mut out).map(|()| out)
    });
    arena_end();
    match result {
        Ok(out) => publish(out.as_bytes()),
        Err(code) => code,
    }
}

fn parse_options(flags: u32) -> block::Options {
    block::Options {
        anchors: flags & flags::ANCHORS != 0,
        autolinks: flags & flags::AUTOLINKS != 0,
        safe: flags & flags::SAFE != 0,
        slug_classic: flags & flags::SLUG_CLASSIC != 0,
    }
}

/// Markdown → HTML. Mirrors `renderHtml(parseMarkdown(source, options))`.
pub fn render_markdown(source: &str, flags: u32, out: &mut String) -> Result<(), i32> {
    let blocks = block::parse_markdown(source, &parse_options(flags))?;
    render::render_blocks(&blocks, out);
    Ok(())
}

/// HTML → Markdown. Mirrors `htmlToMarkdown(source)`.
pub fn reverse_html(source: &str, flags: u32, out: &mut String) -> Result<(), i32> {
    let options = reverse::ReverseOptions { preserve: flags & flags::DROP_UNSUPPORTED == 0, claim: None };
    out.push_str(&reverse::html_to_markdown(source, &options)?);
    Ok(())
}
