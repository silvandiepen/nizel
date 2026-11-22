//! JavaScript number semantics: `Number(string)` and `Number.prototype.toString()`.

use crate::js;

/// `Number(text)`.
pub fn number(text: &str) -> f64 {
    let s = js::trim(text);
    if s.is_empty() {
        return 0.0;
    }
    let b = s.as_bytes();
    if b.len() > 2 && b[0] == b'0' {
        let radix = match b[1] {
            b'x' | b'X' => 16,
            b'o' | b'O' => 8,
            b'b' | b'B' => 2,
            _ => 0,
        };
        if radix != 0 {
            let digits = &s[2..];
            if !digits.chars().all(|c| c.is_digit(radix)) {
                return f64::NAN;
            }
            return digits.chars().fold(0.0, |value, c| value * radix as f64 + c.to_digit(radix).unwrap_or(0) as f64);
        }
    }
    let unsigned = s.strip_prefix(['+', '-']).unwrap_or(s);
    let negative = s.starts_with('-');
    if unsigned == "Infinity" {
        return if negative { f64::NEG_INFINITY } else { f64::INFINITY };
    }
    if !is_decimal_literal(unsigned) {
        return f64::NAN;
    }
    s.parse::<f64>().unwrap_or(f64::NAN)
}

/// `StrUnsignedDecimalLiteral` without `Infinity`:
/// `digits [. digits?] [e[±]digits]` or `. digits [e[±]digits]`.
fn is_decimal_literal(s: &str) -> bool {
    let b = s.as_bytes();
    let mut i = 0;
    let int_digits = b.iter().take_while(|c| c.is_ascii_digit()).count();
    i += int_digits;
    let mut frac_digits = 0;
    if b.get(i) == Some(&b'.') {
        i += 1;
        frac_digits = b[i..].iter().take_while(|c| c.is_ascii_digit()).count();
        i += frac_digits;
    }
    if int_digits == 0 && frac_digits == 0 {
        return false;
    }
    if matches!(b.get(i), Some(b'e' | b'E')) {
        i += 1;
        if matches!(b.get(i), Some(b'+' | b'-')) {
            i += 1;
        }
        let exp_digits = b[i..].iter().take_while(|c| c.is_ascii_digit()).count();
        if exp_digits == 0 {
            return false;
        }
        i += exp_digits;
    }
    i == b.len()
}

/// `String(value)` for a number (ECMA-262 Number::toString, radix 10).
pub fn to_string(value: f64) -> String {
    if value.is_nan() {
        return "NaN".to_string();
    }
    if value == 0.0 {
        return "0".to_string();
    }
    if value.is_infinite() {
        return if value < 0.0 { "-Infinity" } else { "Infinity" }.to_string();
    }
    if value < 0.0 {
        return format!("-{}", to_string(-value));
    }
    // Shortest round-trip digits and exponent from Rust's `{:e}` (e.g. `1.5e2`).
    let formatted = format!("{value:e}");
    let (mantissa, exponent) = formatted.split_once('e').expect("exponent");
    let digits: String = mantissa.chars().filter(char::is_ascii_digit).collect();
    let k = digits.len() as i32;
    let n = exponent.parse::<i32>().expect("integer exponent") + 1;
    if k <= n && n <= 21 {
        format!("{digits}{}", "0".repeat((n - k) as usize))
    } else if 0 < n && n <= 21 {
        format!("{}.{}", &digits[..n as usize], &digits[n as usize..])
    } else if -6 < n && n <= 0 {
        format!("0.{}{digits}", "0".repeat((-n) as usize))
    } else {
        let sign = if n - 1 >= 0 { "+" } else { "-" };
        let rest = if k > 1 { format!(".{}", &digits[1..]) } else { String::new() };
        format!("{}{rest}e{sign}{}", &digits[..1], (n - 1).abs())
    }
}
