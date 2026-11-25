//! The AST in a compact binary form for `src/wasm/ast-codec.ts`, which
//! decodes it into exactly the objects `parseMarkdown` builds.
//!
//! Integers are little-endian u32, strings a u32 byte length then UTF-8,
//! optional values a 0/1 byte then the value, numbers f64.

use crate::ast::{Block, Inline, Prop};

pub fn encode(blocks: &[Block]) -> Vec<u8> {
    let mut out = Vec::with_capacity(4096);
    blocks_into(blocks, &mut out);
    out
}

fn u8(out: &mut Vec<u8>, v: u8) {
    out.push(v);
}

fn u32(out: &mut Vec<u8>, v: usize) {
    out.extend_from_slice(&(v as u32).to_le_bytes());
}

fn f64(out: &mut Vec<u8>, v: f64) {
    out.extend_from_slice(&v.to_le_bytes());
}

fn str(out: &mut Vec<u8>, v: &str) {
    u32(out, v.len());
    out.extend_from_slice(v.as_bytes());
}

fn opt_str(out: &mut Vec<u8>, v: &Option<String>) {
    match v {
        Some(v) => {
            u8(out, 1);
            str(out, v);
        }
        None => u8(out, 0),
    }
}

fn blocks_into(blocks: &[Block], out: &mut Vec<u8>) {
    u32(out, blocks.len());
    for block in blocks {
        match block {
            Block::Html { value } => {
                u8(out, 1);
                str(out, value);
            }
            Block::CustomBlock { name, args, props, content, children } => {
                u8(out, 2);
                str(out, name);
                u32(out, args.len());
                for arg in args {
                    str(out, arg);
                }
                u32(out, props.len());
                for (key, prop) in props {
                    str(out, key);
                    match prop {
                        Prop::Bool(true) => u8(out, 1),
                        Prop::Bool(false) => u8(out, 2),
                        Prop::Null => u8(out, 3),
                        Prop::Number(n) => {
                            u8(out, 4);
                            f64(out, *n);
                        }
                        Prop::Text(text) => {
                            u8(out, 5);
                            str(out, text);
                        }
                    }
                }
                str(out, content);
                blocks_into(children, out);
            }
            Block::Code { code, fenced: true, lang, meta, filename, highlight_lines } => {
                u8(out, 3);
                str(out, code);
                opt_str(out, lang);
                opt_str(out, meta);
                opt_str(out, filename);
                match highlight_lines {
                    Some(lines) => {
                        u8(out, 1);
                        u32(out, lines.len());
                        for line in lines {
                            f64(out, *line);
                        }
                    }
                    None => u8(out, 0),
                }
            }
            Block::Code { code, .. } => {
                u8(out, 4);
                str(out, code);
            }
            Block::ThematicBreak => u8(out, 5),
            Block::Heading { depth, id, children } => {
                u8(out, 6);
                u8(out, *depth);
                str(out, &crate::ast::strip_inline(children));
                opt_str(out, id);
                inlines_into(children, out);
            }
            Block::Table { align, rows } => {
                u8(out, 7);
                u32(out, align.len());
                for a in align {
                    u8(out, match a {
                        None => 0,
                        Some("left") => 1,
                        Some("center") => 2,
                        Some(_) => 3,
                    });
                }
                u32(out, rows.len());
                for row in rows {
                    u32(out, row.len());
                    for cell in row {
                        inlines_into(cell, out);
                    }
                }
            }
            Block::Blockquote { children } => {
                u8(out, 8);
                blocks_into(children, out);
            }
            Block::List { ordered, start, tight, items } => {
                u8(out, 9);
                u8(out, u8::from(*ordered));
                match start {
                    Some(n) => {
                        u8(out, 1);
                        f64(out, *n as f64);
                    }
                    None => u8(out, 0),
                }
                u8(out, u8::from(*tight));
                u32(out, items.len());
                for item in items {
                    u8(out, match item.checked {
                        None => 0,
                        Some(false) => 1,
                        Some(true) => 2,
                    });
                    blocks_into(&item.children, out);
                }
            }
            Block::Paragraph { children } => {
                u8(out, 10);
                inlines_into(children, out);
            }
        }
    }
}

fn inlines_into(nodes: &[Inline], out: &mut Vec<u8>) {
    u32(out, nodes.len());
    for node in nodes {
        match node {
            Inline::Text { value, .. } => {
                u8(out, 1);
                str(out, value);
            }
            Inline::LineBreak { hard: true } => u8(out, 2),
            Inline::LineBreak { hard: false } => u8(out, 3),
            Inline::InlineCode { code } => {
                u8(out, 4);
                str(out, code);
            }
            Inline::InlineHtml { value } => {
                u8(out, 5);
                str(out, value);
            }
            Inline::Strong { children } => {
                u8(out, 6);
                inlines_into(children, out);
            }
            Inline::Emphasis { children } => {
                u8(out, 7);
                inlines_into(children, out);
            }
            Inline::Delete { children } => {
                u8(out, 8);
                inlines_into(children, out);
            }
            Inline::Link(link) => {
                let crate::ast::LinkNode { href, title, has_title, external, children } = &**link;
                u8(out, 9);
                str(out, href);
                u8(out, u8::from(*has_title));
                opt_str(out, title);
                u8(out, u8::from(*external));
                inlines_into(children, out);
            }
            Inline::Image(image) => {
                let crate::ast::ImageNode { src, alt, title } = &**image;
                u8(out, 10);
                str(out, alt);
                str(out, src);
                opt_str(out, title);
            }
        }
    }
}
