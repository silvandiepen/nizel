//! Tier 1 (NIZEL-005): a single pass that writes HTML directly, for the
//! documents it can reproduce exactly. Anything outside its subset makes it
//! decline, and the caller renders the document with the full engine
//! (`block` + `render`), which is the reference for every byte here.
//!
//! The subset grows construct by construct; each addition is checked against
//! the full engine by `examples/fastfuzz.rs` and every Nizel gate.
//!
//! Covered now:
//! - blank lines (empty or ASCII spaces only)
//! - paragraphs whose lines start with an ASCII letter, with plain text, soft
//!   breaks and code spans; no line but the last may end in a space
//! - ATX headings (content outside the subset goes through the full engine's
//!   own heading function) and fenced code opening at column 0
//! - thematic breaks
//! - tables (cells in the inline subset)
//! - inline links in their unambiguous shape (`inline_link`)
//! - emphasis and strong in their unambiguous shape (`emphasis_pair`), and
//!   intraword underscores
//! - lists of every other shape through the full engine's own item rules
//!   (`nested_list`), their items rendered by tier 1 as documents of their own
//! - tight lists of single-line items (`-`, `*`, `+`, or `1.`/`1)`), one
//!   space after the marker, content starting with a letter, ended by a blank
//!   line or the input's end that nothing could continue
//!
//! A block tier 1 cannot render is not the end of it: the full engine
//! renders the stretch up to the next point where it provably starts a new
//! top-level block (`segment_end`), with the same heading-ID map, and tier 1
//! goes on from there.
//!
//! Paragraphs are read in place from the source and classified one byte at a
//! time against a table, copying runs of plain bytes at once.

use crate::block::{self, Options};
use crate::inline::Ctx;
use crate::js::escape_html_into;
use crate::refs::References;

thread_local! {
    /// Bytes of the last document that tier 1 handed to the full engine
    /// (coverage reporting; see examples/coverage.rs).
    static HANDED_OVER: std::cell::Cell<usize> = const { std::cell::Cell::new(0) };
    /// Bytes of paragraphs and table cells whose inline content the full
    /// engine parsed (tier 1 still read their extent).
    static INLINE_FALLBACK: std::cell::Cell<usize> = const { std::cell::Cell::new(0) };
    /// Whether the walk in progress resolves no references (see
    /// `brackets_in_code_ok`).
    static NO_REFERENCES: std::cell::Cell<bool> = const { std::cell::Cell::new(true) };
    /// When set, each handed-over stretch's length and first line, and each
    /// paragraph whose inline content the full engine parsed (length 0, its
    /// whole text; see `trace_handed_over`).
    static TRACE: std::cell::RefCell<Option<Vec<(usize, String)>>> = const { std::cell::RefCell::new(None) };
}

/// Starts (true) or stops recording each stretch tier 1 hands over, and
/// returns what was recorded since the last call (examples/coverage.rs).
pub fn trace_handed_over(on: bool) -> Vec<(usize, String)> {
    TRACE.with(|trace| std::mem::replace(&mut *trace.borrow_mut(), on.then(Vec::new)).unwrap_or_default())
}

/// Bytes of the last rendered document whose inline content (a paragraph or
/// a table cell) the full engine parsed.
pub fn inline_fallback_bytes() -> usize {
    INLINE_FALLBACK.with(std::cell::Cell::get)
}

/// Bytes of the last rendered document that tier 1 handed to the full engine.
pub fn handed_over_bytes() -> usize {
    HANDED_OVER.with(std::cell::Cell::get)
}

/// Renders `source` into `out` when every construct is in the subset.
/// Returns false (with `out` restored) when it declines.
pub fn render(source: &str, options: &Options, out: &mut String) -> bool {
    let start = out.len();
    let handled = render_inner(source, options, out).is_some();
    if !handled {
        out.truncate(start);
    }
    handled
}

fn line_end(b: &[u8], from: usize) -> usize {
    crate::scan::find_byte(b, from, b'\n').unwrap_or(b.len())
}

fn render_inner(source: &str, options: &Options, out: &mut String) -> Option<()> {
    let b = source.as_bytes();
    HANDED_OVER.with(|handed| handed.set(0));
    INLINE_FALLBACK.with(|bytes| bytes.set(0));
    // Document-wide: CR changes how lines split (such a document stays
    // whole with the full engine), and reference definitions are extracted
    // from the whole document before any block is parsed. Whether it has
    // definitions is decided lazily, by the full engine's own extraction
    // (which skips fenced code and HTML blocks); with none, it leaves every
    // line as is, and with some, tier 1 starts over on what it leaves.
    if crate::scan::find_byte(b, 0, b'\r').is_some() {
        return None;
    }
    let has_pipe = crate::scan::find_byte(b, 0, b'|').is_some();
    let start = out.len();
    let none = References::new();
    let plain = Ctx { options, references: &none };
    let mut state = Walk::new(source, options, &plain, has_pipe, false);
    NO_REFERENCES.with(|flag| flag.set(true));
    if walk(source, &mut state, out, None).is_some() {
        return Some(());
    }
    if !state.found_definitions {
        return None;
    }
    // The document defines references: render again, as the full engine
    // does, over the lines left after extraction and with what it extracted
    // (no further definition checks: extraction is done).
    out.truncate(start);
    HANDED_OVER.with(|handed| handed.set(0));
    INLINE_FALLBACK.with(|bytes| bytes.set(0));
    let (content, references) = block::extracted_content(source);
    let ctx = Ctx { options, references: &references };
    let mut state = Walk::new(&content, options, &ctx, has_pipe, true);
    NO_REFERENCES.with(|flag| flag.set(references.is_empty()));
    walk(&content, &mut state, out, None)
}

impl<'a> Walk<'a> {
    fn new(root: &'a str, options: &'a Options, ctx: &'a Ctx<'a>, has_pipe: bool, extracted: bool) -> Self {
        Walk {
            root,
            options,
            ctx,
            // The full engine expands tabs in every line before reading lists.
            has_tab: crate::scan::find_byte(root.as_bytes(), 0, b'\t').is_some(),
            has_pipe,
            seen: crate::slug::Seen::default(),
            text: String::new(),
            slug: String::new(),
            attribute: String::new(),
            references_checked: extracted,
            found_definitions: false,
            in_step: true,
            depth: 0,
            root_lines: None,
        }
    }
}

/// What one document's walk shares across its blocks and nested items.
struct Walk<'a> {
    /// The whole document (for the reference-definition check).
    root: &'a str,
    options: &'a Options,
    ctx: &'a Ctx<'a>,
    has_tab: bool,
    /// Whether the whole document holds `|`: the full engine's line rules
    /// read it from a document-wide flag, which stretches overwrite.
    has_pipe: bool,
    seen: crate::slug::Seen,
    /// Heading text for IDs, reused across headings.
    text: String,
    /// A heading's slug and its ID attribute, reused across headings.
    slug: String,
    attribute: String,
    /// Whether the document defines references is decided lazily (see
    /// `defines_references`), the first time a stretch, a nested list item
    /// a table or a fence holds a line that could start one. Tier 1's
    /// paragraphs, headings and single-line items start with letters,
    /// markers or `#`.
    references_checked: bool,
    /// Set when the definition check found the document defines references
    /// (the walk then stops; `render_inner` renders the extracted content).
    found_definitions: bool,
    /// Whether extraction, reading the document line by line, is at the same
    /// place as tier 1's root walk: true until a root block that tier 1 did
    /// not read the way extraction does (a table, a list, a handed-over
    /// stretch) holds a line extraction would open a fence or HTML block on.
    /// While it holds, a root fence or HTML block is one extraction skips
    /// whole too, so its lines need no definition check.
    in_step: bool,
    /// List-item nesting of the current walk (0 is the document itself).
    depth: usize,
    /// The document's lines, built once for whichever needs them first: a
    /// root list or HTML block, or the definition check.
    root_lines: Option<std::rc::Rc<Lines<'a>>>,
}

impl<'a> Walk<'a> {
    /// The document's lines (see `root_lines`).
    fn root_lines(&mut self) -> std::rc::Rc<Lines<'a>> {
        let root = self.root;
        self.root_lines.get_or_insert_with(|| std::rc::Rc::new(Lines::new(root))).clone()
    }

    /// Tier 1 renders `text` itself: if it holds a line that could start a
    /// reference definition, check (once) that the whole document defines
    /// none. None when it does (the document then goes to the full engine).
    fn check_definitions(&mut self, text: &str) -> Option<()> {
        if !self.references_checked && may_start_definition(text.as_bytes()) {
            let defines = match may_define_references(self.root) {
                Some(answer) => answer,
                None => crate::refs::defines_any(&self.root_lines().lines),
            };
            if defines {
                self.found_definitions = true;
                return None;
            }
            self.references_checked = true;
        }
        Some(())
    }
}

/// Reading the lines of `b` from outside any fence, as extraction does, does
/// it end outside one again, without reaching a line that starts an HTML
/// block on the way? Its
/// fence rule: three or more backticks or tildes after up to three spaces
/// open one, `closesFence` ends it.
fn extraction_ends_clear(b: &[u8]) -> bool {
    let mut fence: Option<(u8, usize)> = None;
    let mut at = 0;
    while at < b.len() {
        let end = crate::scan::find_byte(b, at, b'\n').unwrap_or(b.len());
        let line = &b[at..end];
        match fence {
            Some((marker, length)) => {
                if std::str::from_utf8(line).is_ok_and(|line| block::closes_fence(line, marker, length)) {
                    fence = None;
                }
            }
            None => {
                let spaces = line.iter().take(3).take_while(|&&c| c == b' ').count();
                match line.get(spaces) {
                    // Extraction reads an HTML block only where one starts
                    // (decided by that line alone); other `<` lines are text.
                    Some(b'<') if std::str::from_utf8(line).map_or(true, crate::html::starts_html_block) => return false,
                    Some(&marker @ (b'`' | b'~')) => {
                        let length = line[spaces..].iter().take_while(|&&c| c == marker).count();
                        if length >= 3 {
                            fence = Some((marker, length));
                        }
                    }
                    _ => {}
                }
            }
        }
        at = end + 1;
    }
    fence.is_none()
}

impl Walk<'_> {
    /// A root block tier 1 rendered without reading it as extraction does:
    /// extraction stays in step if, read its way, the block's lines leave it
    /// outside any fence again (and never at an HTML block).
    fn note_block(&mut self, text: &str) {
        if self.depth == 0 && self.in_step && !extraction_ends_clear(text.as_bytes()) {
            self.in_step = false;
        }
    }

    /// Whether a root fence or HTML block needs no definition check.
    fn skipped_by_extraction(&self) -> bool {
        self.depth == 0 && self.in_step
    }
}

/// Could a line of `b` start a reference definition for extraction? A
/// superset of the lines its readers take: `[` after up to three spaces, or
/// a column-0 `>` followed by whitespace and then `[` (the quoted reader takes
/// any one whitespace character, then up to three spaces; non-ASCII bytes
/// count as whitespace here), where the rest of the line can hold a label
/// (`may_hold_label`). Lines without `[` are never looked at.
/// After a definition's `[`: a one-line label ends at `]:`, and a label
/// that goes on to the next line holds `]` only escaped (label items are
/// `\` with punctuation, or any character but brackets and newline). So a
/// line with neither `]:` nor only escaped `]`s starts no definition: a link
/// (`[a](b)`), a task box (`[ ]`).
fn may_hold_label(rest: &[u8]) -> bool {
    let mut from = 0;
    let mut bare_close = false;
    while let Some(at) = crate::scan::find_byte(rest, from, b']') {
        if rest.get(at + 1) == Some(&b':') {
            return true;
        }
        bare_close |= at == 0 || rest[at - 1] != b'\\';
        from = at + 1;
    }
    !bare_close
}

fn may_start_definition(b: &[u8]) -> bool {
    let mut from = 0;
    while let Some(at) = crate::scan::find_byte(b, from, b'[') {
        let line_start = b[..at].iter().rposition(|&c| c == b'\n').map_or(0, |n| n + 1);
        let prefix = &b[line_start..at];
        let spaces = prefix.iter().take_while(|&&c| c == b' ').count().min(3);
        let quoted = prefix.first() == Some(&b'>') && prefix[1..].iter().all(|&c| matches!(c, b' ' | b'\t' | 0x0b | 0x0c) || c >= 0x80);
        let line_end = crate::scan::find_byte(b, at, b'\n').unwrap_or(b.len());
        if (spaces == prefix.len() || quoted) && may_hold_label(&b[at + 1..line_end]) {
            return true;
        }
        // Later `[`s on this line have this one in their prefix.
        from = line_end + 1;
    }
    false
}

/// One block's span in the output and whether it is a paragraph (tight list
/// items render paragraphs without `<p>`).
type Span = (usize, usize, bool);

/// The blocks of `source` (the document, or a list item's lines) into `out`,
/// joined by newlines; with `spans`, also each block's span and kind.
fn walk(source: &str, state: &mut Walk, out: &mut String, mut spans: Option<&mut Vec<Span>>) -> Option<()> {
    let b = source.as_bytes();
    let mut lines: Option<std::rc::Rc<Lines>> = None;
    let mut first_block = true;
    let mut pos = 0;
    while pos < b.len() {
        let lead = b[pos];
        if lead == b'\n' {
            pos += 1;
            continue;
        }
        if lead == b' ' && is_blank_from(b, pos) {
            // Blank (JavaScript's trim would see only ASCII spaces here).
            pos = line_end(b, pos) + 1;
            continue;
        }
        let before_separator = out.len();
        if !first_block {
            out.push('\n');
        }
        let block_start = out.len();
        match block(source, pos, state, &mut lines, out) {
            Some((next, paragraph)) => {
                if let Some(spans) = spans.as_deref_mut() {
                    spans.push((block_start, out.len(), paragraph));
                }
                pos = next;
            }
            None => {
                // Tier 1 cannot render this block: the full engine renders the
                // stretch up to the next point where it starts afresh.
                out.truncate(block_start);
                // Without tabs the full engine reads these very lines: it
                // parses one block where tier 1 stands, and says where it
                // stopped (see `parse_blocks_until`). With tabs (it reads
                // expanded lines) it renders the stretch up to the next point
                // where it starts afresh.
                let (end, blocks) = if state.has_tab {
                    let end = segment_end(source, pos, state.options.safe).min(b.len());
                    state.check_definitions(&source[pos..end])?;
                    let blocks = block::parse_markdown_with_references(&source[pos..end], state.options, &mut state.seen, state.ctx.references).ok()?;
                    (end, blocks)
                } else {
                    let table = lines.get_or_insert_with(|| if state.depth == 0 { state.root_lines() } else { std::rc::Rc::new(Lines::new(source)) }).clone();
                    let index = table.index_of(pos);
                    block::set_document_flags(state.has_pipe, false);
                    let (blocks, next) = block::parse_blocks_until(&table.lines, index, state.ctx, &mut state.seen, 1).ok()?;
                    let end = table.starts.get(next).copied().unwrap_or(b.len()).min(b.len());
                    state.check_definitions(&source[pos..end])?;
                    (end, blocks)
                };
                state.note_block(&source[pos..end]);
                HANDED_OVER.with(|handed| handed.set(handed.get() + end - pos));
                TRACE.with(|trace| {
                    if let Some(trace) = trace.borrow_mut().as_mut() {
                        trace.push((end - pos, source[pos..line_end(b, pos).min(end)].to_string()));
                    }
                });
                if blocks.is_empty() {
                    out.truncate(before_separator);
                    pos = end;
                    continue;
                }
                for (index, block) in blocks.iter().enumerate() {
                    if index > 0 {
                        out.push('\n');
                    }
                    let start = out.len();
                    crate::render::render_block(block, out);
                    if let Some(spans) = spans.as_deref_mut() {
                        spans.push((start, out.len(), matches!(block, crate::ast::Block::Paragraph { .. })));
                    }
                }
                pos = end;
            }
        }
        first_block = false;
    }
    Some(())
}

/// A (sub)document's lines and where each starts, built the first time a
/// list needs the full engine's line-based item rules.
struct Lines<'a> {
    lines: Vec<&'a str>,
    starts: Vec<usize>,
}

impl<'a> Lines<'a> {
    fn new(source: &'a str) -> Self {
        // `scan::lines` and the starts in one pass over the whole document,
        // eight bytes at a time: every newline in a word, not a search per
        // line (real documents average some 25 bytes a line).
        const LOW: u64 = 0x0101_0101_0101_0101;
        const SEVEN: u64 = 0x7f7f_7f7f_7f7f_7f7f;
        let b = source.as_bytes();
        let capacity = b.len() / 16 + 1;
        let (mut lines, mut starts) = (Vec::with_capacity(capacity), Vec::with_capacity(capacity));
        let mut start = 0;
        let mut i = 0;
        while i + 8 <= b.len() {
            let word = u64::from_le_bytes(b[i..i + 8].try_into().expect("eight bytes")) ^ (LOW * u64::from(b'\n'));
            // The high bit of exactly the zero bytes (the newlines): no
            // carry crosses a byte.
            let mut newlines = !(((word & SEVEN) + SEVEN) | word | SEVEN);
            while newlines != 0 {
                let end = i + (newlines.trailing_zeros() / 8) as usize;
                lines.push(&source[start..end]);
                starts.push(start);
                start = end + 1;
                newlines &= newlines - 1;
            }
            i += 8;
        }
        for (at, &byte) in b.iter().enumerate().skip(i) {
            if byte == b'\n' {
                lines.push(&source[start..at]);
                starts.push(start);
                start = at + 1;
            }
        }
        lines.push(&source[start..]);
        starts.push(start);
        Lines { lines, starts }
    }

    fn index_of(&self, pos: usize) -> usize {
        self.starts.partition_point(|&start| start <= pos) - 1
    }
}

/// Does the whole document define references, by the full engine's own
/// extraction (which skips fenced code and HTML blocks)? With none, it
/// leaves every line unchanged, so tier 1 and the stretches see what the
/// full engine sees. Tabs change how it reads indentation: a document with
/// tabs counts as defining them. None when only extraction itself can tell
/// (the caller runs it over the document's shared lines).
fn may_define_references(source: &str) -> Option<bool> {
    let b = source.as_bytes();
    // No line that could start a definition: extraction finds none.
    if !may_start_definition(b) {
        return Some(false);
    }
    let mut from = 0;
    loop {
        match crate::scan::find_byte(b, from, b']') {
            Some(at) if b.get(at + 1) == Some(&b':') => break,
            Some(at) => from = at + 1,
            None => return Some(false),
        }
    }
    if crate::scan::find_byte(b, 0, b'\t').is_some() {
        return Some(true);
    }
    // Extraction decides (`refs::defines_any` over the document's lines).
    None
}

/// One block at `pos` (not blank) in tier 1: the position after it and
/// whether it is a paragraph, or None when it is outside the subset (`out`
/// may hold a partial block then).
fn block<'a, 'w: 'a>(source: &'a str, pos: usize, state: &mut Walk<'w>, lines: &mut Option<std::rc::Rc<Lines<'a>>>, out: &mut String) -> Option<(usize, bool)> {
    let b = source.as_bytes();
    let lead = b[pos];
    // `isTableStart` comes before paragraphs and lists (and after every
    // construct that cannot hold a `|` line at a block start).
    if (lead == b'|' || lead.is_ascii_alphabetic()) && table_starts(source, pos, state.has_pipe) {
        return Some((checked_table(source, pos, state, out)?, false));
    }
    if lead.is_ascii_alphabetic() {
        return checked_paragraph(source, pos, state, out);
    }
    // Up to three spaces before a letter: only a paragraph (or a table,
    // checked on the whole line), whose first line `normalizeParagraphLine`
    // leaves as the text after the spaces.
    if lead == b' ' {
        let spaces = b[pos..].iter().take(3).take_while(|&&c| c == b' ').count();
        if b.get(pos + spaces).is_some_and(u8::is_ascii_alphabetic) {
            if table_starts(source, pos, state.has_pipe) {
                return Some((checked_table(source, pos, state, out)?, false));
            }
            return checked_paragraph(source, pos + spaces, state, out);
        }
    }
    let eol = line_end(b, pos);
    let line = &source[pos..eol];
    // An indented or tilde fence at a block start: its extent by the full
    // engine's own rules, and the full engine renders it.
    if matches!(lead, b' ' | b'~') {
        if let Some(end) = fence_extent(source, pos) {
            return Some((full_fence(source, pos, end, state, out)?, false));
        }
    }
    // Leads that, past the constructs `parseBlocks` tries first (a fence for
    // a backtick; a thematic break and a list for `*` and `_`), can only
    // start a paragraph.
    let paragraph_lead = match lead {
        b'[' | b'!' | b'(' | b'"' => true,
        b'*' | b'_' => !block::is_thematic_break(line) && block::parse_list_marker(line).is_none(),
        // Three backticks that are not a fence: extraction would open one.
        b'`' => !block::fence_start(line) && !line.starts_with("```"),
        // `::name` opens a custom block (or interrupts); `:::x` and the like
        // are text.
        b':' => !block::custom_block_start(crate::js::trim(line)),
        _ => false,
    };
    if paragraph_lead && !line.contains(['\t', '|']) {
        return checked_paragraph(source, pos, state, out);
    }
    if lead != b'`' && line.bytes().any(|c| c == b'\t' || c == b'\r') {
        return None;
    }
    if lead == b'<' && !state.options.safe {
        return Some((html_block(source, pos, state, lines, out)?, false));
    }
    if lead == b'>' {
        // `isTableStart` comes before blockquotes.
        if table_starts(source, pos, state.has_pipe) {
            return Some((checked_table(source, pos, state, out)?, false));
        }
        return Some((blockquote(source, pos, state, lines, out)?, false));
    }
    match lead {
        b'#' => heading(line, state.options, state.ctx, &mut state.seen, &mut state.text, (&mut state.slug, &mut state.attribute), out)?,
        b'`' => {
            // Extraction tracks fences by its own rule, which can fall out of
            // step with the blocks (after a list item's fence, say): a fence's
            // lines get the same check as any other.
            let mark = out.len();
            let end = fenced_code(source, pos, eol, out)?;
            if !state.skipped_by_extraction() && state.check_definitions(&source[pos..end.min(source.len())]).is_none() {
                out.truncate(mark);
                return None;
            }
            return Some((end, false));
        }
        b'-' | b'*' | b'_' if block::is_thematic_break(line) => out.push_str("<hr />"),
        b'-' | b'*' | b'+' | b'0'..=b'9' if table_starts(source, pos, state.has_pipe) => return Some((checked_table(source, pos, state, out)?, false)),
        b'-' | b'*' | b'+' | b'0'..=b'9' => {
            let mark = out.len();
            let next = match list(source, pos, out) {
                Some(next) => next,
                None => {
                    out.truncate(mark);
                    nested_list(source, pos, state, lines, out)?
                }
            };
            state.note_block(&source[pos..next.min(source.len())]);
            return Some((next, false));
        }
        _ => return None,
    }
    Some((eol + 1, false))
}

/// A paragraph (by tier 1, or by the full engine when its inline content is
/// outside the subset), after checking a line of it that starts with `[` (one at the
/// start, or a continuation) for a reference definition.
fn checked_paragraph(source: &str, pos: usize, state: &mut Walk, out: &mut String) -> Option<(usize, bool)> {
    let mark = out.len();
    let (end, bracket, paragraph) = match paragraph(source, pos, out) {
        Some((end, bracket)) => (end, bracket, true),
        None => {
            // Outside the inline subset (or not certain where it ends):
            // the full engine renders the paragraph when its extent is.
            out.truncate(mark);
            let b = source.as_bytes();
            let (last, setext) = paragraph_extent(b, pos)?;
            if !setext.is_some_and(|depth| setext_heading(source, pos, last, depth, state, out).is_some()) {
                full_paragraph(source, pos, last, setext, state, out)?;
                INLINE_FALLBACK.with(|bytes| bytes.set(bytes.get() + last - pos));
                TRACE.with(|trace| {
                    if let Some(trace) = trace.borrow_mut().as_mut() {
                        trace.push((0, source[pos..last].to_string()));
                    }
                });
            }
            // After the last line, and the underline of a setext heading.
            let after = if setext.is_some() { line_end(b, last + 1) } else { last };
            let end = if after < b.len() { after + 1 } else { b.len() };
            (end, source[pos..after].contains('['), setext.is_none())
        }
    };
    if bracket {
        // In step at the root, extraction reaches the paragraph afresh, so its
        // own start test and reader over the paragraph's lines decide
        // (`>` lines interrupt a paragraph), without reading the whole
        // document.
        let local = state.depth == 0 && state.in_step && !state.has_tab && !state.references_checked;
        let defines = if local { defines_at_paragraph(source, pos, end) } else { state.check_definitions(&source[pos..end.min(source.len())]).is_none() };
        if defines {
            if local {
                state.found_definitions = true;
            }
            out.truncate(mark);
            return None;
        }
    }
    Some((end, paragraph))
}

/// Does extraction read a definition in the paragraph starting at `pos`,
/// reached in step with tier 1 and outside any fence? Its own test for
/// where one can start (after a blank line, or after a line it reads as a
/// heading or break) and its reader, from each of the block's lines
/// (`pos..block_end`) over the lines up to the next blank line (where both
/// of its readers stop).
fn defines_at_paragraph(source: &str, pos: usize, block_end: usize) -> bool {
    let b = source.as_bytes();
    let first_can_start = pos == 0 || {
        let previous_start = b[..pos - 1].iter().rposition(|&c| c == b'\n').map_or(0, |n| n + 1);
        let previous = &source[previous_start..pos - 1];
        crate::js::trim(previous).is_empty() || crate::refs::is_reference_start_after_block(previous)
    };
    let mut lines = Vec::new();
    let mut at = pos;
    while at < b.len() {
        let end = line_end(b, at);
        let line = &source[at..end];
        if crate::js::trim(line).is_empty() {
            break;
        }
        lines.push(line);
        at = end + 1;
    }
    // A later line of the block can start one too when the line before it
    // reads as a heading or a break to extraction (`   # h` continues a
    // paragraph). Past the block extraction reads other blocks' lines (a
    // fence, say): only the block's own lines are start positions, though a
    // definition may read on to the blank line.
    let own = source[pos..block_end.min(source.len())].trim_end_matches('\n').split('\n').count();
    (0..lines.len().min(own)).any(|k| {
        let can_start = if k == 0 { first_can_start } else { crate::refs::is_reference_start_after_block(lines[k - 1]) };
        can_start && lines[k].contains('[') && crate::refs::read_reference_definition(&lines, k).is_some()
    })
}

/// A table, after checking its rows for lines that could start a reference
/// definition (rows after the header can start with anything).
fn checked_table(source: &str, pos: usize, state: &mut Walk, out: &mut String) -> Option<usize> {
    let mark = out.len();
    let end = table(source, pos, state.ctx, out)?;
    if state.check_definitions(&source[pos..end]).is_none() {
        out.truncate(mark);
        return None;
    }
    state.note_block(&source[pos..end]);
    Some(end)
}

/// Where the fence opening at `pos` ends (after its closing line, or the
/// input's end), when `pos` starts one by `parseBlocks`' rule: `openingFence`
/// with an info string `parseFenceInfo` takes; it closes at the first line
/// `closesFence` takes. At a tier-1 block start no list item or quote is
/// open, so this is the fence the full engine reads there.
fn fence_extent(source: &str, pos: usize) -> Option<usize> {
    let b = source.as_bytes();
    let eol = line_end(b, pos);
    let fence = block::opening_fence(&source[pos..eol])?;
    block::parse_fence_info(fence.info, fence.marker)?;
    let mut at = eol + 1;
    while at < b.len() {
        let end = line_end(b, at);
        if block::closes_fence(&source[at..end], fence.marker, fence.length) {
            return Some((end + 1).min(b.len()));
        }
        at = end + 1;
    }
    Some(b.len())
}

/// A fence `source[pos..end]` rendered by the full engine on its own (the
/// same lines give the same code block), after the definition check unless
/// extraction skips it whole too (see `Walk::in_step`).
fn full_fence(source: &str, pos: usize, end: usize, state: &mut Walk, out: &mut String) -> Option<usize> {
    let text = &source[pos..end];
    if !state.skipped_by_extraction() {
        state.check_definitions(text)?;
    }
    HANDED_OVER.with(|handed| handed.set(handed.get() + text.len()));
    let blocks = block::parse_markdown_with_references(text, state.options, &mut state.seen, state.ctx.references).ok()?;
    for (index, block) in blocks.iter().enumerate() {
        if index > 0 {
            out.push('\n');
        }
        crate::render::render_block(block, out);
    }
    Some(end)
}

/// A column-0 HTML block (`safe: false`), read by the full engine's own
/// `readHtmlBlock` at this line, as `parseBlocks` tries it first. Its lines
/// get the reference-definition check (extraction skips HTML blocks by a
/// rule of its own).
fn html_block<'a, 'w: 'a>(source: &'a str, pos: usize, state: &mut Walk<'w>, lines: &mut Option<std::rc::Rc<Lines<'a>>>, out: &mut String) -> Option<usize> {
    let lines = lines.get_or_insert_with(|| if state.depth == 0 { state.root_lines() } else { std::rc::Rc::new(Lines::new(source)) }).clone();
    let index = lines.index_of(pos);
    let (value, end) = crate::html::read_html_block(&lines.lines, index)?;
    // The full engine reads the block from tab-expanded lines.
    if value.contains('\t') {
        return None;
    }
    if !state.skipped_by_extraction() {
        state.check_definitions(&value)?;
    }
    out.push_str(&value);
    Some(lines.starts.get(end + 1).copied().unwrap_or(source.len()))
}

/// A blockquote: its lines by the full engine's own rules
/// (`collect_blockquote`: markers, lazy continuations), rendered by tier 1 as
/// a document of their own, as `renderBlock` wraps them. Tabs anywhere leave
/// it to the full engine (it expands them from the marker's column).
fn blockquote<'a, 'w: 'a>(source: &'a str, pos: usize, state: &mut Walk<'w>, lines: &mut Option<std::rc::Rc<Lines<'a>>>, out: &mut String) -> Option<usize> {
    if state.has_tab {
        return None;
    }
    let table = lines.get_or_insert_with(|| if state.depth == 0 { state.root_lines() } else { std::rc::Rc::new(Lines::new(source)) }).clone();
    let index = table.index_of(pos);
    block::set_document_flags(state.has_pipe, false);
    let (quote_lines, next) = block::collect_blockquote(&table.lines, index, state.options);
    let end = table.starts.get(next).copied().unwrap_or(source.len());
    let text = quote_lines.join("\n");
    // Extraction reads the document's own lines (`>` and all): the check
    // looks at those.
    let raw = &source[pos..end.min(source.len())];
    state.check_definitions(raw)?;
    state.note_block(raw);
    out.push_str("<blockquote>\n");
    let mark = out.len();
    state.depth += 1;
    let walked = walk(&text, state, out, None);
    state.depth -= 1;
    walked?;
    if out.len() > mark {
        out.push('\n');
    }
    out.push_str("</blockquote>");
    Some(end)
}

/// `isTableStart` at `pos`: the line holds `|` and the next is a delimiter row.
fn table_starts(source: &str, pos: usize, has_pipe: bool) -> bool {
    if !has_pipe {
        return false;
    }
    let b = source.as_bytes();
    // A `|` before the line's end, in one scan.
    let Some(at) = crate::scan::find_any_n(b, pos, *b"|\n") else { return false };
    if b[at] == b'\n' {
        return false;
    }
    let eol = line_end(b, at);
    if eol >= b.len() {
        return false;
    }
    let next = &source[eol + 1..line_end(b, eol + 1)];
    !next.is_empty() && block::is_table_delimiter_row(next)
}

/// A list the single-line shape does not cover, read by the full engine's
/// own rules: the outer loop of `parseBlocks`' list branch, and each item's
/// lines from `collect_list_item` (continuations, blank lines, nested
/// markers, looseness). Tier 1 then renders every item's lines as a document
/// of their own, and assembles tight items as `renderListItemChildrenFast`
/// does. Tabs anywhere leave it to the full engine (it expands them first).
fn nested_list<'a, 'w: 'a>(source: &'a str, pos: usize, state: &mut Walk<'w>, lines: &mut Option<std::rc::Rc<Lines<'a>>>, out: &mut String) -> Option<usize> {
    if state.has_tab {
        return None;
    }
    let lines = lines.get_or_insert_with(|| if state.depth == 0 { state.root_lines() } else { std::rc::Rc::new(Lines::new(source)) }).clone();
    let start_index = lines.index_of(pos);
    // The item rules read the document's flags; a stretch rendered earlier
    // left its own there.
    block::set_document_flags(state.has_pipe, false);
    let opening = block::parse_list_marker(lines.lines[start_index])?;
    let mut items: Vec<(Option<bool>, String)> = Vec::new();
    let mut tight = true;
    let mut index = start_index;
    while index < lines.lines.len() {
        if !items.is_empty() && block::is_thematic_break(lines.lines[index]) {
            break;
        }
        let Some(marker) = block::parse_list_marker(lines.lines[index]) else { break };
        if marker.ordered != opening.ordered || marker.marker != opening.marker {
            break;
        }
        let (checked, body) = block::task_box(&marker.body);
        let (item_lines, end, loose) = block::collect_list_item(body, &lines.lines, index, &opening, marker.content_indent, state.options);
        if loose {
            tight = false;
        }
        items.push((checked, item_lines.join("\n")));
        index = end + 1;
    }
    // Extraction reads the document's own lines: check those as well as each
    // item's de-indented text.
    let list_end = lines.starts.get(index).copied().unwrap_or(source.len());
    state.check_definitions(&source[pos..list_end])?;
    let tag = if opening.ordered { "ol" } else { "ul" };
    out.push('<');
    out.push_str(tag);
    if let Some(start) = opening.start.filter(|&n| n != 1) {
        out.push_str(" start=\"");
        out.push_str(&start.to_string());
        out.push('"');
    }
    out.push_str(">\n");
    // One body buffer and span list for all the items (each is cleared first).
    let mut body = String::new();
    let mut spans: Vec<Span> = Vec::new();
    for (item_index, (checked, item)) in items.iter().enumerate() {
        if item_index > 0 {
            out.push('\n');
        }
        out.push_str("<li");
        if *checked == Some(true) {
            out.push_str(" data-checked");
        }
        out.push('>');
        body.clear();
        spans.clear();
        state.depth += 1;
        let walked = walk(item, state, &mut body, Some(&mut spans));
        state.depth -= 1;
        walked?;
        list_item_children(&body, &spans, tight, out);
        out.push_str("</li>");
    }
    out.push_str("\n</");
    out.push_str(tag);
    out.push('>');
    Some(lines.starts.get(index).copied().unwrap_or(source.len()))
}

/// `renderListItemChildrenFast` over rendered children: loose items keep
/// them as they are, between newlines; tight items drop paragraphs' `<p>`
/// and place newlines by whether the first and last child are paragraphs.
fn list_item_children(body: &str, spans: &[Span], tight: bool, out: &mut String) {
    if spans.is_empty() {
        return;
    }
    if !tight {
        out.push('\n');
        out.push_str(body);
        out.push('\n');
        return;
    }
    let has_block_child = spans.iter().any(|&(_, _, paragraph)| !paragraph);
    let first_paragraph = spans[0].2;
    let last_paragraph = spans[spans.len() - 1].2;
    // A newline before the children when a block child is first or a
    // paragraph is last, after them when a block child is last.
    if has_block_child && (last_paragraph || !first_paragraph) {
        out.push('\n');
    }
    for (index, &(start, end, paragraph)) in spans.iter().enumerate() {
        if index > 0 {
            out.push('\n');
        }
        // A paragraph renders as `<p>…</p>`: its inline content is inside.
        out.push_str(if paragraph { &body[start + 3..end - 4] } else { &body[start..end] });
    }
    if has_block_child && !last_paragraph {
        out.push('\n');
    }
}

/// Where a stretch handed to the full engine can end: the first line, after
/// at least one line, that follows a blank line and starts at column 0 with
/// an ASCII letter, `#`, a fence or `<`. There the full engine starts a new
/// top-level block whatever came before: a blank line ends paragraphs,
/// quotes, tables and setext candidates, and a column-0 line that is not a
/// list marker ends any list item and indented code.
///
/// A fence at column 0 is always top-level (list item content is indented
/// at least two columns, quote lines start with `>`), so the scan steps over
/// it exactly, by the full engine's own fence rules. Constructs that can
/// span blank lines past a boundary send the rest of the document instead:
/// any other line that could open a fence (an indented fence keeps a list
/// item open across blank lines), custom blocks, and lines that start an
/// HTML block when HTML is allowed (a stretch ending at a `<` boundary holds none: its own `<`
/// lines would have sent the rest already).
fn segment_end(source: &str, from: usize, safe: bool) -> usize {
    let b = source.as_bytes();
    let mut pos = from;
    let mut previous_blank = false;
    let mut first = true;
    while pos < b.len() {
        let eol = line_end(b, pos);
        let line = &b[pos..eol];
        if !first && previous_blank && line.first().is_some_and(|&c| c.is_ascii_alphabetic() || matches!(c, b'#' | b'`' | b'~' | b'<')) {
            return pos;
        }
        let at_start = first;
        first = false;
        if line.starts_with(b"::") && (at_start || previous_blank) {
            if let Some(after) = column_zero_custom_block_end(source, pos, eol) {
                pos = after;
                previous_blank = false;
                continue;
            }
        }
        // A fence-looking line holding `|` right after another line can be a
        // table row (rows go on while a line holds `|`), not a fence.
        if matches!(line.first(), Some(b'`' | b'~')) && (at_start || previous_blank || !line.contains(&b'|')) {
            if let Some(after) = column_zero_fence_end(source, pos, eol) {
                pos = after;
                previous_blank = false;
                continue;
            }
        }
        let indent = line.iter().take_while(|&&c| c == b' ').count();
        let hazard = may_open_fence(line)
            || std::str::from_utf8(line).map_or(true, |line| block::custom_block_start(crate::js::trim(line)))
            || (!safe && indent <= 3 && line.get(indent) == Some(&b'<') && std::str::from_utf8(line).map_or(true, crate::html::starts_html_block));
        if hazard {
            return b.len();
        }
        previous_blank = line.iter().all(|&c| c == b' ');
        pos = eol + 1;
    }
    b.len()
}

/// Could this line open a fenced code block anywhere: at its start after
/// indentation, list markers, task boxes or quote markers (all stripped
/// generously, so this only ever says yes too often)?
fn may_open_fence(line: &[u8]) -> bool {
    let mut rest = line;
    loop {
        let blank = rest.iter().take_while(|&&c| c == b' ' || c == b'\t').count();
        rest = &rest[blank..];
        if let Some(after) = rest.strip_prefix(b">") {
            rest = after;
            continue;
        }
        if matches!(rest.first(), Some(b'-' | b'*' | b'+')) && matches!(rest.get(1), Some(b' ' | b'\t')) {
            rest = &rest[1..];
            continue;
        }
        let digits = rest.iter().take_while(|c| c.is_ascii_digit()).count();
        if digits > 0 && matches!(rest.get(digits), Some(b'.' | b')')) && matches!(rest.get(digits + 1), Some(b' ' | b'\t')) {
            rest = &rest[digits + 1..];
            continue;
        }
        // A task box (`taskBox`): `[ ]`, `[x]` or `[X]`, then any JavaScript
        // whitespace, all of which comes off.
        if rest.len() >= 3 && rest[0] == b'[' && matches!(rest[1], b' ' | b'x' | b'X') && rest[2] == b']' {
            let after = std::str::from_utf8(&rest[3..]).unwrap_or("");
            let trimmed = crate::js::trim_start(after);
            if trimmed.len() < after.len() {
                rest = &rest[3 + after.len() - trimmed.len()..];
                continue;
            }
        }
        break;
    }
    rest.starts_with(b"```") || rest.starts_with(b"~~~")
}

/// A custom block (`::name`) opening at column 0 on `start..eol` at a fresh
/// top-level position (the stretch's start, or after a blank line), read by
/// the full engine's own `readCustomBlock`: the position after it. None when
/// the line does not open one.
fn column_zero_custom_block_end(source: &str, start: usize, eol: usize) -> Option<usize> {
    block::custom_block_name(crate::js::trim(&source[start..eol]))?;
    let lines = crate::scan::lines(&source[start..]);
    let (_, end_index, _) = block::read_custom_block(&lines, 0);
    let b = source.as_bytes();
    let mut pos = start;
    for _ in 0..=end_index {
        pos = line_end(b, pos) + 1;
    }
    Some(pos.min(b.len()))
}

/// A fenced code block opening at column 0 on `start..eol`, read by the full
/// engine's rules: the position after its closing fence (or the end of the
/// input when it never closes). None when the line does not open one.
fn column_zero_fence_end(source: &str, start: usize, eol: usize) -> Option<usize> {
    let b = source.as_bytes();
    let fence = block::opening_fence(&source[start..eol])?;
    block::parse_fence_info(fence.info, fence.marker)?;
    let mut pos = eol + 1;
    while pos < b.len() {
        let end = line_end(b, pos);
        if block::closes_fence(&source[pos..end], fence.marker, fence.length) {
            return Some(end + 1);
        }
        pos = end + 1;
    }
    Some(b.len())
}

/// A paragraph starting at `start` (an ASCII letter); the position after it.
/// Its lines are contiguous in the source and joined by `\n`, exactly the
/// paragraph source the full engine builds, so it is read in place, in one
/// pass that also decides where it ends.
fn paragraph(source: &str, start: usize, out: &mut String) -> Option<(usize, bool)> {
    let b = source.as_bytes();
    out.push_str("<p>");
    // The paragraph's (space-trimmed) end, computed at the first backtick:
    // a code span must close inside the paragraph.
    let mut text_limit: Option<usize> = None;
    let mut run = start;
    let mut i = start;
    // Whether the paragraph holds a `[` (then the caller checks its lines
    // for reference definitions).
    let mut bracket = false;
    let end = loop {
        // Eight bytes at a time while none of them needs a look: first the
        // common case (lower-case letters and spaces) in arithmetic, then the
        // class table.
        while i + 8 <= b.len() {
            if lower_or_space(u64::from_le_bytes(b[i..i + 8].try_into().expect("eight bytes"))) {
                i += 8;
                continue;
            }
            let w = &b[i..i + 8];
            let any = CLASS[w[0] as usize] | CLASS[w[1] as usize] | CLASS[w[2] as usize] | CLASS[w[3] as usize]
                | CLASS[w[4] as usize] | CLASS[w[5] as usize] | CLASS[w[6] as usize] | CLASS[w[7] as usize];
            if any != PLAIN {
                // Straight to the chunk's first byte that needs a look (the
                // plain ones before it would each repeat this test).
                i += w.iter().position(|&c| CLASS[c as usize] != PLAIN).unwrap_or(0);
                break;
            }
            i += 8;
        }
        if i >= b.len() {
            break b.len();
        }
        match CLASS[b[i] as usize] {
            PLAIN => i += 1,
            NEWLINE => {
                if continues_after(b, i)? {
                    i += 1;
                } else {
                    break i;
                }
            }
            GREATER | QUOTE => {
                out.push_str(&source[run..i]);
                out.push_str(if b[i] == b'>' { "&gt;" } else { "&quot;" });
                i += 1;
                run = i;
            }
            COLON => {
                // `://` may start a bare URL.
                if b[i + 1..].starts_with(b"//") {
                    return None;
                }
                i += 1;
            }
            BACKTICK => {
                let limit = match text_limit {
                    Some(limit) => limit,
                    None => {
                        let limit = trim_spaces_end(b, i, paragraph_end(b, i)?);
                        text_limit = Some(limit);
                        limit
                    }
                };
                match crate::inline::match_code_span(&b[..limit], i) {
                    Some((span_end, (value_start, value_end))) => {
                        let value = &source[value_start..value_end];
                        if value.contains('[') {
                            // Its lines are the document's too (the definition check).
                            bracket = true;
                            if !brackets_in_code_ok(&b[start..limit]) {
                                return None;
                            }
                        }
                        if !code_span_in_subset(value, true) {
                            return None;
                        }
                        out.push_str(&source[run..i]);
                        code_span(value, out, None);
                        i = span_end;
                        run = span_end;
                    }
                    None => i += 1,
                }
            }
            STAR => {
                let limit = match text_limit {
                    Some(limit) => limit,
                    None => {
                        let limit = trim_spaces_end(b, i, paragraph_end(b, i)?);
                        text_limit = Some(limit);
                        limit
                    }
                };
                let pair = emphasis_pair(b, start, i, limit)?;
                out.push_str(&source[run..i]);
                emphasis(source, &pair, out, None);
                i = pair.end;
                run = pair.end;
            }
            UNDERSCORE => i = literal_underscores(b, start, i)?,
            TILDE => i = lone_tilde(b, start, i)?,
            BRACKET => {
                bracket = true;
                let link = inline_link(b, start, i)?;
                out.push_str(&source[run..i]);
                write_link(source, &link, out, None);
                i = link.end;
                run = link.end;
            }
            _ => return None,
        }
    };
    // `source.trimEnd()` of spaces: the last text run loses them.
    out.push_str(&source[run..trim_spaces_end(b, run, end)]);
    out.push_str("</p>");
    Some((if end < b.len() { end + 1 } else { b.len() }, bracket))
}

/// At the newline `i` inside a paragraph: does the paragraph go on (Some(true)),
/// end at a blank line (Some(false)), or leave the subset (None)? A
/// continuation line must start with a letter (anything else could
/// interrupt the paragraph or underline it), and a space before the newline
/// makes a hard or trimmed soft break.
fn continues_after(b: &[u8], i: usize) -> Option<bool> {
    // A trailing space before a continuation is a hard break: outside the
    // inline subset.
    match line_continues(b, i, false)? {
        true if b[i - 1] == b' ' => None,
        continues => Some(continues),
    }
}

/// `canContinueParagraph` for the line after the newline at `i`: whether it
/// continues the paragraph, or None when that is not certain here. With
/// `pipes`, a line holding `|` declines too (it could start a table that
/// interrupts); without, the caller declines any `|` itself.
fn line_continues(b: &[u8], i: usize, pipes: bool) -> Option<bool> {
    let next = i + 1;
    if is_blank_from(b, next) {
        return Some(false);
    }
    let end = line_end(b, next);
    if pipes && b[next..end].contains(&b'|') {
        return None;
    }
    // Leads `hasParagraphInterruptCandidate` never looks at: the line
    // continues the paragraph.
    let plain_lead = |c: u8| c.is_ascii_alphabetic() || matches!(c, b'[' | b'!' | b'(' | b'"' | b'_');
    // An indented line (the candidate test looks at it trimmed): only the
    // full engine's paragraph, which normalizes the line, takes it (`pipes`).
    let spaces = b[next..end].iter().take_while(|&&c| c == b' ').count();
    if spaces > 0 && !pipes {
        return None;
    }
    let Some(&lead) = b.get(next + spaces) else { return None };
    if plain_lead(lead) {
        return Some(true);
    }
    // `canContinueParagraph` on a line, at most three spaces in, that
    // certainly interrupts: the paragraph ends and the line starts a block
    // of its own (the block tests below allow that indentation). A setext
    // underline (it would make the paragraph a heading) and every other line
    // decline.
    if spaces > 3 || !matches!(lead, b'#' | b'`' | b'-' | b'*' | b'+' | b'>' | b':' | b'0'..=b'9') {
        return None;
    }
    let line = std::str::from_utf8(&b[next..end]).ok()?;
    // A continuation opening with three backticks would be a fence to
    // extraction (see `Walk::in_step`).
    if line[spaces..].starts_with("```") && !block::fence_start(line) {
        return None;
    }
    if line.contains(['|', '\t']) || block::setext_underline(line).is_some() {
        return None;
    }
    let interrupts = block::is_thematic_break(line)
        || block::atx_at_line_start(line)
        || block::fence_start(line)
        || block::is_paragraph_interrupting_list_marker(line)
        || block::blockquote_start(line)
        || block::custom_block_start(crate::js::trim(line));
    // A candidate that does not interrupt continues the paragraph.
    Some(!interrupts)
}

/// The end of the paragraph starting at `start` (its last line's end), by
/// `line_continues` with pipes checked: exact, or None.
fn paragraph_extent(b: &[u8], start: usize) -> Option<(usize, Option<u8>)> {
    let mut eol = line_end(b, start);
    while eol < b.len() {
        // A setext underline ends the lines and makes them a heading.
        if matches!(b.get(eol + 1), Some(b'=' | b'-')) {
            let underline = std::str::from_utf8(&b[eol + 1..line_end(b, eol + 1)]).ok()?;
            if let Some(depth) = block::setext_underline(underline) {
                return Some((eol, Some(depth)));
            }
        }
        if !line_continues(b, eol, true)? {
            break;
        }
        eol = line_end(b, eol + 1);
    }
    Some((eol, None))
}

/// A setext heading over `source[start..end]` in tier 1, when its text (the
/// lines normalized and joined as `parseBlocks` builds it) is in the inline
/// subset.
fn setext_heading(source: &str, start: usize, end: usize, depth: u8, state: &mut Walk, out: &mut String) -> Option<()> {
    let lines = &source[start..end];
    let content: std::borrow::Cow<str> = if lines.contains('\n') {
        let mut joined = String::with_capacity(lines.len());
        for (index, line) in lines.split('\n').enumerate() {
            if index > 0 {
                joined.push('\n');
            }
            joined.push_str(block::normalize_paragraph_line(line));
        }
        let kept = joined.trim_end_matches([' ', '\t']).len();
        joined.truncate(kept);
        joined.into()
    } else {
        crate::js::trim(lines).into()
    };
    heading_content(depth, &content, state.options, &mut state.seen, &mut state.text, (&mut state.slug, &mut state.attribute), out)
}

/// The paragraph `source[start..end]` by the full engine (a heading with a
/// setext underline): its lines normalized and joined as `parseBlocks` does,
/// then `parseInline` and the block's rendering.
fn full_paragraph(source: &str, start: usize, end: usize, setext: Option<u8>, state: &mut Walk, out: &mut String) -> Option<()> {
    let lines = &source[start..end];
    // `parseBlocks` trims a one-line setext heading's text whole.
    if let (Some(depth), false) = (setext, lines.contains('\n')) {
        let heading = block::heading(depth, crate::js::trim(lines), state.ctx, &mut state.seen).ok()?;
        crate::render::render_block(&heading, out);
        return Some(());
    }
    let mut text = String::with_capacity(end - start);
    for (index, line) in source[start..end].split('\n').enumerate() {
        if index > 0 {
            text.push('\n');
        }
        text.push_str(block::normalize_paragraph_line(line));
    }
    let kept = text.trim_end_matches([' ', '\t']).len();
    text.truncate(kept);
    let block = match setext {
        Some(depth) => block::heading(depth, &text, state.ctx, &mut state.seen).ok()?,
        None => crate::ast::Block::Paragraph { children: crate::inline::parse_inline_owned(text, state.ctx).ok()? },
    };
    crate::render::render_block(&block, out);
    Some(())
}

/// Is the line starting at `at` blank (empty or ASCII spaces only)? Steps
/// over its spaces instead of searching for its end.
fn is_blank_from(b: &[u8], at: usize) -> bool {
    let mut i = at;
    while i < b.len() && b[i] == b' ' {
        i += 1;
    }
    i >= b.len() || b[i] == b'\n'
}

/// The end of the paragraph containing `from` (the newline that ends it, or
/// the input's end), checking every line on the way as `continues_after` does.
fn paragraph_end(b: &[u8], from: usize) -> Option<usize> {
    let mut eol = line_end(b, from);
    while eol < b.len() {
        if !continues_after(b, eol)? {
            break;
        }
        eol = line_end(b, eol + 1);
    }
    Some(eol)
}

fn trim_spaces_end(b: &[u8], floor: usize, mut end: usize) -> usize {
    while end > floor && b[end - 1] == b' ' {
        end -= 1;
    }
    end
}

/// Code span content tier 1 can take: the balanced-link pre-scan sees `[`
/// inside code too, tables see `|` anywhere on a line, and tabs or CR change
/// how the whole document is read.
/// A code span's value tier 1 writes itself. A `[` in it only with
/// `brackets` (see `brackets_in_code_ok`): the full engine's balanced-link
/// pre-scan looks at every `[`, code spans included.
fn code_span_in_subset(value: &str, brackets: bool) -> bool {
    !value.bytes().any(|c| matches!(c, b'|' | b'\t' | b'\r') || (c == b'[' && !brackets))
}

/// Can the balanced-link pre-scan (`scanBalancedInlineLinks`) over the
/// inline source `b` find nothing? It acts on a label followed by `(` (an
/// inline link), by `[` (an unresolved reference) or naming a reference; so
/// with no references and neither `](` nor `][` anywhere it finds nothing,
/// and a `[` inside a code span is as inert as the code span makes it.
fn brackets_in_code_ok(b: &[u8]) -> bool {
    if !NO_REFERENCES.with(std::cell::Cell::get) {
        return false;
    }
    let mut from = 0;
    while let Some(at) = crate::scan::find_byte(b, from, b']') {
        if matches!(b.get(at + 1), Some(b'(' | b'[')) {
            return false;
        }
        from = at + 1;
    }
    true
}

/// A table at `start` (header line, then a delimiter row), as `parseBlocks`
/// reads it: rows go on while a line holds `|`; cells are split on every
/// `|` (`splitTableRow`, even inside code), trimmed, and rendered by the
/// inline subset; each row keeps its own cell count and `align` applies by
/// index. The position after the last row (the next block starts there).
/// A table: tier 1 reads its rows and writes each cell in the inline subset;
/// a cell outside it is the full engine's `parseInline` and `renderInline`
/// of that cell alone (cells resolve no references), as `tableCells` does.
fn table(source: &str, start: usize, ctx: &Ctx, out: &mut String) -> Option<usize> {
    let b = source.as_bytes();
    let header_end = line_end(b, start);
    let delimiter_end = line_end(b, header_end + 1);
    let align: Vec<Option<&str>> =
        block::split_table_row(&source[header_end + 1..delimiter_end]).into_iter().map(block::cell_alignment).collect();
    let row = |line: &str, tag: &str, out: &mut String| -> Option<()> {
        if line.bytes().any(|c| c == b'\t' || c == b'\r') {
            return None;
        }
        out.push_str("<tr>");
        for (index, cell) in block::split_table_row(line).into_iter().enumerate() {
            out.push('<');
            out.push_str(tag);
            if let Some(Some(value)) = align.get(index) {
                out.push_str(" align=\"");
                out.push_str(value);
                out.push('"');
            }
            out.push('>');
            let cell = crate::js::trim(cell);
            let mark = out.len();
            if inline(cell, out, None).is_none() {
                out.truncate(mark);
                let empty = References::new();
                let cell_ctx = Ctx { options: ctx.options, references: &empty };
                crate::render::render_inline(&crate::inline::parse_inline(cell, &cell_ctx).ok()?, out);
                INLINE_FALLBACK.with(|bytes| bytes.set(bytes.get() + cell.len()));
            }
            out.push_str("</");
            out.push_str(tag);
            out.push('>');
        }
        out.push_str("</tr>");
        Some(())
    };
    if source[header_end + 1..delimiter_end].bytes().any(|c| c == b'\t' || c == b'\r') {
        return None;
    }
    out.push_str("<table><thead>");
    row(&source[start..header_end], "th", out)?;
    out.push_str("</thead><tbody>");
    let mut pos = (delimiter_end + 1).min(b.len());
    while pos < b.len() {
        let eol = line_end(b, pos);
        let line = &source[pos..eol];
        if !line.contains('|') || crate::js::trim(line).is_empty() {
            break;
        }
        row(line, "td", out)?;
        pos = (eol + 1).min(b.len());
    }
    out.push_str("</tbody></table>");
    Some(pos)
}

/// A list item marker at `at`: (ordered, marker byte, start number, content
/// position). Exactly one space after it, and content starting with a letter.
fn item_marker(b: &[u8], at: usize) -> Option<(bool, u8, u64, usize)> {
    let lead = *b.get(at)?;
    let (ordered, marker, start, after) = if matches!(lead, b'-' | b'*' | b'+') {
        (false, lead, 0, at + 1)
    } else {
        let digits = b[at..].iter().take(10).take_while(|c| c.is_ascii_digit()).count();
        if !(1..=9).contains(&digits) {
            return None;
        }
        let delimiter = *b.get(at + digits)?;
        if delimiter != b'.' && delimiter != b')' {
            return None;
        }
        let start = std::str::from_utf8(&b[at..at + digits]).ok()?.parse().ok()?;
        (true, delimiter, start, at + digits + 1)
    };
    (b.get(after) == Some(&b' ') && b.get(after + 1).is_some_and(u8::is_ascii_alphabetic)).then_some((ordered, marker, start, after + 1))
}

/// A tight list of single-line items starting at `start`; the position after
/// it. Each item is one paragraph, rendered without `<p>` in a tight list.
fn list(source: &str, start: usize, out: &mut String) -> Option<usize> {
    let b = source.as_bytes();
    let (ordered, marker, first_number, _) = item_marker(b, start)?;
    let tag = if ordered { "ol" } else { "ul" };
    out.push('<');
    out.push_str(tag);
    if ordered && first_number != 1 {
        out.push_str(" start=\"");
        out.push_str(&first_number.to_string());
        out.push('"');
    }
    out.push_str(">\n");
    let mut pos = start;
    let mut first_item = true;
    loop {
        let (item_ordered, item_marker_byte, _, content) = item_marker(b, pos)?;
        if item_ordered != ordered || item_marker_byte != marker {
            return None;
        }
        let eol = line_end(b, pos);
        // The marker regex's `(.*)$` fails on a JavaScript line terminator
        // (U+2028/U+2029), which makes the line a paragraph instead.
        if crate::js::has_line_terminator(&source[content..eol]) {
            return None;
        }
        if !first_item {
            out.push('\n');
        }
        first_item = false;
        out.push_str("<li>");
        inline(&source[content..trim_spaces_end(b, content, eol)], out, None)?;
        out.push_str("</li>");
        if eol >= b.len() {
            pos = b.len();
            break;
        }
        let next = eol + 1;
        if is_blank_from(b, next) {
            let mut after = next;
            while after < b.len() && is_blank_from(b, after) {
                after = line_end(b, after) + 1;
            }
            // Only a line that provably cannot continue it may follow: an ASCII
            // letter, `#` or a backtick at column 0. (Spaces and tabs indent a
            // continuation, markers continue the list loosely, and a line that
            // only looks non-blank here, such as NBSP alone, is blank to
            // JavaScript's trim.)
            if after < b.len() && !(b[after].is_ascii_alphabetic() || matches!(b[after], b'#' | b'`')) {
                return None;
            }
            pos = next;
            break;
        }
        // The next line must be the next item; anything else could be a lazy
        // continuation or interrupt the list.
        pos = next;
    }
    out.push_str("\n</");
    out.push_str(tag);
    out.push('>');
    Some(pos)
}

const PLAIN: u8 = 0;
const GREATER: u8 = 1;
const QUOTE: u8 = 2;
const BACKTICK: u8 = 3;
const COLON: u8 = 4;
const OUTSIDE: u8 = 5;
const NEWLINE: u8 = 6;
const STAR: u8 = 7;
const UNDERSCORE: u8 = 8;
const BRACKET: u8 = 9;
const TILDE: u8 = 10;

/// What each byte means inside a paragraph. Outside the subset: escapes,
/// HTML and autolinks, entities, links and images, emphasis,
/// strikethrough, pipes and emails.
static CLASS: [u8; 256] = {
    let mut table = [PLAIN; 256];
    table[b'>' as usize] = GREATER;
    table[b'"' as usize] = QUOTE;
    table[b'`' as usize] = BACKTICK;
    table[b':' as usize] = COLON;
    table[b'\n' as usize] = NEWLINE;
    table[b'*' as usize] = STAR;
    table[b'_' as usize] = UNDERSCORE;
    table[b'[' as usize] = BRACKET;
    table[b'~' as usize] = TILDE;
    let outside = b"\\<&|@\t\r";
    let mut i = 0;
    while i < outside.len() {
        table[outside[i] as usize] = OUTSIDE;
        i += 1;
    }
    table
};

/// `parseInline` + `renderInline` for plain text, soft breaks (`\n`, which
/// renders as itself) and code spans, in one pass. With `text`, also
/// collects `stripInline` of the result (for heading IDs).
fn inline(source: &str, out: &mut String, mut text: Option<&mut String>) -> Option<()> {
    let b = source.as_bytes();
    let mut run = 0;
    let mut i = 0;
    while i < b.len() {
        let class = CLASS[b[i] as usize];
        if class == PLAIN {
            i += 1;
            continue;
        }
        match class {
            GREATER | QUOTE => {
                out.push_str(&source[run..i]);
                out.push_str(if class == GREATER { "&gt;" } else { "&quot;" });
                if let Some(text) = text.as_deref_mut() {
                    text.push_str(&source[run..=i]);
                }
                i += 1;
                run = i;
            }
            COLON => {
                // `://` may start a bare URL.
                if b[i + 1..].starts_with(b"//") {
                    return None;
                }
                i += 1;
            }
            // A soft break (a setext heading's lines); a space before it
            // would make it a hard break or be trimmed.
            NEWLINE if i > 0 && b[i - 1] != b' ' => i += 1,
            BACKTICK => match crate::inline::match_code_span(b, i) {
                Some((end, (value_start, value_end))) => {
                    let value = &source[value_start..value_end];
                    // A code span's newlines become spaces: outside the subset.
                    if !code_span_in_subset(value, value.contains('[') && brackets_in_code_ok(b)) || value.contains('\n') {
                        return None;
                    }
                    out.push_str(&source[run..i]);
                    if let Some(text) = text.as_deref_mut() {
                        text.push_str(&source[run..i]);
                    }
                    code_span(value, out, text.as_deref_mut());
                    i = end;
                    run = end;
                }
                None => i += 1,
            },
            STAR => {
                let pair = emphasis_pair(b, 0, i, b.len())?;
                out.push_str(&source[run..i]);
                if let Some(text) = text.as_deref_mut() {
                    text.push_str(&source[run..i]);
                }
                emphasis(source, &pair, out, text.as_deref_mut());
                i = pair.end;
                run = pair.end;
            }
            UNDERSCORE => i = literal_underscores(b, 0, i)?,
            TILDE => i = lone_tilde(b, 0, i)?,
            BRACKET => {
                let link = inline_link(b, 0, i)?;
                out.push_str(&source[run..i]);
                if let Some(text) = text.as_deref_mut() {
                    text.push_str(&source[run..i]);
                }
                write_link(source, &link, out, text.as_deref_mut());
                i = link.end;
                run = link.end;
            }
            _ => return None,
        }
    }
    out.push_str(&source[run..]);
    if let Some(text) = text {
        text.push_str(&source[run..]);
    }
    Some(())
}

/// A `~` with no `~` next to it: `matchDelete` needs `~~` to start and stops
/// a deletion at any `~`, so it is text. The position after it, or None.
fn lone_tilde(b: &[u8], floor: usize, at: usize) -> Option<usize> {
    let before = at > floor && b[at - 1] == b'~';
    (!before && b.get(at + 1) != Some(&b'~')).then_some(at + 1)
}

/// An emphasis or strong pair in the subset: the run at `opener` and its
/// closer, with the content between them.
struct EmphasisPair {
    strong: bool,
    content_start: usize,
    content_end: usize,
    end: usize,
}

/// A `*` pair whose result is provably the emphasis algorithm's: a run of one
/// or two `*` after a space, a newline or the start (`floor`), followed by an
/// ASCII letter or digit, so it can only open; plain text up to a run of the
/// same length after an ASCII letter or digit, followed by a space, a
/// newline, the end (`limit`) or `.,;:!?)`, or after one of `.,;:!?)` and
/// followed by a space, a newline or the end, so it can only close. With every
/// `*` in such disjoint pairs, each closer pairs with its own opener. Content
/// may hold soft breaks but no other delimiter, code or syntax.
fn emphasis_pair(b: &[u8], floor: usize, opener: usize, limit: usize) -> Option<EmphasisPair> {
    let length = b[opener..limit].iter().take_while(|&&c| c == b'*').count();
    if length > 2 || (opener > floor && !matches!(b[opener - 1], b' ' | b'\n')) {
        return None;
    }
    let content_start = opener + length;
    if !b.get(content_start).is_some_and(u8::is_ascii_alphanumeric) || content_start >= limit {
        return None;
    }
    let mut j = content_start;
    while j < limit {
        match b[j] {
            b'*' => {
                let run = b[j..limit].iter().take_while(|&&c| c == b'*').count();
                let after = j + run;
                // After a letter or digit, it closes before a space, a newline,
                // the end or `.,;:!?)`; after `.,;:!?)` (right-flanking for
                // punctuation only when what follows is whitespace), before a
                // space, a newline or the end.
                let followed_by_space = after == limit || matches!(b[after], b' ' | b'\n');
                let closes = run == length
                    && if b[j - 1].is_ascii_alphanumeric() {
                        followed_by_space || matches!(b[after], b'.' | b',' | b';' | b':' | b'!' | b'?' | b')')
                    } else {
                        matches!(b[j - 1], b'.' | b',' | b';' | b':' | b'!' | b'?' | b')') && followed_by_space
                    };
                return closes.then_some(EmphasisPair { strong: length == 2, content_start, content_end: j, end: after });
            }
            b':' if b[j + 1..limit].starts_with(b"//") => return None,
            c if CLASS[c as usize] != PLAIN && !matches!(c, b'\n' | b'>' | b'"' | b':') => return None,
            _ => j += 1,
        }
    }
    None
}

fn emphasis(source: &str, pair: &EmphasisPair, out: &mut String, text: Option<&mut String>) {
    let content = &source[pair.content_start..pair.content_end];
    let tag = if pair.strong { "strong" } else { "em" };
    out.push('<');
    out.push_str(tag);
    out.push('>');
    escape_html_into(out, content);
    out.push_str("</");
    out.push_str(tag);
    out.push('>');
    if let Some(text) = text {
        text.push_str(content);
    }
}

/// Are all eight bytes of `word` ASCII lower-case letters or spaces (both
/// `PLAIN`)? Exact per byte: with no high bit set no addition carries into
/// the next byte.
fn lower_or_space(word: u64) -> bool {
    const HIGH: u64 = 0x8080_8080_8080_8080;
    const LOW7: u64 = 0x7f7f_7f7f_7f7f_7f7f;
    if word & HIGH != 0 {
        return false;
    }
    // A byte's high bit after adding 0x1f: it is at least `a`; after 0x05: past `z`.
    let at_least_a = word.wrapping_add(0x1f1f_1f1f_1f1f_1f1f);
    let past_z = word.wrapping_add(0x0505_0505_0505_0505);
    let lower = at_least_a & !past_z & HIGH;
    // A space XOR 0x20 is zero: its high bit stays clear after the add.
    let spaced = word ^ 0x2020_2020_2020_2020;
    let space = !((spaced & LOW7).wrapping_add(LOW7) | spaced) & HIGH;
    lower | space == HIGH
}

/// An inline link in the subset: the label and destination ranges.
struct Link {
    label: (usize, usize),
    destination: (usize, usize),
    end: usize,
}

/// `[label](destination)` whose result is provably the full engine's: the
/// balanced-link pre-scan finds it, the pieces around it parse on their own
/// (none of them can hold syntax that would reach across it), the label is
/// plain text on one line, and the destination holds only characters that
/// `encodeURI` leaves alone and entity decoding never sees, so the href is the
/// destination as written. Not an image (`![`), not `javascript:`.
fn inline_link(b: &[u8], floor: usize, open: usize) -> Option<Link> {
    if open > floor && b[open - 1] == b'!' {
        return None;
    }
    let label_start = open + 1;
    let mut i = label_start;
    while i < b.len() && b[i] != b']' {
        let c = b[i];
        if !(CLASS[c as usize] == PLAIN || c == b'>' || c == b'"' || c == b':') || c == b'\n' || c == b'(' || c == b')' {
            return None;
        }
        if c == b':' && b[i + 1..].starts_with(b"//") {
            return None;
        }
        i += 1;
    }
    let label_end = i;
    if label_end == label_start || b.get(label_end) != Some(&b']') || b.get(label_end + 1) != Some(&b'(') {
        return None;
    }
    let destination_start = label_end + 2;
    let mut j = destination_start;
    while j < b.len() && b[j] != b')' {
        let c = b[j];
        if !(c.is_ascii_alphanumeric() || matches!(c, b';' | b',' | b'/' | b'?' | b':' | b'=' | b'+' | b'$' | b'-' | b'_' | b'.' | b'!' | b'~' | b'*' | b'#')) {
            return None;
        }
        j += 1;
    }
    if j == destination_start || j >= b.len() {
        return None;
    }
    let destination = &b[destination_start..j];
    if destination.len() >= 11 && destination[..11].eq_ignore_ascii_case(b"javascript:") {
        return None;
    }
    Some(Link { label: (label_start, label_end), destination: (destination_start, j), end: j + 1 })
}

fn write_link(source: &str, link: &Link, out: &mut String, text: Option<&mut String>) {
    out.push_str("<a href=\"");
    out.push_str(&source[link.destination.0..link.destination.1]);
    out.push_str("\">");
    let label = &source[link.label.0..link.label.1];
    escape_html_into(out, label);
    out.push_str("</a>");
    if let Some(text) = text {
        text.push_str(label);
    }
}

/// An `_` run between two ASCII letters or digits (`snake_case`) can neither
/// open nor close emphasis, so it stays text; any other `_` leaves the subset.
/// The position after the run.
fn literal_underscores(b: &[u8], floor: usize, at: usize) -> Option<usize> {
    let end = at + b[at..].iter().take_while(|&&c| c == b'_').count();
    (at > floor && b[at - 1].is_ascii_alphanumeric() && b.get(end).is_some_and(u8::is_ascii_alphanumeric)).then_some(end)
}

/// `<code>` with `normalizeCodeSpan` applied: newlines become spaces, and one
/// space comes off each end when both ends have one and it is not all spaces.
fn code_span(value: &str, out: &mut String, text: Option<&mut String>) {
    let b = value.as_bytes();
    let strip = b.len() >= 2
        && matches!(b[0], b' ' | b'\n')
        && matches!(b[b.len() - 1], b' ' | b'\n')
        && b.iter().any(|&c| c != b' ' && c != b'\n');
    let inner = if strip { &value[1..value.len() - 1] } else { value };
    out.push_str("<code>");
    let mark = out.len();
    escape_html_into(out, inner);
    if inner.contains('\n') {
        // Only the newlines change, and escaping leaves them alone.
        let replaced = out[mark..].replace('\n', " ");
        out.truncate(mark);
        out.push_str(&replaced);
    }
    if let Some(text) = text {
        text.push_str(&inner.replace('\n', " "));
    }
    out.push_str("</code>");
}

/// An ATX heading line. The common shape (ASCII, `#` run, a space, content
/// with no closing hashes) is read here; anything else, and content outside
/// the inline subset, goes through the full engine's own functions.
fn heading(line: &str, options: &Options, ctx: &Ctx, seen: &mut crate::slug::Seen, text: &mut String, buffers: (&mut String, &mut String), out: &mut String) -> Option<()> {
    let b = line.as_bytes();
    let hashes = b.iter().take_while(|&&c| c == b'#').count();
    let simple = (1..=6).contains(&hashes)
        && b.is_ascii()
        // JavaScript's \s also trims vertical tabs and form feeds.
        && !b.iter().any(|c| (0x09..=0x0d).contains(c))
        && (hashes == b.len() || b[hashes] == b' ')
        && !line.trim_end_matches(' ').ends_with('#');
    if simple {
        let content = line[hashes..].trim_matches(' ');
        if heading_content(hashes as u8, content, options, seen, text, buffers, out).is_some() {
            return Some(());
        }
    }
    let (depth, content) = block::atx_heading(line)?;
    let content = block::trim_closing_heading_hashes(content);
    let heading = block::heading(depth, &content, ctx, seen).ok()?;
    crate::render::render_block(&heading, out);
    Some(())
}

/// A heading of `depth` whose text is `content` (as `heading` gets it), when
/// the content is in the inline subset; None leaves `out` as it was.
fn heading_content(depth: u8, content: &str, options: &Options, seen: &mut crate::slug::Seen, text: &mut String, buffers: (&mut String, &mut String), out: &mut String) -> Option<()> {
    {
        let mark = out.len();
        out.push_str("<h");
        out.push((b'0' + depth) as char);
        if !options.anchors || content.is_empty() {
            out.push('>');
            if inline(content, out, None).is_some() {
                close_heading(depth, out);
                return Some(());
            }
        } else {
            // The body goes straight into the output; the ID, which comes
            // first, is inserted once the text is known.
            out.push('>');
            let body_start = out.len();
            text.clear();
            if inline(content, out, Some(text)).is_some() {
                if !text.is_empty() {
                    // The slug and the ` id="…"` attribute, in reused buffers.
                    let (slug, attribute) = buffers;
                    slug.clear();
                    crate::slug::slugify_into(text, options.slug_classic, slug);
                    crate::slug::unique_slug_in_place(slug, seen);
                    attribute.clear();
                    attribute.push_str(" id=\"");
                    if !options.slug_classic && text.is_ascii() {
                        // The ASCII slug is [a-z0-9-] (or `section`, with a
                        // `-N` for a repeat): nothing to escape.
                        attribute.push_str(slug);
                    } else {
                        escape_html_into(attribute, slug);
                    }
                    attribute.push('"');
                    out.insert_str(body_start - 1, attribute);
                }
                close_heading(depth, out);
                return Some(());
            }
        }
        out.truncate(mark);
    }
    None
}

fn close_heading(depth: u8, out: &mut String) {
    out.push_str("</h");
    out.push((b'0' + depth) as char);
    out.push('>');
}

/// A fenced code block opening on the line `start..eol`, as `parseBlocks`
/// reads it; the position after its closing fence. The code is the source
/// between the fences, escaped in place in one pass that also finds the
/// closing fence and declines on tabs and CR.
fn fenced_code(source: &str, start: usize, eol: usize, out: &mut String) -> Option<usize> {
    let b = source.as_bytes();
    let opening = &source[start..eol];
    if opening.bytes().any(|c| c == b'\t' || c == b'\r') {
        return None;
    }
    let fence = block::opening_fence(opening)?;
    // A plain info string (one ASCII word, or none): it is the language, and
    // there is no filename or highlight list to find in it.
    let word = fence.info.trim_matches(' ');
    let (lang, filename, highlight_lines) = if word.bytes().all(|c| c.is_ascii_alphanumeric() || matches!(c, b'-' | b'+' | b'.' | b'_' | b'#')) {
        ((!word.is_empty()).then(|| word.to_string()), None, None)
    } else {
        let info = block::parse_fence_info(fence.info, fence.marker)?;
        let (filename, highlight_lines) = block::parse_code_meta(&info.meta);
        (info.lang, filename, highlight_lines)
    };
    out.push_str("<pre><code");
    if let Some(lang) = lang.as_deref().filter(|l| !l.is_empty()) {
        out.push_str(" class=\"language-");
        escape_html_into(out, lang);
        out.push('"');
    }
    if let Some(filename) = filename {
        out.push_str(" data-filename=\"");
        escape_html_into(out, &filename);
        out.push('"');
    }
    if let Some(lines) = highlight_lines {
        let joined: Vec<String> = lines.iter().map(|&n| crate::jsnum::to_string(n)).collect();
        out.push_str(" data-highlight-lines=\"");
        escape_html_into(out, &joined.join(","));
        out.push('"');
    }
    out.push('>');

    // Does the line starting at `at` close the fence? Its tabs or CR leave the subset.
    let closes = |at: usize| -> Option<Option<usize>> {
        // A closing fence starts with up to three spaces and the fence marker.
        let indent = b[at.min(b.len())..].iter().take(3).take_while(|&&c| c == b' ').count();
        if b.get(at + indent) != Some(&fence.marker) {
            return Some(None);
        }
        let end = line_end(b, at);
        let line = &source[at..end];
        if block::closes_fence(line, fence.marker, fence.length) {
            if line.bytes().any(|c| c == b'\t' || c == b'\r') {
                return None;
            }
            return Some(Some(end));
        }
        Some(None)
    };
    let content_start = (eol + 1).min(b.len());
    let mut run = content_start;
    let mut pos = content_start;
    let mut next = None;
    if content_start < b.len() {
        if let Some(close_end) = closes(content_start)? {
            next = Some(close_end + 1);
        }
    }
    while next.is_none() {
        match crate::scan::find_any_n(b, pos, *b"\n&<>\"\t\r") {
            Some(i) => match b[i] {
                b'\n' => {
                    if let Some(close_end) = closes(i + 1)? {
                        // Every content line plus its newline: the source up to the closing fence.
                        out.push_str(&source[run..=i]);
                        next = Some(close_end + 1);
                    } else {
                        pos = i + 1;
                    }
                }
                b'\t' | b'\r' => return None,
                c => {
                    out.push_str(&source[run..i]);
                    out.push_str(match c {
                        b'&' => "&amp;",
                        b'<' => "&lt;",
                        b'>' => "&gt;",
                        _ => "&quot;",
                    });
                    run = i + 1;
                    pos = i + 1;
                }
            },
            None => {
                // Unclosed: every line to the end, each with a newline, where a
                // final empty line is dropped; that is the rest of the source,
                // plus a newline when it does not end in one.
                out.push_str(&source[run..]);
                if content_start < b.len() && !source.ends_with('\n') {
                    out.push('\n');
                }
                next = Some(b.len());
            }
        }
    }
    out.push_str("</code></pre>");
    next.map(|n| n.min(b.len()))
}

#[cfg(test)]
mod tests {
    use super::lower_or_space;

    #[test]
    fn lower_or_space_matches_a_byte_test() {
        // Every byte value at every position, among lower-case letters.
        for position in 0..8 {
            for value in 0..=255u8 {
                let mut bytes = *b"abcdwxyz";
                bytes[position] = value;
                let expected = bytes.iter().all(|&c| c.is_ascii_lowercase() || c == b' ');
                assert_eq!(lower_or_space(u64::from_le_bytes(bytes)), expected, "{bytes:?}");
                let mut spaced = *b"    a  z";
                spaced[position] = value;
                let expected = spaced.iter().all(|&c| c.is_ascii_lowercase() || c == b' ');
                assert_eq!(lower_or_space(u64::from_le_bytes(spaced)), expected, "{spaced:?}");
            }
        }
    }
}
