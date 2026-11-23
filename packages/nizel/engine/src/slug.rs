//! `slugify` and `uniqueSlug` from `utils.ts`, including `slugCase` from
//! `@sil/case` (the default "github" style).

use crate::js;
use std::collections::HashMap;
use std::hash::{BuildHasherDefault, Hasher};

/// The heading IDs seen in one document. Only looked up (never iterated),
/// so the hasher does not affect output; a small multiplicative hash is much
/// cheaper than SipHash for these short keys, and a per-document map needs
/// no flooding resistance.
pub type Seen = HashMap<String, usize, BuildHasherDefault<FxHasher>>;

/// The FxHash function (as in rustc): rotate, xor, multiply, a word at a time.
#[derive(Default)]
pub struct FxHasher(u64);

impl Hasher for FxHasher {
    fn write(&mut self, bytes: &[u8]) {
        const K: u64 = 0x517c_c1b7_2722_0a95;
        let mut chunks = bytes.chunks_exact(8);
        for chunk in &mut chunks {
            let word = u64::from_le_bytes(chunk.try_into().expect("eight bytes"));
            self.0 = (self.0.rotate_left(5) ^ word).wrapping_mul(K);
        }
        for &byte in chunks.remainder() {
            self.0 = (self.0.rotate_left(5) ^ byte as u64).wrapping_mul(K);
        }
    }

    fn finish(&self) -> u64 {
        self.0
    }
}

/// `@sil/case`'s accent table, in its key order: the first key whose list
/// holds a character's lower case replaces it.
const ACCENTS: &[(char, &str)] = &[
    ('a', "äáàâãāǎåăąǟǡǻȁȃȧạảấầẩẫậắằẳẵặ"),
    ('b', "ßƀƃɓᵬᶀḃḅḇ"),
    ('c', "ćčçĉċƈȼɕḉ"),
    ('d', "đďḋḍḏḑḓ"),
    ('e', "ëéèêēěėęǝȅȇȩɛɘẹẻẽếềểễệ"),
    ('f', "ƒḟ"),
    ('g', "ğĝġģǧǵɠḡᵹ"),
    ('h', "ĥȟḩḥḫẖħⱨɦ"),
    ('i', "ïíìîīǐįıɨỉịɪɩ"),
    ('j', "ĵǰȷ"),
    ('k', "ķƙḳḵⱪ"),
    ('l', "łĺľļŀḷḹḻḽȴ"),
    ('m', "ṁṃᵯɱᶆḿṁṃṇṅṉṋ"),
    ('n', "ñńǹňņŋɲṅṇṉṋⁿ"),
    ('o', "öóòôõōǒøőơǫȍȏȫȭȯọỏốồổỗộớờởỡợ"),
    ('p', "þƥᵽᶈṗ"),
    ('q', "ʠɋ"),
    ('r', "řŕṙṛṝṟ"),
    ('s', "śšşŝșṡṣṥṧṩ"),
    ('t', "ţťṫṭṯṱẗƭȶ"),
    ('u', "üúùûūǔůűųưǘǜǖǚȕȗụủứừửữự"),
    ('v', "ʋṿⱱʌ"),
    ('w', "ẅẃẁŵẇẉⱳẘ"),
    ('x', "ẍẋₓ✕"),
    ('y', "ÿýỳŷÿỹȳɏƴʎẙỷỵ"),
    ('z', "žźżẑẓẕ"),
];

pub fn slugify(value: &str, classic: bool) -> String {
    if classic { classic_slug(value) } else { slug_case(value) }
}

/// `slugify` appended to `slug` (ASCII text without a scratch string).
pub fn slugify_into(value: &str, classic: bool, slug: &mut String) {
    if !classic && value.is_ascii() {
        ascii_slug_case_into(value, slug);
    } else {
        slug.push_str(&slugify(value, classic));
    }
}

/// `uniqueSlug`.
pub fn unique_slug(base: String, seen: &mut Seen) -> String {
    let mut slug = base;
    unique_slug_in_place(&mut slug, seen);
    slug
}

/// `uniqueSlug` on `slug` in place (`section` for an empty one, `-N` for a
/// repeat). The key is cloned only the first time a slug is seen.
pub fn unique_slug_in_place(slug: &mut String, seen: &mut Seen) {
    if slug.is_empty() {
        slug.push_str("section");
    }
    if let Some(count) = seen.get_mut(slug.as_str()) {
        let previous = *count;
        *count += 1;
        use std::fmt::Write;
        let _ = write!(slug, "-{}", previous + 1);
        return;
    }
    seen.insert(slug.clone(), 1);
}

/// `value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '')`.
fn classic_slug(value: &str) -> String {
    let lower = value.to_lowercase();
    let kept: String = lower
        .chars()
        .filter(|&c| c.is_ascii_alphanumeric() || c == '_' || js::is_space(c) || c == '-')
        .collect();
    let mut dashed = String::with_capacity(kept.len());
    let mut in_run = false;
    for c in kept.chars() {
        if js::is_space(c) || c == '_' {
            if !in_run {
                dashed.push('-');
                in_run = true;
            }
        } else {
            dashed.push(c);
            in_run = false;
        }
    }
    dashed.trim_matches('-').to_string()
}

/// `slugCase` (= `kebabCase` without excludes) from `@sil/case`.
fn slug_case(value: &str) -> String {
    if value.is_empty() {
        return String::new();
    }
    if value.is_ascii() {
        return ascii_slug_case(value);
    }
    // `normalize` (per UTF-16 unit: keep [a-zA-Z0-9 -], fold accents, anything
    // else `_`) and `.replace(/[-_]/g, ' ')` in one pass: every byte here is
    // [A-Za-z0-9 ]. Astral characters are two units, so two separators.
    let mut spaced: Vec<u8> = Vec::with_capacity(value.len());
    let mut has_upper = false;
    for c in value.chars() {
        let byte = if c.is_ascii_alphanumeric() {
            c as u8
        } else if c.is_ascii() || c.len_utf16() == 2 {
            b' '
        } else {
            match fold_accent(c) {
                '_' => b' ',
                letter => letter as u8,
            }
        };
        has_upper |= byte.is_ascii_uppercase();
        spaced.push(byte);
        if c.len_utf16() == 2 {
            spaced.push(b' ');
        }
    }
    if !has_upper {
        // Neither case-boundary replacement can match.
        return join_words(&spaced);
    }
    // `.replace(/([a-z])([A-Z])/g, '$1 $2')`
    let mut first = Vec::with_capacity(spaced.len() + 8);
    let mut index = 0;
    while index < spaced.len() {
        let byte = spaced[index];
        if byte.is_ascii_lowercase() && index + 1 < spaced.len() && spaced[index + 1].is_ascii_uppercase() {
            first.extend_from_slice(&[byte, b' ', spaced[index + 1]]);
            index += 2;
        } else {
            first.push(byte);
            index += 1;
        }
    }
    // `.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')`
    let mut second = Vec::with_capacity(first.len() + 8);
    let mut index = 0;
    while index < first.len() {
        if first[index].is_ascii_uppercase() {
            let mut end = index;
            while end < first.len() && first[end].is_ascii_uppercase() {
                end += 1;
            }
            if end - index >= 2 && end < first.len() && first[end].is_ascii_lowercase() {
                second.extend_from_slice(&first[index..end - 1]);
                second.push(b' ');
                second.extend_from_slice(&first[end - 1..=end]);
                index = end + 1;
            } else {
                second.extend_from_slice(&first[index..end]);
                index = end;
            }
        } else {
            second.push(first[index]);
            index += 1;
        }
    }

    join_words(&second)
}

/// `slugCase` for ASCII text in one pass. Every byte but a letter or digit
/// separates words (`normalize` makes it `_`, then a space); the two
/// case-boundary replacements become word breaks: between a lower-case and
/// an upper-case letter (`([a-z])([A-Z])`), and before the last capital of a
/// run of two or more followed by a lower-case letter (`([A-Z]+)([A-Z][a-z])`,
/// whose leftmost greedy match always lands there; the first replacement
/// never splits such a run). Words are lower-cased and joined with `-`.
fn ascii_slug_case(text: &str) -> String {
    let mut slug = String::with_capacity(text.len());
    ascii_slug_case_into(text, &mut slug);
    slug
}

/// `ascii_slug_case` appended to `slug`.
fn ascii_slug_case_into(text: &str, slug: &mut String) {
    let bytes = text.as_bytes();
    let class = |c: u8| if c.is_ascii_alphanumeric() { c } else { b' ' };
    let start = slug.len();
    let mut pending = false;
    let mut i = 0;
    while i < bytes.len() {
        let c = class(bytes[i]);
        if c == b' ' {
            pending = slug.len() > start;
            i += 1;
            continue;
        }
        if c.is_ascii_uppercase() {
            let previous = if i > 0 { class(bytes[i - 1]) } else { b' ' };
            let next = bytes.get(i + 1).map_or(b' ', |&n| class(n));
            if (previous.is_ascii_lowercase() || (previous.is_ascii_uppercase() && next.is_ascii_lowercase())) && slug.len() > start {
                pending = true;
            }
        }
        if pending {
            slug.push('-');
            pending = false;
        }
        if c.is_ascii_uppercase() {
            slug.push(c.to_ascii_lowercase() as char);
            i += 1;
            continue;
        }
        // Lower-case letters and digits never start a word: copy the run.
        let run = bytes[i..].iter().take_while(|c| c.is_ascii_lowercase() || c.is_ascii_digit()).count();
        slug.push_str(&text[i..i + run]);
        i += run;
    }
}

/// `.split(' ').filter(Boolean).map(toLowerCase).join('-')` over ASCII bytes, in one pass.
fn join_words(bytes: &[u8]) -> String {
    let mut slug = String::with_capacity(bytes.len());
    let mut pending = false;
    for &byte in bytes {
        if byte == b' ' {
            pending = !slug.is_empty();
            continue;
        }
        if pending {
            slug.push('-');
            pending = false;
        }
        slug.push(byte.to_ascii_lowercase() as char);
    }
    slug
}

/// One BMP character through `normalize`: its accent-table letter (upper
/// case when the character equals its own upper case), else `_`.
fn fold_accent(c: char) -> char {
    let mut lower = c.to_lowercase();
    let single = match (lower.next(), lower.next()) {
        (Some(only), None) => Some(only),
        _ => None,
    };
    let letter = single.and_then(|l| ACCENTS.iter().find(|(_, list)| list.contains(l)).map(|(key, _)| *key));
    let base = letter.unwrap_or('_');
    let mut upper = c.to_uppercase();
    let is_upper = matches!((upper.next(), upper.next()), (Some(u), None) if u == c);
    if is_upper { base.to_ascii_uppercase() } else { base }
}

#[cfg(test)]
mod tests {
    use super::ascii_slug_case;

    /// The byte-at-a-time form `ascii_slug_case` replaced.
    fn reference(text: &[u8]) -> String {
        let class = |c: u8| if c.is_ascii_alphanumeric() { c } else { b' ' };
        let mut slug = String::new();
        let mut pending = false;
        for i in 0..text.len() {
            let c = class(text[i]);
            if c == b' ' {
                pending = !slug.is_empty();
                continue;
            }
            let previous = if i > 0 { class(text[i - 1]) } else { b' ' };
            let next = text.get(i + 1).map_or(b' ', |&n| class(n));
            if c.is_ascii_uppercase() && (previous.is_ascii_lowercase() || (previous.is_ascii_uppercase() && next.is_ascii_lowercase())) && !slug.is_empty() {
                pending = true;
            }
            if pending {
                slug.push('-');
                pending = false;
            }
            slug.push(c.to_ascii_lowercase() as char);
        }
        slug
    }

    #[test]
    fn ascii_slug_case_matches_the_byte_at_a_time_form() {
        let alphabet = b"aZB1 -_.";
        let mut text = Vec::new();
        for len in 0..=6u32 {
            for mut n in 0..alphabet.len().pow(len) {
                text.clear();
                for _ in 0..len {
                    text.push(alphabet[n % alphabet.len()]);
                    n /= alphabet.len();
                }
                let s = std::str::from_utf8(&text).expect("ASCII");
                assert_eq!(ascii_slug_case(s), reference(&text), "{s:?}");
            }
        }
    }
}
