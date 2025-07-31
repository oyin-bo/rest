// @ts-check
import { HeadingNode, TextNode } from './ast-nodes.js';
import { CHAR_HASH, CHAR_SPACE, CHAR_NL } from './parse-base-state.js';

/**
 * Parse a Markdown ATX heading or fallback to text node.
 *
 * @param {import('./parse-base-state.js').ParserState} state
 * @returns {boolean}
 */
export function parseHeading(state) {
  if (state.currentChar !== CHAR_HASH) return false;
  let start = state.pos;
  let level = 0;
  while (state.currentChar === CHAR_HASH) { level++; state.advance(); }
  if (state.currentChar === CHAR_SPACE) {
    state.advance();
    let contentStart = state.pos;
    while (state.pos < state.len && state.currentChar !== CHAR_NL) state.advance();
    state.nodes.push(new HeadingNode(start, state.pos, level, [new TextNode(contentStart, state.pos)]));
    state.advance();
    return true;
  }
  return false;
}
