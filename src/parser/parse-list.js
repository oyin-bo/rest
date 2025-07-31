// @ts-check
import { ListNode, ListItemNode, TextNode } from './ast-nodes.js';

/**
 * Parse lists (unordered and ordered, basic)
 *
 * @param {import('./parse-base-state.js').ParserState} state
 * @returns {boolean}
 */
export function parseList(state) {
  const start = state.pos;
  let items = [];
  let matched = false;
  while (state.pos < state.len) {
    // Unordered: -, *, +
    let c = state.source[state.pos];
    if (c === '-' || c === '*' || c === '+') {
      let itemStart = state.pos;
      state.advance();
      if (state.source[state.pos] === ' ') state.advance();
      let contentStart = state.pos;
      while (state.pos < state.len && state.currentChar !== 10) state.advance();
      items.push(new ListItemNode(itemStart, state.pos, [new TextNode(contentStart, state.pos)]));
      matched = true;
      if (state.currentChar === 10) state.advance();
      continue;
    }
    // Ordered: 1. 2. 3. ...
    let i = state.pos, num = 0;
    while (i < state.len && state.source[i] >= '0' && state.source[i] <= '9') {
      num = num * 10 + (state.source[i].charCodeAt(0) - 48);
      i++;
    }
    if (i > state.pos && state.source[i] === '.' && state.source[i+1] === ' ') {
      let itemStart = state.pos;
      state.advance(i - state.pos + 2); // skip number, dot, space
      let contentStart = state.pos;
      while (state.pos < state.len && state.currentChar !== 10) state.advance();
      items.push(new ListItemNode(itemStart, state.pos, [new TextNode(contentStart, state.pos)]));
      matched = true;
      if (state.currentChar === 10) state.advance();
      continue;
    }
    break;
  }
  if (matched) {
    // Detect ordered by first item
    const ordered = items.length > 0 && /^\d/.test(state.source[items[0].start]);
    state.nodes.push(new ListNode(start, state.pos, ordered, items));
    return true;
  }
  return false;
}
