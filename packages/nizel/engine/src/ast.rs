//! Nizel's AST (`types.ts`), as the engine builds it.

#[derive(Debug, Clone, PartialEq)]
pub enum Block {
    Heading { depth: u8, id: Option<String>, children: Vec<Inline> },
    Paragraph { children: Vec<Inline> },
    ThematicBreak,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Inline {
    Text { value: String },
}

/// `stripInlineNodes`.
pub fn strip_inline(nodes: &[Inline]) -> String {
    let mut text = String::new();
    for node in nodes {
        match node {
            Inline::Text { value } => text.push_str(value),
        }
    }
    text
}
