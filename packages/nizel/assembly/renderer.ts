// AssemblyScript. The host owns the input and output areas in linear memory.
// Unsupported syntax returns -1 and the host renders the entire document in JS.
let output = 0;

function byte(value: i32): void {
  store<u8>(output++, value as u8);
}

function write(text: string): void {
  for (let i = 0; i < text.length; i++) byte(text.charCodeAt(i));
}

function letter(value: i32): bool {
  return (value >= 65 && value <= 90) || (value >= 97 && value <= 122);
}

function word(value: i32): bool {
  return letter(value) || (value >= 48 && value <= 57);
}

function punctuation(value: i32): bool {
  return value == 46 || value == 44 || value == 33 || value == 63 ||
    value == 39 || value == 34 || value == 45;
}

function ordinary(value: i32): bool {
  return word(value) || punctuation(value) || value == 32;
}

function writeText(start: i32, end: i32): void {
  let cursor = start;
  for (let i = start; i < end; i++) {
    if (load<u8>(i) != 34) continue;
    memory.copy(output, cursor, i - cursor);
    output += i - cursor;
    write('&quot;');
    cursor = i + 1;
  }
  memory.copy(output, cursor, end - cursor);
  output += end - cursor;
}

function writeInline(start: i32, end: i32): bool {
  let plainStart = start;
  let i = start;
  while (i < end) {
    const marker = load<u8>(i);
    if (ordinary(marker)) {
      i++;
      continue;
    }
    if (marker != 42 && marker != 96) return false;
    if (i > start && load<u8>(i - 1) != 32) return false;

    const width = marker == 42 && i + 1 < end && load<u8>(i + 1) == marker ? 2 : 1;
    const content = i + width;
    if (content >= end || !word(load<u8>(content))) return false;
    let close = content + 1;
    while (close < end && ordinary(load<u8>(close))) close++;
    if (close + width > end || load<u8>(close) != marker ||
        (width == 2 && load<u8>(close + 1) != marker) || !word(load<u8>(close - 1))) return false;

    const after = close + width;
    if (after < end && load<u8>(after) != 32 && !punctuation(load<u8>(after))) return false;
    writeText(plainStart, i);
    write(marker == 96 ? '<code>' : width == 2 ? '<strong>' : '<em>');
    writeText(content, close);
    write(marker == 96 ? '</code>' : width == 2 ? '</strong>' : '</em>');
    plainStart = after;
    i = after;
  }

  writeText(plainStart, end);
  return true;
}

// The host reserves a separate scratch area immediately below the input.
// A collision falls back, including duplicate IDs that need Nizel's suffixes.
function writeHeadingId(start: i32, end: i32, table: i32): bool {
  let hash: u32 = 2166136261;
  let atWordStart = true;
  write(' id="');
  for (let i = start; i < end; i++) {
    let value = load<u8>(i) as i32;
    if (value == 32 && !atWordStart) {
      value = 45;
      atWordStart = true;
    } else if (value >= 97 && value <= 122) {
      atWordStart = false;
    } else if (value >= 65 && value <= 90 && atWordStart) {
      value += 32;
      atWordStart = false;
    } else {
      return false;
    }
    hash = (hash ^ (value as u32)) * 16777619;
    byte(value);
  }
  const slot = table + ((hash & 2047) as i32);
  if (load<u8>(slot) != 0) return false;
  store<u8>(slot, 1);
  byte(34);
  return true;
}

// Supports paragraphs and simple ATX headings, plus
// inline code and emphasis. Everything else falls back at document granularity.
export function render(input: i32, length: i32, destination: i32, headingIds: i32): i32 {
  output = destination;
  const end = input + length;
  let cursor = input;
  let hasHeadingIds = false;
  let continuedParagraph = false;
  while (cursor < end) {
    if (load<u8>(cursor) == 10) {
      cursor++;
      continue;
    }
    let lineEnd = cursor;
    while (lineEnd < end && load<u8>(lineEnd) != 10) lineEnd++;

    let contentEnd = lineEnd;
    while (contentEnd > cursor && load<u8>(contentEnd - 1) == 32) contentEnd--;
    let depth = 0;
    while (cursor < contentEnd && load<u8>(cursor) == 35) {
      depth++;
      cursor++;
    }
    if (depth > 0) {
      if (continuedParagraph || depth > 6 || cursor >= contentEnd || load<u8>(cursor++) != 32) return -1;
    }
    if (cursor >= contentEnd) return -1;
    const initial = load<u8>(cursor);
    if (!letter(initial) && initial != 42 && initial != 96) return -1;

    if (!continuedParagraph && output != destination) byte(10);
    if (depth == 0) {
      if (!continuedParagraph) write('<p>');
    } else {
      write('<h');
      byte(48 + depth);
      if (headingIds != 0) {
        const table = input - 2048;
        if (!hasHeadingIds) {
          memory.fill(table, 0, 2048);
          hasHeadingIds = true;
        }
        if (!writeHeadingId(cursor, contentEnd, table)) return -1;
      }
      byte(62);
    }
    if (!writeInline(cursor, contentEnd)) return -1;
    continuedParagraph = false;
    if (depth == 0) {
      if (lineEnd + 1 < end && load<u8>(lineEnd + 1) != 10) {
        if (!letter(load<u8>(lineEnd + 1))) return -1;
        if (lineEnd - contentEnd >= 2) write('<br />');
        byte(10);
        continuedParagraph = true;
      } else {
        write('</p>');
      }
    } else {
      write('</h');
      byte(48 + depth);
      byte(62);
    }
    cursor = lineEnd + 1;
  }
  return output - destination;
}

function matches(start: i32, end: i32, tag: string): bool {
  if (end - start < tag.length) return false;
  for (let i = 0; i < tag.length; i++) {
    if (load<u8>(start + i) != tag.charCodeAt(i)) return false;
  }
  return true;
}

function htmlSpace(value: i32): bool {
  return value == 32 || (value >= 9 && value <= 13);
}

function entityLength(start: i32, end: i32): i32 {
  if (matches(start, end, '&amp;')) return 5;
  if (matches(start, end, '&lt;') || matches(start, end, '&gt;')) return 4;
  if (matches(start, end, '&quot;') || matches(start, end, '&apos;') ||
      matches(start, end, '&nbsp;')) return 6;
  return 0;
}

function entityByte(start: i32): i32 {
  const first = load<u8>(start + 1);
  if (first == 97) return load<u8>(start + 2) == 109 ? 38 : 39;
  if (first == 108) return 60;
  if (first == 103) return 62;
  return first == 110 ? 32 : 34;
}

// Mirrors Nizel's paragraph whitespace normalization for text-only spans.
function reverseText(start: i32, end: i32, floor: i32, trimEnd: bool, code: bool): bool {
  let pendingSpace = false;
  for (let i = start; i < end; i++) {
    let value = load<u8>(i) as i32;
    if (value == 38) {
      const size = entityLength(i, end);
      if (size == 0) return false;
      value = entityByte(i);
      i += size - 1;
    } else if (value == 60 || value > 126 || (value < 32 && !htmlSpace(value))) {
      return false;
    }
    if (code && value == 96) return false;
    if (htmlSpace(value)) {
      pendingSpace = true;
      continue;
    }
    if (pendingSpace && output > floor && load<u8>(output - 1) != 32) byte(32);
    byte(value);
    pendingSpace = false;
  }
  if (!trimEnd && pendingSpace && output > floor && load<u8>(output - 1) != 32) byte(32);
  return true;
}

function endOfText(cursor: i32, end: i32): i32 {
  while (cursor < end && load<u8>(cursor) != 60) cursor++;
  return cursor;
}

function reverseHeadingId(start: i32, end: i32, id: i32, idEnd: i32): bool {
  let cursor = id;
  let lastSpace = false;
  if (start == end || load<u8>(start) == 32 || load<u8>(end - 1) == 32) return false;
  for (let i = start; i < end; i++) {
    let value = load<u8>(i) as i32;
    if (value == 32) {
      if (lastSpace) continue;
      lastSpace = true;
      value = 45;
    } else {
      if (!letter(value)) return false;
      lastSpace = false;
      if (value <= 90) value += 32;
    }
    if (cursor >= idEnd || load<u8>(cursor++) != value) return false;
  }
  return cursor == idEnd;
}

// Handles the simple semantic markup produced by the forward backend and
// equivalent emphasis markup used by the editable WebView.
export function reverse(input: i32, length: i32, destination: i32): i32 {
  output = destination;
  const end = input + length;
  let cursor = input;
  while (cursor < end) {
    if (htmlSpace(load<u8>(cursor))) {
      cursor++;
      continue;
    }
    let depth = 0;
    let id = 0;
    let idEnd = 0;
    let closeBlock = '</p>';
    if (matches(cursor, end, '<p>')) {
      cursor += 3;
    } else if (matches(cursor, end, '<h') && cursor + 2 < end) {
      depth = (load<u8>(cursor + 2) as i32) - 48;
      if (depth < 1 || depth > 6) return -1;
      closeBlock = depth == 1 ? '</h1>' : depth == 2 ? '</h2>' : depth == 3 ? '</h3>'
        : depth == 4 ? '</h4>' : depth == 5 ? '</h5>' : '</h6>';
      cursor += 3;
      if (matches(cursor, end, ' id="')) {
        cursor += 5;
        id = cursor;
        while (cursor < end && load<u8>(cursor) != 34) cursor++;
        idEnd = cursor++;
      }
      if (cursor >= end || load<u8>(cursor++) != 62) return -1;
    } else {
      return -1;
    }

    if (id != 0) {
      const headingEnd = endOfText(cursor, end);
      if (!matches(headingEnd, end, closeBlock) || !reverseHeadingId(cursor, headingEnd, id, idEnd)) return -1;
    }
    const blockStart = output;
    if (output != destination) write('\n\n');
    if (depth != 0) {
      for (let i = 0; i < depth; i++) byte(35);
      byte(32);
    }

    const bodyStart = output;
    let lineStart = bodyStart;
    while (!matches(cursor, end, closeBlock)) {
      if (cursor >= end) return -1;
      const textEnd = endOfText(cursor, end);
      if (textEnd > cursor) {
        const isClosing = matches(textEnd, end, closeBlock);
        if (!reverseText(cursor, textEnd, lineStart, isClosing, false)) return -1;
        cursor = textEnd;
        continue;
      }
      let opener: string;
      let closer: string;
      let delimiter: string;
      if (matches(cursor, end, '<strong>')) {
        opener = '<strong>'; closer = '</strong>'; delimiter = '**';
      } else if (matches(cursor, end, '<b>')) {
        opener = '<b>'; closer = '</b>'; delimiter = '**';
      } else if (matches(cursor, end, '<em>')) {
        opener = '<em>'; closer = '</em>'; delimiter = '*';
      } else if (matches(cursor, end, '<i>')) {
        opener = '<i>'; closer = '</i>'; delimiter = '*';
      } else if (matches(cursor, end, '<code>')) {
        opener = '<code>'; closer = '</code>'; delimiter = '`';
      } else if (depth == 0 && (matches(cursor, end, '<br>') || matches(cursor, end, '<br />') || matches(cursor, end, '<br/>'))) {
        if (output <= lineStart) return -1;
        if (load<u8>(output - 1) == 32) output--;
        byte(10);
        lineStart = output;
        cursor += matches(cursor, end, '<br>') ? 4 : matches(cursor, end, '<br/>') ? 5 : 6;
        continue;
      } else {
        return -1;
      }
      cursor += opener.length;
      const inlineEnd = endOfText(cursor, end);
      if (!matches(inlineEnd, end, closer)) return -1;
      const code = delimiter.length == 1 && delimiter.charCodeAt(0) == 96;
      if (code && (cursor == inlineEnd || !word(load<u8>(cursor)) || !word(load<u8>(inlineEnd - 1)))) return -1;
      const spanStart = output;
      write(delimiter);
      const contentStart = output;
      if (!reverseText(cursor, inlineEnd, contentStart, true, code)) return -1;
      if (output == contentStart) output = spanStart;
      else write(delimiter);
      cursor = inlineEnd + closer.length;
    }
    if (lineStart > bodyStart && output == lineStart) return -1;
    if (depth != 0 && output == bodyStart) return -1;
    if (output == bodyStart) output = blockStart;
    // An empty inline element may leave a pending space before the close tag.
    if (output > bodyStart && load<u8>(output - 1) == 32) output--;
    cursor += closeBlock.length;
  }
  return output - destination;
}
