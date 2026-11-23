//! `htmlToMarkdown` from `html-to-markdown.ts`, without plugin handlers.

use crate::jsnum;
use crate::js;
use crate::slug::slugify;
use crate::status;

type Result<T> = std::result::Result<T, i32>;

pub struct ReverseOptions {
    /// `unsupported: 'preserve'` (the default) rather than `'drop'`.
    pub preserve: bool,
    /// Plugin handlers in JavaScript: which elements to offer them.
    pub claim: Option<Claim>,
}

pub struct Claim {
    /// A handler without `htmlToMarkdownTags` may claim any element.
    pub all: bool,
    pub tags: Vec<String>,
}

impl Claim {
    fn wants(&self, tag: &str) -> bool {
        self.all || self.tags.iter().any(|t| t == tag)
    }
}

/// Offers `element` to the JavaScript handlers; their Markdown if one claims it.
fn offer(element: &Element, doc: &Doc) -> Result<Option<String>> {
    let mut bytes = Vec::with_capacity(element.raw.1 - element.raw.0 + 64);
    encode_element(element, doc, &mut bytes);
    crate::host::claim(&bytes)
}

fn encode_str(out: &mut Vec<u8>, value: &str) {
    out.extend_from_slice(&(value.len() as u32).to_le_bytes());
    out.extend_from_slice(value.as_bytes());
}

/// The subtree as `src/wasm/html-codec.ts` reads it.
fn encode_element(element: &Element, doc: &Doc, out: &mut Vec<u8>) {
    out.push(1);
    encode_str(out, &element.tag);
    out.extend_from_slice(&(element.attrs.len() as u32).to_le_bytes());
    for (name, value) in &element.attrs {
        encode_str(out, name);
        encode_str(out, value);
    }
    encode_str(out, doc.at(element.raw));
    out.extend_from_slice(&(element.children.len() as u32).to_le_bytes());
    for child in &element.children {
        match child {
            Node::Element(e) => encode_element(e, doc, out),
            Node::Text(v) => {
                out.push(2);
                encode_str(out, doc.at(*v));
            }
            Node::Comment(v) => {
                out.push(3);
                encode_str(out, doc.at(*v));
            }
        }
    }
}

/// Text, comments and raw element source are spans of the input.
#[derive(Debug, Clone, Copy)]
struct Span(usize, usize);

#[derive(Debug)]
enum Node {
    Text(Span),
    Comment(Span),
    Element(Element),
}

/// The input and options every render step needs.
struct Doc<'a> {
    html: &'a str,
    preserve: bool,
    claim: Option<&'a Claim>,
}

impl Doc<'_> {
    fn at(&self, span: Span) -> &str {
        &self.html[span.0..span.1]
    }
}

#[derive(Debug)]
struct Element {
    tag: String,
    /// In first-seen order; a repeated name keeps its first position and last value.
    attrs: Vec<(String, String)>,
    children: Vec<Node>,
    raw: Span,
}

impl Element {
    fn attr(&self, name: &str) -> Option<&str> {
        self.attrs.iter().find(|(key, _)| key == name).map(|(_, value)| value.as_str())
    }
}

const BLOCK_TAGS: &[&str] = &[
    "address", "article", "aside", "blockquote", "details", "dialog", "div", "dl", "fieldset", "figcaption", "figure",
    "footer", "form", "header", "hr", "main", "nav", "ol", "p", "pre", "section", "table", "ul", "h1", "h2", "h3", "h4",
    "h5", "h6",
];
const PASSTHROUGH_INLINE: &[&str] = &["abbr", "bdi", "bdo", "cite", "data", "dfn", "kbd", "mark", "q", "samp", "small", "sub", "sup", "time", "u", "var"];

fn is_block(tag: &str) -> bool {
    BLOCK_TAGS.contains(&tag)
}

/// Decoded surrogate entities (`&#xD83D;`) are lone UTF-16 units in the
/// JavaScript. They travel as `SURROGATE_BASE + (unit - 0xD800)`, which
/// behaves like a lone surrogate in every check here (not whitespace, not a
/// word character), and are joined back into characters at the end.
const SURROGATE_BASE: u32 = 0xe000;
const SURROGATE_END: u32 = SURROGATE_BASE + 0x800;

fn is_surrogate_marker(c: char) -> bool {
    (SURROGATE_BASE..SURROGATE_END).contains(&(c as u32))
}

/// U+E000–U+E7FF in UTF-8 is `EE 80..=9F xx`.
fn has_surrogate_marker(text: &str) -> bool {
    let b = text.as_bytes();
    let mut from = 0;
    while let Some(offset) = b[from..].iter().position(|&c| c == 0xee) {
        let at = from + offset;
        if b.get(at + 1).is_some_and(|next| (0x80..=0x9f).contains(next)) {
            return true;
        }
        from = at + 1;
    }
    false
}

pub fn html_to_markdown(html: &str, options: &ReverseOptions) -> Result<String> {
    if has_surrogate_marker(html) {
        // The markers would be ambiguous.
        return Err(status::NEEDS_JAVASCRIPT);
    }
    let root = parse_html(html)?;
    let doc = Doc { html, preserve: options.preserve, claim: options.claim.as_ref() };
    let mut out = String::with_capacity(html.len());
    for node in &root {
        render_node(node, &doc, &mut out)?;
    }
    join_surrogates(normalize_document(&out))
}

/// Joins adjacent high/low markers into characters; a marker left alone is
/// a lone surrogate in the JavaScript's output.
fn join_surrogates(text: String) -> Result<String> {
    if !has_surrogate_marker(&text) {
        return Ok(text);
    }
    let mut out = String::with_capacity(text.len());
    let mut chars = text.chars().peekable();
    while let Some(c) = chars.next() {
        if !is_surrogate_marker(c) {
            out.push(c);
            continue;
        }
        let high = c as u32 - SURROGATE_BASE + 0xd800;
        let low = chars.peek().filter(|n| is_surrogate_marker(**n)).map(|n| *n as u32 - SURROGATE_BASE + 0xd800);
        match low {
            Some(low) if (0xd800..0xdc00).contains(&high) && (0xdc00..0xe000).contains(&low) => {
                chars.next();
                let code = 0x10000 + ((high - 0xd800) << 10) + (low - 0xdc00);
                out.push(char::from_u32(code).expect("valid pair"));
            }
            _ => return Err(status::NEEDS_JAVASCRIPT),
        }
    }
    Ok(out)
}

// ---------------------------------------------------------------------------
// parseHtml

/// The token regex: `<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\?[\s\S]*?\?>|<\/?[A-Za-z][^>]*>`.
fn next_token(html: &str, from: usize) -> Option<(usize, usize)> {
    let b = html.as_bytes();
    let mut p = from;
    while let Some(offset) = html[p..].find('<') {
        p += offset;
        let rest = &html[p..];
        let end = if rest.starts_with("<!--") && let Some(i) = rest[4..].find("-->") {
            Some(p + 4 + i + 3)
        } else if rest.starts_with("<![CDATA[") && let Some(i) = rest[9..].find("]]>") {
            Some(p + 9 + i + 3)
        } else if rest.starts_with("<!") && let Some(i) = rest[2..].find('>') {
            Some(p + 2 + i + 1)
        } else if rest.starts_with("<?") && let Some(i) = rest[2..].find("?>") {
            Some(p + 2 + i + 2)
        } else {
            let after = p + 1 + usize::from(b.get(p + 1) == Some(&b'/'));
            if b.get(after).is_some_and(u8::is_ascii_alphabetic) {
                html[after + 1..].find('>').map(|i| after + 1 + i + 1)
            } else {
                None
            }
        };
        if let Some(end) = end {
            return Some((p, end));
        }
        p += 1;
    }
    None
}

struct Open {
    element: Element,
    start: usize,
}

fn parse_html(html: &str) -> Result<Vec<Node>> {
    let mut root: Vec<Node> = Vec::new();
    let mut stack: Vec<Open> = Vec::new();
    let mut last = 0;

    fn children<'a>(root: &'a mut Vec<Node>, stack: &'a mut [Open]) -> &'a mut Vec<Node> {
        match stack.last_mut() {
            Some(open) => &mut open.element.children,
            None => root,
        }
    }
    fn append_text(root: &mut Vec<Node>, stack: &mut [Open], start: usize, end: usize) {
        if end > start {
            children(root, stack).push(Node::Text(Span(start, end)));
        }
    }

    let mut cursor = 0;
    while let Some((start, end)) = next_token(html, cursor) {
        append_text(&mut root, &mut stack, last, start);
        let token = &html[start..end];
        last = end;
        cursor = end;

        if token.starts_with("<!--") {
            children(&mut root, &mut stack).push(Node::Comment(Span(start, end)));
            continue;
        }
        if let Some(inner) = token.strip_prefix("</") {
            let tag = lower(js::trim(&inner[..inner.len() - 1]));
            close_tag(html, &mut root, &mut stack, &tag, end)?;
            continue;
        }
        let Some((name, attributes)) = open_tag(token) else {
            append_text(&mut root, &mut stack, start, end);
            continue;
        };
        let tag = lower(name);
        let element = Element { attrs: parse_attrs(attributes)?, tag, children: Vec::new(), raw: Span(start, end) };
        if !is_void(&element.tag) && !token.ends_with("/>") {
            stack.push(Open { element, start });
        } else {
            children(&mut root, &mut stack).push(Node::Element(element));
        }
    }
    append_text(&mut root, &mut stack, last, html.len());

    // Unclosed elements: raw runs to the end of the input.
    while let Some(mut open) = stack.pop() {
        open.element.raw = Span(open.start, html.len());
        children(&mut root, &mut stack).push(Node::Element(open.element));
    }
    Ok(root)
}

/// `closeTag`: close the nearest open element with this tag, else keep the
/// tag's text (`html.slice(end - tag.length - 3, end)`, in UTF-16 units).
fn close_tag(html: &str, root: &mut Vec<Node>, stack: &mut Vec<Open>, tag: &str, end: usize) -> Result<()> {
    if let Some(index) = stack.iter().rposition(|open| open.element.tag == tag) {
        // Elements closed implicitly keep `raw` as their opening tag (`stack.length = index`).
        while stack.len() > index + 1 {
            let inner = stack.pop().expect("deeper element");
            stack.last_mut().expect("parent").element.children.push(Node::Element(inner.element));
        }
        let mut open = stack.pop().expect("matched element");
        open.element.raw = Span(open.start, end);
        let target = match stack.last_mut() {
            Some(parent) => &mut parent.element.children,
            None => root,
        };
        target.push(Node::Element(open.element));
        return Ok(());
    }
    // Walk back tag.length + 3 UTF-16 units from `end`.
    let mut units = tag.encode_utf16().count() + 3;
    let mut start = end;
    while units > 0 {
        let Some(c) = html[..start].chars().next_back() else {
            // `slice` with a negative start counts from the end: not reproduced.
            return Err(status::NEEDS_JAVASCRIPT);
        };
        let width = c.len_utf16();
        if width > units {
            // The slice would split a surrogate pair.
            return Err(status::NEEDS_JAVASCRIPT);
        }
        units -= width;
        start -= c.len_utf8();
    }
    let target = match stack.last_mut() {
        Some(parent) => &mut parent.element.children,
        None => root,
    };
    target.push(Node::Text(Span(start, end)));
    Ok(())
}

/// `/^<([A-Za-z][^\s/>]*)([\s\S]*?)\/?>$/` → (name, attribute text).
fn open_tag(token: &str) -> Option<(&str, &str)> {
    let rest = token.strip_prefix('<')?;
    if !rest.bytes().next().is_some_and(|b| b.is_ascii_alphabetic()) {
        return None;
    }
    let name_len = rest.char_indices().find(|&(_, c)| js::is_space(c) || c == '/' || c == '>').map_or(rest.len(), |(i, _)| i);
    let body = rest[name_len..].strip_suffix('>')?;
    let attributes = body.strip_suffix('/').unwrap_or(body);
    Some((&rest[..name_len], attributes))
}

/// `toLowerCase`, with the common all-ASCII case done without Unicode tables.
fn lower(text: &str) -> String {
    if text.is_ascii() { text.to_ascii_lowercase() } else { text.to_lowercase() }
}

fn is_void(tag: &str) -> bool {
    matches!(tag, "area" | "base" | "br" | "col" | "embed" | "hr" | "img" | "input" | "link" | "meta" | "param" | "source" | "track" | "wbr")
}

fn is_attr_name_char(c: char) -> bool {
    !(js::is_space(c) || matches!(c, '"' | '\'' | '=' | '<' | '>' | '`'))
}

/// `parseAttrs`.
fn parse_attrs(input: &str) -> Result<Vec<(String, String)>> {
    let mut attrs: Vec<(String, String)> = Vec::new();
    let mut i = 0;
    while i < input.len() {
        let Some(c) = input[i..].chars().next() else { break };
        if !is_attr_name_char(c) {
            i += c.len_utf8();
            continue;
        }
        let name_end = i + input[i..].char_indices().find(|&(_, c)| !is_attr_name_char(c)).map_or(input.len() - i, |(n, _)| n);
        let name = lower(&input[i..name_end]);
        let (value, end) = attr_value(input, name_end).unwrap_or(("", name_end));
        let decoded = decode_entities(value)?.into_owned();
        match attrs.iter_mut().find(|(key, _)| *key == name) {
            Some(existing) => existing.1 = decoded,
            None => attrs.push((name, decoded)),
        }
        i = end;
    }
    Ok(attrs)
}

/// `(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?` → (value, end).
fn attr_value(input: &str, from: usize) -> Option<(&str, usize)> {
    let eq = from + input[from..].char_indices().find(|&(_, c)| !js::is_space(c)).map_or(input.len() - from, |(n, _)| n);
    if input.as_bytes().get(eq) != Some(&b'=') {
        return None;
    }
    let v = eq + 1 + input[eq + 1..].char_indices().find(|&(_, c)| !js::is_space(c)).map_or(input.len() - eq - 1, |(n, _)| n);
    match input.as_bytes().get(v) {
        Some(&quote @ (b'"' | b'\'')) => {
            let close = input[v + 1..].find(quote as char)?;
            Some((&input[v + 1..v + 1 + close], v + 1 + close + 1))
        }
        _ => {
            let len = input[v..].char_indices().find(|&(_, c)| !is_attr_name_char(c)).map_or(input.len() - v, |(n, _)| n);
            (len > 0).then(|| (&input[v..v + len], v + len))
        }
    }
}

/// `decodeEntities` (the converter's own, three passes).
fn decode_entities(value: &str) -> Result<std::borrow::Cow<'_, str>> {
    if !value.contains('&') {
        return Ok(std::borrow::Cow::Borrowed(value));
    }
    // `/&#x([0-9a-f]+);?/gi`
    let pass = |text: &str, prefix: &str, radix: u32| -> Result<String> {
        let mut out = String::with_capacity(text.len());
        let mut last = 0;
        let mut i = 0;
        let b = text.as_bytes();
        while i < b.len() {
            if b[i] == b'&' && b[i + 1..].len() >= prefix.len() && b[i + 1..i + 1 + prefix.len()].eq_ignore_ascii_case(prefix.as_bytes()) {
                let digits_start = i + 1 + prefix.len();
                let digits = b[digits_start..].iter().take_while(|c| (**c as char).is_digit(radix)).count();
                if digits > 0 {
                    let mut end = digits_start + digits;
                    let value = text[digits_start..end].chars().fold(0f64, |v, c| v * radix as f64 + c.to_digit(radix).unwrap_or(0) as f64);
                    if b.get(end) == Some(&b';') {
                        end += 1;
                    }
                    out.push_str(&text[last..i]);
                    out.push(from_code_point(value)?);
                    last = end;
                    i = end;
                    continue;
                }
            }
            i += 1;
        }
        out.push_str(&text[last..]);
        Ok(out)
    };
    let hex = pass(value, "#x", 16)?;
    let decimal = pass(&hex, "#", 10)?;
    // `/&([a-z]+);/gi`
    let b = decimal.as_bytes();
    let mut out = String::with_capacity(decimal.len());
    let mut last = 0;
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'&' {
            let letters = b[i + 1..].iter().take_while(|c| c.is_ascii_alphabetic()).count();
            if letters > 0 && b.get(i + 1 + letters) == Some(&b';') {
                let name = decimal[i + 1..i + 1 + letters].to_ascii_lowercase();
                let replacement = match name.as_str() {
                    "amp" => Some("&"),
                    "apos" => Some("'"),
                    "gt" => Some(">"),
                    "lt" => Some("<"),
                    "nbsp" => Some(" "),
                    "quot" => Some("\""),
                    _ => None,
                };
                if let Some(replacement) = replacement {
                    out.push_str(&decimal[last..i]);
                    out.push_str(replacement);
                    last = i + letters + 2;
                }
                i += letters + 2;
                continue;
            }
        }
        i += 1;
    }
    out.push_str(&decimal[last..]);
    Ok(std::borrow::Cow::Owned(out))
}

/// `String.fromCodePoint`: throws above U+10FFFF (left to JavaScript); a
/// surrogate becomes a marker (see `SURROGATE_BASE`).
fn from_code_point(value: f64) -> Result<char> {
    if value > 0x10ffff as f64 {
        return Err(status::NEEDS_JAVASCRIPT);
    }
    let code = value as u32;
    if (0xd800..0xe000).contains(&code) {
        return Ok(char::from_u32(SURROGATE_BASE + (code - 0xd800)).expect("marker"));
    }
    char::from_u32(code).ok_or(status::NEEDS_JAVASCRIPT)
}

fn text_content(node: &Node, doc: &Doc, out: &mut String) -> Result<()> {
    match node {
        Node::Text(value) => out.push_str(&decode_entities(doc.at(*value))?),
        Node::Element(element) => {
            for child in &element.children {
                text_content(child, doc, out)?;
            }
        }
        Node::Comment(_) => {}
    }
    Ok(())
}

fn text_of(node: &Node, doc: &Doc) -> Result<String> {
    let mut out = String::new();
    text_content(node, doc, &mut out)?;
    Ok(out)
}

// ---------------------------------------------------------------------------
// renderNode

fn render_children(nodes: &[Node], options: &Doc) -> Result<String> {
    let mut out = String::new();
    for node in nodes {
        render_node(node, options, &mut out)?;
    }
    Ok(out)
}

fn render_node(node: &Node, options: &Doc, out: &mut String) -> Result<()> {
    let element = match node {
        Node::Text(value) => {
            collapse_text(&decode_entities(options.at(*value))?, out);
            return Ok(());
        }
        Node::Comment(value) => {
            out.push_str(if options.preserve { options.at(*value) } else { " " });
            return Ok(());
        }
        Node::Element(element) => element,
    };
    let tag = element.tag.as_str();
    if let Some(claim) = options.claim {
        if claim.wants(tag) {
            if let Some(claimed) = offer(element, options)? {
                out.push_str(&claimed);
                return Ok(());
            }
        }
    }
    let inline = || -> Result<String> { Ok(normalize_inline(&render_children(&element.children, options)?)) };
    let block = || -> Result<String> { Ok(normalize_document(&render_children(&element.children, options)?)) };
    let wrap = |out: &mut String, value: &str| block_wrap(value, out);

    if options.preserve && has_unsupported_attrs(element, options)? {
        let raw = options.at(element.raw);
        if is_block(tag) { wrap(out, raw) } else { out.push_str(raw) }
        return Ok(());
    }
    match tag {
        "h1" | "h2" | "h3" | "h4" | "h5" | "h6" => {
            let level = (tag.as_bytes()[1] - b'0') as usize;
            let mut heading = String::with_capacity(level + 1 + element.raw.1 - element.raw.0);
            heading.extend(std::iter::repeat_n('#', level));
            heading.push(' ');
            normalize_inline_into(&render_children(&element.children, options)?, &mut heading);
            wrap(out, &heading);
        }
        "p" => wrap(out, &normalize_paragraph(&render_children(&element.children, options)?)),
        "br" => out.push_str("  \n"),
        "hr" => wrap(out, "---"),
        "strong" | "b" => inline_wrap("**", &inline()?, out),
        "em" | "i" => inline_wrap("*", &inline()?, out),
        "del" | "s" | "strike" => inline_wrap("~~", &inline()?, out),
        "code" => render_inline_code(&text_of(node, options)?, out),
        "pre" => wrap(out, &render_code_block(element, options)?),
        "a" => render_link(element, &inline()?, out),
        "img" => render_image(element, out),
        "blockquote" => wrap(out, &prefix_lines(&block()?, "> ")),
        "ul" | "ol" => wrap(out, &render_list(element, options)?),
        "li" => normalize_inline_into(&render_children(&element.children, options)?, out),
        "table" => {
            if options.preserve && table_has_unsupported_structure(element) {
                wrap(out, options.at(element.raw));
            } else {
                wrap(out, &render_table(element, options)?);
            }
        }
        "thead" | "tbody" | "tr" | "th" | "td" => normalize_inline_into(&render_children(&element.children, options)?, out),
        "div" | "section" | "article" | "main" | "header" | "footer" | "nav" => wrap(out, &block()?),
        "span" => normalize_inline_into(&render_children(&element.children, options)?, out),
        _ if PASSTHROUGH_INLINE.contains(&tag) || is_block(tag) => {
            if options.preserve { out.push_str(options.at(element.raw)) } else { out.push_str(&block()?) }
        }
        _ => {
            if options.preserve { out.push_str(options.at(element.raw)) } else { out.push_str(&inline()?) }
        }
    }
    Ok(())
}

/// `hasUnsupportedAttrs`.
fn has_unsupported_attrs(element: &Element, doc: &Doc) -> Result<bool> {
    if element.attrs.is_empty() {
        return Ok(false);
    }
    let names = || element.attrs.iter().map(|(name, _)| name.as_str());
    Ok(match element.tag.as_str() {
        "a" => names().any(|n| n != "href" && n != "title"),
        "img" => names().any(|n| n != "src" && n != "alt" && n != "title"),
        "ol" => names().any(|n| n != "start"),
        "code" | "pre" => names().any(|n| n != "class") || !has_language_class(element.attr("class").unwrap_or("")).is_some(),
        "h1" | "h2" | "h3" | "h4" | "h5" | "h6" => {
            let mut text = String::new();
            for child in &element.children {
                text_content(child, doc, &mut text)?;
            }
            let slug = slugify(&text, true);
            names().any(|n| n != "id") || element.attr("id") != Some(slug.as_str())
        }
        _ => true,
    })
}

/// `/\blanguage-([A-Za-z0-9_-]+)/` → the language.
fn has_language_class(class: &str) -> Option<&str> {
    let b = class.as_bytes();
    let word = |c: u8| c.is_ascii_alphanumeric() || c == b'_';
    for (i, _) in class.match_indices("language-") {
        if i > 0 && word(b[i - 1]) {
            continue;
        }
        let start = i + "language-".len();
        let len = b[start..].iter().take_while(|c| c.is_ascii_alphanumeric() || **c == b'_' || **c == b'-').count();
        if len > 0 {
            return Some(&class[start..start + len]);
        }
    }
    None
}

fn render_link(element: &Element, text: &str, out: &mut String) {
    let Some(href) = element.attr("href").filter(|h| !h.is_empty()) else {
        out.push_str(text);
        return;
    };
    out.push('[');
    escape_link_text(text, out);
    out.push_str("](");
    escape_url(href, out);
    push_title(element, out);
    out.push(')');
}

fn render_image(element: &Element, out: &mut String) {
    let Some(src) = element.attr("src").filter(|s| !s.is_empty()) else { return };
    out.push_str("![");
    escape_link_text(element.attr("alt").unwrap_or(""), out);
    out.push_str("](");
    escape_url(src, out);
    push_title(element, out);
    out.push(')');
}

fn push_title(element: &Element, out: &mut String) {
    if let Some(title) = element.attr("title").filter(|t| !t.is_empty()) {
        out.push_str(" \"");
        out.push_str(&title.replace('\\', "\\\\").replace('"', "\\\""));
        out.push('"');
    }
}

/// `escapeLinkText`: `\` and `]` get a backslash.
fn escape_link_text(value: &str, out: &mut String) {
    for c in value.chars() {
        if c == '\\' || c == ']' {
            out.push('\\');
        }
        out.push(c);
    }
}

/// `escapeUrl`: whitespace → `%20`, `)` → `%29`.
fn escape_url(value: &str, out: &mut String) {
    for c in value.chars() {
        if js::is_space(c) {
            out.push_str("%20");
        } else if c == ')' {
            out.push_str("%29");
        } else {
            out.push(c);
        }
    }
}

fn longest_run(value: &str, ch: char) -> usize {
    let mut longest = 0;
    let mut current = 0;
    for c in value.chars() {
        if c == ch {
            current += 1;
            longest = longest.max(current);
        } else {
            current = 0;
        }
    }
    longest
}

/// `renderInlineCode`.
fn render_inline_code(value: &str, out: &mut String) {
    let fence = "`".repeat(longest_run(value, '`') + 1);
    let padding = if value.starts_with('`') || value.ends_with('`') { " " } else { "" };
    out.push_str(&fence);
    out.push_str(padding);
    out.push_str(value);
    out.push_str(padding);
    out.push_str(&fence);
}

/// `renderCodeBlock`.
fn render_code_block(element: &Element, doc: &Doc) -> Result<String> {
    let code_element = element.children.iter().find_map(|child| match child {
        Node::Element(e) if e.tag == "code" => Some(e),
        _ => None,
    });
    let class = code_element.and_then(|e| e.attr("class")).or_else(|| element.attr("class")).unwrap_or("");
    let lang = has_language_class(class).unwrap_or("");
    let mut code = String::new();
    match code_element {
        Some(e) => {
            for child in &e.children {
                text_content(child, doc, &mut code)?;
            }
        }
        None => {
            for child in &element.children {
                text_content(child, doc, &mut code)?;
            }
        }
    }
    if code.ends_with('\n') {
        code.pop();
    }
    let fence = "`".repeat((longest_run(&code, '`') + 1).max(3));
    let mut block = String::with_capacity(fence.len() * 2 + lang.len() + code.len() + 2);
    block.push_str(&fence);
    block.push_str(lang);
    block.push('\n');
    block.push_str(&code);
    block.push('\n');
    block.push_str(&fence);
    Ok(block)
}

/// `renderList`.
fn render_list(element: &Element, options: &Doc) -> Result<String> {
    let start = if element.tag == "ol" { Some(jsnum::number(element.attr("start").unwrap_or("1"))) } else { None };
    let mut items = Vec::new();
    let mut index = 0usize;
    for child in &element.children {
        let Node::Element(item) = child else { continue };
        if item.tag != "li" {
            continue;
        }
        let mut line = match start {
            Some(start) => {
                let mut marker = jsnum::to_string(start + index as f64);
                marker.push_str(". ");
                marker
            }
            None => String::from("- "),
        };
        let marker_len = line.encode_utf16().count();
        line.push_str(&normalize_list_item_body(&render_children(&item.children, options)?));
        items.push(indent_continuation(&line, marker_len));
        index += 1;
    }
    Ok(items.join("\n"))
}

fn collect_rows<'a>(element: &'a Element, rows: &mut Vec<&'a Element>) {
    for child in &element.children {
        let Node::Element(e) = child else { continue };
        if e.tag == "tr" {
            rows.push(e);
        }
        if matches!(e.tag.as_str(), "thead" | "tbody" | "tfoot") {
            collect_rows(e, rows);
        }
    }
}

fn row_cells(row: &Element) -> Vec<&Element> {
    row.children
        .iter()
        .filter_map(|c| match c {
            Node::Element(e) if e.tag == "th" || e.tag == "td" => Some(e),
            _ => None,
        })
        .collect()
}

fn table_has_unsupported_structure(element: &Element) -> bool {
    let mut rows = Vec::new();
    collect_rows(element, &mut rows);
    rows.iter().any(|row| row_cells(row).iter().any(|cell| !cell.attrs.is_empty()))
}

/// `renderTable`.
fn render_table(element: &Element, options: &Doc) -> Result<String> {
    let mut all = Vec::new();
    collect_rows(element, &mut all);
    let rows: Vec<Vec<&Element>> = all.iter().map(|row| row_cells(row)).filter(|cells| !cells.is_empty()).collect();
    if rows.is_empty() {
        return Ok(String::new());
    }
    let width = rows.iter().map(Vec::len).max().unwrap_or(0);
    let mut values: Vec<Vec<String>> = Vec::with_capacity(rows.len());
    for row in &rows {
        let mut cells = Vec::with_capacity(width);
        for index in 0..width {
            cells.push(match row.get(index) {
                Some(cell) => normalize_inline(&render_children(&cell.children, options)?),
                None => String::new(),
            });
        }
        values.push(cells);
    }
    let separator = vec!["---".to_string(); width];
    let mut table = String::new();
    let push_row = |table: &mut String, cells: &[String]| {
        if !table.is_empty() {
            table.push('\n');
        }
        table.push_str("| ");
        for (index, cell) in cells.iter().enumerate() {
            if index > 0 {
                table.push_str(" | ");
            }
            table.push_str(cell);
        }
        table.push_str(" |");
    };
    push_row(&mut table, &values[0]);
    push_row(&mut table, &separator);
    for row in &values[1..] {
        push_row(&mut table, row);
    }
    Ok(table)
}

// ---------------------------------------------------------------------------
// Whitespace helpers.

fn inline_wrap(marker: &str, value: &str, out: &mut String) {
    if !value.is_empty() {
        out.push_str(marker);
        out.push_str(value);
        out.push_str(marker);
    }
}

/// `blockWrap`.
fn block_wrap(value: &str, out: &mut String) {
    let trimmed = js::trim(value);
    if !trimmed.is_empty() {
        out.push_str("\n\n");
        out.push_str(trimmed);
        out.push_str("\n\n");
    }
}

/// `normalizeDocument`: `[ \t]+\n` → `\n`, `\n{3,}` → `\n\n`, trim — one byte pass.
fn normalize_document(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    normalize_document_into(value, &mut out);
    out
}

fn normalize_document_into(value: &str, out: &mut String) {
    let start_len = out.len();
    let b = value.as_bytes();
    let mut i = 0;
    let mut copied = 0;
    while i < b.len() {
        match b[i] {
            b' ' | b'\t' => {
                let run = i + b[i..].iter().take_while(|c| **c == b' ' || **c == b'\t').count();
                if b.get(run) == Some(&b'\n') {
                    out.push_str(&value[copied..i]);
                    copied = run;
                }
                i = run;
            }
            b'\n' => {
                out.push_str(&value[copied..i]);
                // Newlines, and whitespace runs between them (removed by the first replacement).
                let mut count = 0;
                let mut j = i;
                loop {
                    match b.get(j) {
                        Some(b'\n') => {
                            count += 1;
                            j += 1;
                        }
                        Some(b' ' | b'\t') => {
                            let run = j + b[j..].iter().take_while(|c| **c == b' ' || **c == b'\t').count();
                            if b.get(run) == Some(&b'\n') { j = run } else { break }
                        }
                        _ => break,
                    }
                }
                out.push_str(if count >= 2 { "\n\n" } else { "\n" });
                copied = j;
                i = j;
            }
            _ => i += 1,
        }
    }
    out.push_str(&value[copied..]);
    trim_from(out, start_len);
}

/// Trims (JavaScript `trim`) the part of `out` from `start` on, in place.
fn trim_from(out: &mut String, start: usize) {
    let kept_end = start + js::trim_end(&out[start..]).len();
    out.truncate(kept_end);
    let leading = out[start..].len() - js::trim_start(&out[start..]).len();
    if leading > 0 {
        out.drain(start..start + leading);
    }
}

/// `normalizeInline`: `[ \t\r\n]+` → ` `, trim — one byte pass.
fn normalize_inline(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    normalize_inline_into(value, &mut out);
    out
}

fn normalize_inline_into(value: &str, out: &mut String) {
    let start_len = out.len();
    let b = value.as_bytes();
    let mut i = 0;
    let mut copied = 0;
    while i < b.len() {
        if matches!(b[i], b' ' | b'\t' | b'\r' | b'\n') {
            let run = i + b[i..].iter().take_while(|c| matches!(**c, b' ' | b'\t' | b'\r' | b'\n')).count();
            if !(run - i == 1 && b[i] == b' ') {
                out.push_str(&value[copied..i]);
                out.push(' ');
                copied = run;
            }
            i = run;
        } else {
            i += 1;
        }
    }
    out.push_str(&value[copied..]);
    trim_from(out, start_len);
}

/// `normalizeParagraph`: per line `normalizeInline`, joined, `/ *  \n */g` → `  \n`, trim.
fn normalize_paragraph(value: &str) -> String {
    let mut joined = String::with_capacity(value.len());
    for (index, line) in value.split('\n').enumerate() {
        if index > 0 {
            joined.push('\n');
        }
        normalize_inline_into(line, &mut joined);
    }
    // A match needs two spaces before a newline, which a trimmed line can only
    // end with when JavaScript's `trim` kept them (it never does for spaces),
    // so this only ever applies through the rare cases below.
    if !joined.contains("  \n") {
        let start = 0;
        trim_from(&mut joined, start);
        return joined;
    }
    let b = joined.as_bytes();
    let mut out = String::with_capacity(joined.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b' ' {
            let run = b[i..].iter().take_while(|c| **c == b' ').count();
            if run >= 2 && b.get(i + run) == Some(&b'\n') {
                let after = b[i + run + 1..].iter().take_while(|c| **c == b' ').count();
                out.push_str("  \n");
                i += run + 1 + after;
                continue;
            }
            out.push_str(&joined[i..i + run]);
            i += run;
            continue;
        }
        let len = joined[i..].chars().next().map_or(1, char::len_utf8);
        out.push_str(&joined[i..i + len]);
        i += len;
    }
    trim_from(&mut out, 0);
    out
}

/// `normalizeListItemBody`: `\n\n` before a list marker line becomes `\n`.
fn normalize_list_item_body(value: &str) -> String {
    let normalized = normalize_document(value);
    let b = normalized.as_bytes();
    let mut out = String::with_capacity(normalized.len());
    let mut i = 0;
    while i < b.len() {
        if b[i..].starts_with(b"\n\n") && starts_list_marker(&b[i + 2..]) {
            out.push('\n');
            i += 2;
            continue;
        }
        let len = normalized[i..].chars().next().map_or(1, char::len_utf8);
        out.push_str(&normalized[i..i + len]);
        i += len;
    }
    out
}

/// `(?:[-*+]|\d+[.)]) ` at the start of `b`.
fn starts_list_marker(b: &[u8]) -> bool {
    if b.len() >= 2 && matches!(b[0], b'-' | b'*' | b'+') && b[1] == b' ' {
        return true;
    }
    let digits = b.iter().take_while(|c| c.is_ascii_digit()).count();
    digits > 0 && matches!(b.get(digits), Some(b'.' | b')')) && b.get(digits + 1) == Some(&b' ')
}

/// `collapseText`: `\s+` → ` ` (JavaScript whitespace).
fn collapse_text(value: &str, out: &mut String) {
    let mut copied = 0;
    let mut chars = value.char_indices().peekable();
    while let Some((i, c)) = chars.next() {
        if !js::is_space(c) {
            continue;
        }
        let mut end = i + c.len_utf8();
        while let Some(&(j, d)) = chars.peek() {
            if !js::is_space(d) {
                break;
            }
            end = j + d.len_utf8();
            chars.next();
        }
        if !(end - i == 1 && c == ' ') {
            out.push_str(&value[copied..i]);
            out.push(' ');
            copied = end;
        }
    }
    out.push_str(&value[copied..]);
}

/// `prefixLines`.
fn prefix_lines(value: &str, prefix: &str) -> String {
    let bare = prefix.trim_end();
    let mut out = String::with_capacity(value.len() + value.len() / 8 + prefix.len());
    for (index, line) in value.split('\n').enumerate() {
        if index > 0 {
            out.push('\n');
        }
        if line.is_empty() {
            out.push_str(bare);
        } else {
            out.push_str(prefix);
            out.push_str(line);
        }
    }
    out
}

/// `indentContinuation`.
fn indent_continuation(value: &str, size: usize) -> String {
    if !value.contains('\n') {
        return value.to_string();
    }
    let mut out = String::with_capacity(value.len() + size * 4);
    for (index, line) in value.split('\n').enumerate() {
        if index > 0 {
            out.push('\n');
            out.extend(std::iter::repeat_n(' ', size));
        }
        out.push_str(line);
    }
    out
}
