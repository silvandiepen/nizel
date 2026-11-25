//! A depth-first matcher for regex loops of the form `(?:A|B|…)*` followed
//! by a continuation, explored in exactly the order a backtracking regex
//! engine explores them: at each state every alternative (in order) is tried
//! before stopping the loop there, and each alternative's subtree is
//! exhausted before the next. The continuation only depends on the state,
//! so states that already failed are remembered.
//!
//! Iterative, so long input cannot overflow the Wasm stack.

use std::collections::HashSet;
use std::hash::Hash;

pub fn first_match<S, R>(
    start: S,
    mut next: impl FnMut(&S) -> Vec<S>,
    mut stop: impl FnMut(&S) -> Option<R>,
) -> Option<R>
where
    S: Clone + Eq + Hash,
{
    struct Frame<S> {
        state: S,
        options: Vec<S>,
        tried: usize,
    }
    let options = next(&start);
    // A state with no alternative to try only has its continuation.
    if options.is_empty() {
        return stop(&start);
    }
    let mut failed: HashSet<S, crate::hash::FastBuild> = HashSet::default();
    let mut stack = vec![Frame { state: start, options, tried: 0 }];
    while let Some(frame) = stack.last_mut() {
        if frame.tried < frame.options.len() {
            let child = frame.options[frame.tried].clone();
            frame.tried += 1;
            if failed.contains(&child) {
                continue;
            }
            let options = next(&child);
            stack.push(Frame { state: child, options, tried: 0 });
            continue;
        }
        let frame = stack.pop().expect("non-empty");
        if let Some(result) = stop(&frame.state) {
            return Some(result);
        }
        failed.insert(frame.state);
    }
    None
}
