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
        Block::Html { value } => out.push_str(value),
    }
}

fn render_inline(nodes: &[Inline], out: &mut String) {
    for node in nodes {
        match node {
            Inline::Text { value, .. } => escape_html_into(out, value),
            Inline::InlineHtml { value } => out.push_str(value),
            Inline::LineBreak { hard: true } => out.push_str("<br />\n"),
            Inline::LineBreak { hard: false } => out.push('\n'),
            Inline::InlineCode { code } => {
                out.push_str("<code>");
                escape_html_into(out, code);
                out.push_str("</code>");
            }
            Inline::Strong { children } => wrap(out, "strong", children),
            Inline::Emphasis { children } => wrap(out, "em", children),
            Inline::Delete { children } => wrap(out, "del", children),
            Inline::Image { src, alt, title } => {
                out.push_str("<img");
                attr(out, "src", src);
                attr(out, "alt", alt);
                if let Some(title) = title {
                    attr(out, "title", title);
                }
                out.push_str(" />");
            }
            Inline::Link { href, title, children } => {
                out.push_str("<a");
                // `node.href?.toLowerCase().trim().startsWith('javascript:')` drops the href.
                if !crate::js::trim(&href.to_lowercase()).starts_with("javascript:") {
                    out.push_str(" href=\"");
                    escape_html_into(out, href);
                    out.push('"');
                }
                if let Some(title) = title {
                    out.push_str(" title=\"");
                    escape_html_into(out, title);
                    out.push('"');
                }
                out.push('>');
                render_inline(children, out);
                out.push_str("</a>");
            }
        }
    }
}

fn attr(out: &mut String, name: &str, value: &str) {
    out.push(' ');
    out.push_str(name);
    out.push_str("=\"");
    escape_html_into(out, value);
    out.push('"');
}

fn wrap(out: &mut String, tag: &str, children: &[Inline]) {
    out.push('<');
    out.push_str(tag);
    out.push('>');
    render_inline(children, out);
    out.push_str("</");
    out.push_str(tag);
    out.push('>');
}
