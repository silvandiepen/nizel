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
        Block::Code { code, lang, filename, highlight_lines } => {
            out.push_str("<pre><code");
            if let Some(lang) = lang.as_deref().filter(|l| !l.is_empty()) {
                attr(out, "class", &format!("language-{lang}"));
            }
            if let Some(filename) = filename {
                attr(out, "data-filename", filename);
            }
            if let Some(lines) = highlight_lines {
                let joined: Vec<String> = lines.iter().map(|&n| crate::jsnum::to_string(n)).collect();
                attr(out, "data-highlight-lines", &joined.join(","));
            }
            out.push('>');
            escape_html_into(out, code);
            out.push_str("</code></pre>");
        }
        Block::Table { align, rows } => {
            out.push_str("<table>");
            let row = |out: &mut String, cells: &[Vec<Inline>], tag: &str| {
                out.push_str("<tr>");
                for (index, cell) in cells.iter().enumerate() {
                    out.push('<');
                    out.push_str(tag);
                    if let Some(Some(value)) = align.get(index) {
                        attr(out, "align", value);
                    }
                    out.push('>');
                    render_inline(cell, out);
                    out.push_str("</");
                    out.push_str(tag);
                    out.push('>');
                }
                out.push_str("</tr>");
            };
            if let Some(header) = rows.first() {
                out.push_str("<thead>");
                row(out, header, "th");
                out.push_str("</thead>");
            }
            out.push_str("<tbody>");
            for body in rows.iter().skip(1) {
                row(out, body, "td");
            }
            out.push_str("</tbody></table>");
        }
        Block::CustomBlock { name, children } => {
            out.push_str("<div");
            attr(out, "data-nizel-block", name);
            out.push('>');
            render_blocks(children, out);
            out.push_str("</div>");
        }
        Block::Blockquote { children } => {
            out.push_str("<blockquote>\n");
            if !children.is_empty() {
                render_blocks(children, out);
                out.push('\n');
            }
            out.push_str("</blockquote>");
        }
        Block::List { ordered, start, tight, items } => {
            let tag = if *ordered { "ol" } else { "ul" };
            out.push('<');
            out.push_str(tag);
            if let Some(start) = start.filter(|&n| n != 1) {
                attr(out, "start", &start.to_string());
            }
            out.push_str(">\n");
            for (index, item) in items.iter().enumerate() {
                if index > 0 {
                    out.push('\n');
                }
                out.push_str("<li");
                if item.checked == Some(true) {
                    out.push_str(" data-checked");
                }
                out.push('>');
                render_list_item_children(&item.children, *tight, out);
                out.push_str("</li>");
            }
            out.push_str("\n</");
            out.push_str(tag);
            out.push('>');
        }
    }
}

/// `renderListItemChildrenFast`.
fn render_list_item_children(children: &[Block], tight: bool, out: &mut String) {
    if children.is_empty() {
        return;
    }
    if !tight {
        out.push('\n');
        render_blocks(children, out);
        out.push('\n');
        return;
    }
    let has_block_child = children.iter().any(|c| !matches!(c, Block::Paragraph { .. }));
    let mut body = String::new();
    for (index, child) in children.iter().enumerate() {
        if index > 0 {
            body.push('\n');
        }
        match child {
            Block::Paragraph { children } => render_inline(children, &mut body),
            other => render_block(other, &mut body),
        }
    }
    let last_paragraph = matches!(children.last(), Some(Block::Paragraph { .. }));
    let first_paragraph = matches!(children.first(), Some(Block::Paragraph { .. }));
    if !has_block_child {
        out.push_str(&body);
    } else if last_paragraph {
        out.push('\n');
        out.push_str(&body);
    } else if first_paragraph {
        out.push_str(&body);
        out.push('\n');
    } else {
        out.push('\n');
        out.push_str(&body);
        out.push('\n');
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
