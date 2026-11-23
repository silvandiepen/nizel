//! Calls into JavaScript: plugin handlers for HTML-to-Markdown.

use crate::status;
use std::cell::RefCell;

thread_local! {
    static CALLBACK: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
}

#[cfg(target_arch = "wasm32")]
#[link(wasm_import_module = "env")]
unsafe extern "C" {
    /// Offers a serialized element to the handlers. Returns the length of
    /// their Markdown (written through `callback`), -1 when no handler claims
    /// it, or -2 when JavaScript must convert the whole document.
    #[link_name = "claim"]
    fn host_claim(ptr: *const u8, len: usize) -> i32;
}

#[cfg(not(target_arch = "wasm32"))]
unsafe fn host_claim(_ptr: *const u8, _len: usize) -> i32 {
    -1
}

/// Reserves `len` bytes for a handler's result and returns where JavaScript writes it.
#[unsafe(no_mangle)]
pub extern "C" fn callback(len: usize) -> *mut u8 {
    CALLBACK.with(|buffer| {
        let mut buffer = buffer.borrow_mut();
        buffer.clear();
        buffer.resize(len, 0);
        buffer.as_mut_ptr()
    })
}

pub fn claim(bytes: &[u8]) -> Result<Option<String>, i32> {
    let length = unsafe { host_claim(bytes.as_ptr(), bytes.len()) };
    match length {
        -1 => Ok(None),
        n if n < 0 => Err(status::NEEDS_JAVASCRIPT),
        n => CALLBACK.with(|buffer| {
            let buffer = buffer.borrow();
            std::str::from_utf8(&buffer[..n as usize]).map(|s| Some(s.to_string())).map_err(|_| status::INVALID_UTF8)
        }),
    }
}
