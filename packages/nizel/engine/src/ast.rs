//! Nizel's AST (`types.ts`), as the engine builds it.

#[derive(Debug, Clone, PartialEq)]
pub enum Block {
    Html { value: String },
    Heading { depth: u8, id: Option<String>, children: Vec<Inline> },
    Paragraph { children: Vec<Inline> },
    ThematicBreak,
    /// `fenced` code carries `lang`, `meta`, `filename` and `highlightLines` keys; indented code only `code`.
    Code { code: String, fenced: bool, lang: Option<String>, meta: Option<String>, filename: Option<String>, highlight_lines: Option<Vec<f64>> },
    Blockquote { children: Vec<Block> },
    List { ordered: bool, start: Option<u64>, tight: bool, items: Vec<ListItem> },
    /// The first row is the header.
    Table { align: Vec<Option<&'static str>>, rows: Vec<Vec<Vec<Inline>>> },
    CustomBlock { name: String, args: Vec<String>, props: Vec<(String, Prop)>, content: String, children: Vec<Block> },
}

/// A custom block prop after `parsePrimitive`.
#[derive(Debug, Clone, PartialEq)]
pub enum Prop {
    Bool(bool),
    Null,
    Number(f64),
    Text(String),
}

#[derive(Debug, Clone, PartialEq)]
pub struct ListItem {
    pub checked: Option<bool>,
    pub children: Vec<Block>,
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
    /// `has_title`: the JavaScript node has a `title` key (possibly undefined);
    /// autolinks have none. `external` is `isExternalHref` or fixed by kind.
    Link { href: String, title: Option<String>, has_title: bool, external: bool, children: Vec<Inline> },
    Image { src: String, alt: String, title: Option<String> },
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
            Inline::Image { alt, .. } => text.push_str(alt),
            other => strip_into(other.children().unwrap_or(&[]), text),
        }
    }
}
