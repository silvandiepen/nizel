//! `renderHtml` from `render.ts` (the fast path: no element rules, no
//! custom block renderers, no standalone-image unwrapping).

use crate::ast::{Block, Inline};
use crate::js::escape_html_into;

pub fn render_blocks(blocks: &[Block], out: &mut String) {
    for (index, block) in blocks.iter().enumerate() {
        if index > 0 {
            out.push('\n');
        }
        render_block(block, out);
    }
}

fn render_block(block: &Block, out: &mut String) {
    match block {
        Block::Heading { depth, id, children } => {
            out.push_str("<h");
            out.push((b'0' + depth) as char);
            if let Some(id) = id {
                out.push_str(" id=\"");
                escape_html_into(out, id);
                out.push('"');
            }
            out.push('>');
            render_inline(children, out);
            out.push_str("</h");
            out.push((b'0' + depth) as char);
            out.push('>');
        }
        Block::Paragraph { children } => {
            out.push_str("<p>");
            render_inline(children, out);
            out.push_str("</p>");
        }
        Block::ThematicBreak => out.push_str("<hr />"),
    }
}

fn render_inline(nodes: &[Inline], out: &mut String) {
    for node in nodes {
        match node {
            Inline::Text { value } => escape_html_into(out, value),
        }
    }
}
