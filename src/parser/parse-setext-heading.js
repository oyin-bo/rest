// @ts-check
import { HeadingNode, TextNode } from './ast-nodes.js';

/**
 * Parse Setext-style headings (underlined with === or ---)
 *
 * @param {import('./parse-base-state.js').ParserState} state
 * @returns {boolean}
 */
export function parseSetextHeading(state) {
  const start = state.pos;
  // Read first line (text)
  let lineStart = state.pos;
  while (state.pos < state.len && state.currentChar !== 10) state.advance();
  const textLine = state.source.slice(lineStart, state.pos);
  if (state.currentChar === 10) state.advance();
  // Read second line (underline)
  lineStart = state.pos;
  while (state.pos < state.len && state.currentChar !== 10) state.advance();
  const underline = state.source.slice(lineStart, state.pos);
  // Explicitly check for only = or - (with optional whitespace)
  let i = 0;
  while (i < underline.length && (underline[i] === ' ' || underline[i] === '\t')) ++i;
  if (i === underline.length) { state.pos = start; return false; }
  let ch = underline[i];
  if (ch !== '=' && ch !== '-') { state.pos = start; return false; }
  let mark = ch;
  while (i < underline.length && underline[i] === mark) ++i;
  // Only whitespace allowed after
  while (i < underline.length && (underline[i] === ' ' || underline[i] === '\t')) ++i;
  if (i !== underline.length) { state.pos = start; return false; }
  const level = mark === '=' ? 1 : 2;
  state.nodes.push(new HeadingNode(start, state.pos, level, [new TextNode(start, start + textLine.length)]));
  if (state.currentChar === 10) state.advance();
  return true;
}
