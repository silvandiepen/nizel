//! `slugify` and `uniqueSlug` from `utils.ts`, including `slugCase` from
//! `@sil/case` (the default "github" style).

use crate::js;
use std::collections::HashMap;

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

/// `uniqueSlug`.
pub fn unique_slug(base: String, seen: &mut HashMap<String, usize>) -> String {
    let fallback = if base.is_empty() { "section".to_string() } else { base };
    let count = seen.entry(fallback.clone()).or_insert(0);
    let previous = *count;
    *count += 1;
    if previous == 0 { fallback } else { format!("{fallback}-{}", previous + 1) }
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
    // `normalize`: per UTF-16 unit, keep [a-zA-Z0-9 -], fold accents, and
    // turn everything else into `_`. Astral characters are two units, each
    // becoming `_`; both collapse into the same separator below.
    let mut normalized = String::with_capacity(value.len());
    for c in value.chars() {
        if c.is_ascii_alphanumeric() || c == ' ' || c == '-' {
            normalized.push(c);
            continue;
        }
        let units = c.len_utf16();
        let replacement = if units == 1 { fold_accent(c) } else { '_' };
        for _ in 0..units {
            normalized.push(replacement);
        }
    }

    // `.replace(/[-_]/g, ' ')`
    let spaced: Vec<u8> = normalized.bytes().map(|b| if b == b'-' || b == b'_' { b' ' } else { b }).collect();
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

    let text = String::from_utf8(second).expect("ASCII");
    let mut slug = String::with_capacity(text.len());
    for word in text.split(' ').filter(|word| !word.is_empty()) {
        if !slug.is_empty() {
            slug.push('-');
        }
        slug.push_str(&word.to_ascii_lowercase());
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
