// @ts-check
import { CodeBlockNode } from './ast-nodes.js';

/**
 * Parse fenced code blocks (``` or ~~~)
 *
 * @param {import('./parse-base-state.js').ParserState} state
 * @returns {boolean}
 */
export function parseCodeBlock(state) {
  const start = state.pos;
  // Check for opening fence (up to 3 spaces, then at least 3 backticks or tildes)
  let i = state.pos, spaces = 0;
  while (i < state.len && spaces < 3 && state.source[i] === ' ') { ++i; ++spaces; }
  if (i >= state.len) return false;
  let fenceChar = state.source[i];
  if (fenceChar !== '`' && fenceChar !== '~') return false;
  let fenceLen = 0;
  while (i < state.len && state.source[i] === fenceChar) { ++i; ++fenceLen; }
  if (fenceLen < 3) return false;
  // Info string
  let infoStart = i;
  while (i < state.len && state.source[i] !== '\n') ++i;
  let info = state.source.slice(infoStart, i).trim();
  if (i < state.len && state.source[i] === '\n') ++i;
  let contentStart = i;
  // Find closing fence
  let contentEnd = i, found = false;
  while (i < state.len) {
    let j = i, closeSpaces = 0;
    while (j < state.len && closeSpaces < 3 && state.source[j] === ' ') { ++j; ++closeSpaces; }
    let k = j, closeLen = 0;
    while (k < state.len && state.source[k] === fenceChar) { ++k; ++closeLen; }
    if (closeLen >= fenceLen) {
      // Only whitespace allowed after
      let m = k;
      while (m < state.len && (state.source[m] === ' ' || state.source[m] === '\t')) ++m;
      if (m < state.len && state.source[m] === '\n') {
        found = true;
        contentEnd = i;
        i = m + 1;
        break;
      } else if (m === state.len) {
        found = true;
        contentEnd = i;
        i = m;
        break;
      }
    }
    // Advance to next line
    while (i < state.len && state.source[i] !== '\n') ++i;
    if (i < state.len && state.source[i] === '\n') ++i;
  }
  if (!found) contentEnd = i;
  state.pos = i;
  // Remove trailing newline from content
  let value = state.source.slice(contentStart, contentEnd);
  if (value.endsWith('\n')) value = value.slice(0, -1);
  state.nodes.push(new CodeBlockNode(start, state.pos, info, value));
  return true;
}
