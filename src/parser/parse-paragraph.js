// @ts-check
import { ParagraphNode, TextNode } from './ast-nodes.js';
import { CHAR_NL, CHAR_LT, CHAR_HASH } from './parse-base-state.js';

/**
 * Parse a paragraph or text node.
 *
 * @param {import('./parse-base-state.js').ParserState} state
 * @returns {boolean}
 */
export function parseParagraph(state) {
  let paraStart = state.pos;
  let found = false;
  while (state.pos < state.len) {
    const c = state.currentChar;
    if (c !== CHAR_NL && c !== CHAR_LT && c !== CHAR_HASH) {
      state.advance();
      found = true;
    } else break;
  }
  if (found) {
    state.nodes.push(new ParagraphNode(paraStart, state.pos, [new TextNode(paraStart, state.pos)]));
    return true;
  }
  return false;
}
