//! Nizel's AST (`types.ts`), as the engine builds it.

#[derive(Debug, Clone, PartialEq)]
pub enum Block {
    Heading { depth: u8, id: Option<String>, children: Vec<Inline> },
    Paragraph { children: Vec<Inline> },
    ThematicBreak,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Inline {
    /// `escaped` marks text from a backslash escape or entity: emphasis
    /// tokenization leaves it alone (`EscapedTextNode`).
    Text { value: String, escaped: bool },
    /// `hard` for `<br />`; a soft break renders as a newline.
    LineBreak { hard: bool },
    InlineCode { code: String },
    InlineHtml { value: String },
    Strong { children: Vec<Inline> },
    Emphasis { children: Vec<Inline> },
    Delete { children: Vec<Inline> },
    Link { href: String, title: Option<String>, children: Vec<Inline> },
}

impl Inline {
    pub fn text(value: impl Into<String>) -> Self {
        Inline::Text { value: value.into(), escaped: false }
    }

    pub fn children(&self) -> Option<&[Inline]> {
        match self {
            Inline::Strong { children } | Inline::Emphasis { children } | Inline::Delete { children } | Inline::Link { children, .. } => {
                Some(children)
            }
            _ => None,
        }
    }
}

/// `stripInlineNodes`.
pub fn strip_inline(nodes: &[Inline]) -> String {
    let mut text = String::new();
    strip_into(nodes, &mut text);
    text
}

fn strip_into(nodes: &[Inline], text: &mut String) {
    for node in nodes {
        match node {
            Inline::Text { value, .. } => text.push_str(value),
            Inline::LineBreak { .. } => text.push('\n'),
            Inline::InlineCode { code } => text.push_str(code),
            Inline::InlineHtml { .. } => {}
            other => strip_into(other.children().unwrap_or(&[]), text),
        }
    }
}
