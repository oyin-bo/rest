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
  // Indented code block: 4 spaces or 1 tab at line start
  let indented = false;
  let i = state.pos;
  // Check for indented code block
  if (
    (state.source[i] === ' ' && state.source[i+1] === ' ' && state.source[i+2] === ' ' && state.source[i+3] === ' ') ||
    state.source[i] === '\t'
  ) {
    indented = true;
  }
  if (indented) {
    let lines = [];
    while (i < state.len) {
      // Check for 4 spaces or tab at line start
      if (
        (state.source[i] === ' ' && state.source[i+1] === ' ' && state.source[i+2] === ' ' && state.source[i+3] === ' ') ||
        state.source[i] === '\t'
      ) {
        let lineStart = i;
        let indentLen = state.source[i] === '\t' ? 1 : 4;
        i += indentLen;
        let lineEnd = i;
        while (lineEnd < state.len && state.source[lineEnd] !== '\n') ++lineEnd;
        lines.push(state.source.slice(i, lineEnd));
        i = lineEnd;
        if (i < state.len && state.source[i] === '\n') ++i;
      } else if (state.source[i] === '\n') {
        ++i;
      } else {
        break;
      }
    }
    state.pos = i;
    let value = lines.join('\n');
    state.nodes.push(new CodeBlockNode(start, state.pos, '', value));
    return true;
  }
  // Fenced code block (existing logic)
  i = state.pos;
  let spaces = 0;
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
