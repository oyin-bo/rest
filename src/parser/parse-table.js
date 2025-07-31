// @ts-check

import { CHAR_NL } from './parse-base-state.js';
import { TableNode } from './ast-nodes.js';

/**
 * Parse GitHub-flavored Markdown tables
 *
 * @param {import('./parse-base-state.js').ParserState} state
 * @returns {boolean}
 */
export function parseTable(state) {
  // Save start position
  const start = state.pos;
  // Read first line (header)
  let lineStart = state.pos;
  while (state.pos < state.len && state.currentChar !== CHAR_NL) state.advance();
  const headerLine = state.source.slice(lineStart, state.pos);
  if (state.currentChar === CHAR_NL) state.advance();
  // Read second line (alignment)
  lineStart = state.pos;
  while (state.pos < state.len && state.currentChar !== CHAR_NL) state.advance();
  const alignLine = state.source.slice(lineStart, state.pos);
  if (state.currentChar === CHAR_NL) state.advance();

  // Check for at least 1 pipe in header and alignment row must be valid
  function hasPipe(s) {
    for (let i = 0; i < s.length; ++i) if (s[i] === '|') return true;
    return false;
  }
  function isAlignmentCell(s) {
    let i = 0, n = s.length;
    while (i < n && s[i] === ' ') ++i;
    let left = false, right = false, dash = 0;
    if (s[i] === ':') { left = true; ++i; }
    while (i < n && s[i] === '-') { ++dash; ++i; }
    if (dash === 0) return false;
    if (i < n && s[i] === ':') { right = true; ++i; }
    while (i < n && s[i] === ' ') ++i;
    return i === n ? (left && right ? 'center' : left ? 'left' : right ? 'right' : null) : false;
  }
  if (!hasPipe(headerLine)) {
    state.pos = start;
    return false;
  }
  // Split alignment row into cells and check each (ignore leading/trailing empty)
  let alignCells = [], cell = '', inCell = false;
  for (let i = 0; i <= alignLine.length; ++i) {
    const ch = alignLine[i] || '|';
    if (ch === '|') {
      if (inCell) alignCells.push(cell.trim());
      cell = '';
      inCell = true;
    } else {
      cell += ch;
    }
  }
  // Remove leading/trailing empty
  if (alignCells.length && alignCells[0] === '') alignCells.shift();
  if (alignCells.length && alignCells[alignCells.length-1] === '') alignCells.pop();
  let aligns = [];
  for (let i = 0; i < alignCells.length; ++i) {
    const align = isAlignmentCell(alignCells[i]);
    if (align === false) {
      state.pos = start;
      return false;
    }
    aligns.push(align);
  }
  // Parse header cells (ignore leading/trailing empty)
  let headers = [], hcell = '', hinCell = false;
  for (let i = 0; i <= headerLine.length; ++i) {
    const ch = headerLine[i] || '|';
    if (ch === '|') {
      if (hinCell) headers.push(hcell.trim());
      hcell = '';
      hinCell = true;
    } else {
      hcell += ch;
    }
  }
  if (headers.length && headers[0] === '') headers.shift();
  if (headers.length && headers[headers.length-1] === '') headers.pop();
  aligns = aligns.slice(0, headers.length);
  // Parse body rows
  const rows = [];
  while (state.pos < state.len) {
    lineStart = state.pos;
    while (state.pos < state.len && state.currentChar !== CHAR_NL) state.advance();
    const rowLine = state.source.slice(lineStart, state.pos);
    if (!hasPipe(rowLine)) break;
    // Split row into cells (ignore leading/trailing empty)
    let rcells = [], rcell = '', rinCell = false;
    for (let i = 0; i <= rowLine.length; ++i) {
      const ch = rowLine[i] || '|';
      if (ch === '|') {
        if (rinCell) rcells.push(rcell.trim());
        rcell = '';
        rinCell = true;
      } else {
        rcell += ch;
      }
    }
    if (rcells.length && rcells[0] === '') rcells.shift();
    if (rcells.length && rcells[rcells.length-1] === '') rcells.pop();
    if (rcells.length) rows.push(rcells);
    if (state.currentChar === CHAR_NL) state.advance();
  }
  // Build table node
  state.nodes.push(new TableNode(start, state.pos, headers, aligns, rows));
  return true;
}
