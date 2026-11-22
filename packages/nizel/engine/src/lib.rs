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

pub mod ast;
pub mod backtrack;
pub mod block;
pub mod common;
pub mod emphasis;
pub mod html;
pub mod inline;
pub mod js;
pub mod jsnum;
pub mod links;
pub mod refs;
pub mod render;
pub mod reverse;
pub mod slug;
pub mod status;
pub mod unicode;

use std::cell::RefCell;

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
}

#[unsafe(no_mangle)]
pub extern "C" fn input(len: usize) -> *mut u8 {
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

#[unsafe(no_mangle)]
pub extern "C" fn reverse(len: usize, flags: u32) -> i32 {
    convert(len, |source, out| reverse_html(source, flags, out))
}

fn convert(len: usize, run: impl FnOnce(&str, &mut String) -> Result<(), i32>) -> i32 {
    INPUT.with(|input| {
        let input = input.borrow();
        let Ok(source) = std::str::from_utf8(&input[..len.min(input.len())]) else {
            return status::INVALID_UTF8;
        };
        let mut out = String::with_capacity(source.len() + source.len() / 4 + 16);
        if let Err(code) = run(source, &mut out) {
            return code;
        }
        OUTPUT.with(|output| {
            let mut output = output.borrow_mut();
            output.clear();
            output.extend_from_slice(out.as_bytes());
            output.len() as i32
        })
    })
}

/// Markdown → HTML. Mirrors `renderHtml(parseMarkdown(source, options))`.
pub fn render_markdown(source: &str, flags: u32, out: &mut String) -> Result<(), i32> {
    let options = block::Options {
        anchors: flags & flags::ANCHORS != 0,
        autolinks: flags & flags::AUTOLINKS != 0,
        safe: flags & flags::SAFE != 0,
        slug_classic: flags & flags::SLUG_CLASSIC != 0,
    };
    let blocks = block::parse_markdown(source, &options)?;
    render::render_blocks(&blocks, out);
    Ok(())
}

/// HTML → Markdown. Mirrors `htmlToMarkdown(source)`.
pub fn reverse_html(source: &str, flags: u32, out: &mut String) -> Result<(), i32> {
    let options = reverse::ReverseOptions { preserve: flags & flags::DROP_UNSUPPORTED == 0 };
    out.push_str(&reverse::html_to_markdown(source, &options)?);
    Ok(())
}
