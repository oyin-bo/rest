// @ts-check
import { HrNode } from './ast-nodes.js';

/**
 * Parse horizontal rules (---, ***, ___)
 * @param {import('./parse-base-state.js').ParserState} state
 * @returns {boolean}
 */
export function parseHr(state) {
  const start = state.pos;
  let i = state.pos, spaces = 0;
  while (i < state.len && spaces < 3 && state.source[i] === ' ') { ++i; ++spaces; }
  if (i >= state.len) return false;
  let ch = state.source[i];
  if (ch !== '*' && ch !== '-' && ch !== '_') return false;
  let mark = ch, count = 0;
  while (i < state.len) {
    if (state.source[i] === mark) {
      ++count; ++i;
    } else if (state.source[i] === ' ' || state.source[i] === '\t') {
      ++i;
    } else if (state.source[i] === '\n') {
      break;
    } else {
      return false;
    }
  }
  if (count < 3) return false;
  // Only whitespace allowed after
  while (i < state.len && (state.source[i] === ' ' || state.source[i] === '\t')) ++i;
  if (i < state.len && state.source[i] === '\n') ++i;
  else if (i !== state.len) return false;
  state.pos = i;
  state.nodes.push(new HrNode(start, state.pos));
  return true;
}
