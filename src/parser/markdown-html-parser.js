
// @ts-check
// Minimal prototype: single-pass Markdown+HTML parser
// Focus: headings, paragraphs, inline HTML, and block HTML
// All nodes reference the original source by start/end indices

import { ParserState, CHAR_NL, CHAR_CR } from './parse-base-state.js';
import { parseHeading } from './parse-heading.js';
import { parseSetextHeading } from './parse-setext-heading.js';
import { parseBlockquote } from './parse-blockquote.js';
import { parseList } from './parse-list.js';
import { parseCodeBlock } from './parse-code-block.js';
import { parseHr } from './parse-hr.js';
import { parseTable } from './parse-table.js';
import { parseHtml } from './parse-html.js';
import { parseParagraph } from './parse-paragraph.js';
import { parseInline } from './parse-inline.js';






/**
 * Parse Markdown+HTML into an array of AST nodes.
 * @param {string} source
 * @returns {Node[]}
 */
export function parseMarkdownHtml(source) {
  const state = new ParserState(source);
  while (state.pos < state.len) {
    // Skip whitespace (\n or \r)
    while (state.pos < state.len) {
      const c = state.currentChar;
      if (c === CHAR_NL || c === CHAR_CR) state.advance();
      else break;
    }
    if (state.pos >= state.len) break;

    if (parseHeading(state)) continue;
    if (parseSetextHeading(state)) continue;
    if (parseBlockquote(state)) continue;
    if (parseList(state)) continue;
    if (parseCodeBlock(state)) continue;
    if (parseHr(state)) continue;
    if (parseTable(state)) continue;
    if (parseHtml(state)) continue;
    if (parseParagraph(state)) continue;
    if (parseInline(state)) continue;
    // If nothing matched, advance to avoid infinite loop
    state.advance();
  }
  return state.nodes;
}


