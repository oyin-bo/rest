// @ts-check
import { CHAR_NL } from './parse-base-state.js';
import { BlockquoteNode, ParagraphNode, TextNode } from './ast-nodes.js';

/**
 * Parse blockquotes (multi-line, nested)
 *
 * @param {import('./parse-base-state.js').ParserState} state
 * @returns {boolean}
 */
export function parseBlockquote(state) {
  if (state.source[state.pos] !== '>') return false;
  const start = state.pos;
  const children = [];
  while (state.pos < state.len && state.source[state.pos] === '>') {
    let lineStart = state.pos;
    state.advance();
    if (state.source[state.pos] === ' ') state.advance();
    let contentStart = state.pos;
    while (state.pos < state.len && state.currentChar !== CHAR_NL) state.advance();
    // For now, treat each line as a paragraph node
    children.push(new ParagraphNode(contentStart, state.pos, [new TextNode(contentStart, state.pos)]));
    if (state.currentChar === CHAR_NL) state.advance();
  }
  state.nodes.push(new BlockquoteNode(start, state.pos, children));
  return true;
}
