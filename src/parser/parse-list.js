// @ts-check
import { ListNode, ListItemNode, TextNode } from './ast-nodes.js';
import { parseCodeBlock } from './parse-code-block.js';
import { parseParagraph } from './parse-paragraph.js';

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
    let itemStart = state.pos;
    let isUnordered = (c === '-' || c === '*' || c === '+');
    let isOrdered = false, num = 0, i = state.pos;
    if (!isUnordered) {
      while (i < state.len && state.source[i] >= '0' && state.source[i] <= '9') {
        num = num * 10 + (state.source[i].charCodeAt(0) - 48);
        i++;
      }
      isOrdered = (i > state.pos && state.source[i] === '.' && state.source[i+1] === ' ');
    }
    if (isUnordered || isOrdered) {
      if (isUnordered) {
        state.advance();
        if (state.source[state.pos] === ' ') state.advance();
      } else {
        state.advance(i - state.pos + 2); // skip number, dot, space
      }
      // Parse item content: allow paragraphs, code blocks, etc.
      let children = [];
      let itemEnd = state.pos;
      let firstLine = true;
      while (state.pos < state.len) {
        // End of item: blank line or next list marker
        let nextC = state.source[state.pos];
        if (nextC === '\n') {
          state.advance();
          itemEnd = state.pos;
          firstLine = false;
          continue;
        }
        // Next list item
        if ((state.source[state.pos] === '-' || state.source[state.pos] === '*' || state.source[state.pos] === '+') && (firstLine || state.source[state.pos-1] === '\n')) break;
        // Ordered list item
        let j = state.pos, nextNum = 0;
        while (j < state.len && state.source[j] >= '0' && state.source[j] <= '9') {
          nextNum = nextNum * 10 + (state.source[j].charCodeAt(0) - 48);
          j++;
        }
        if (j > state.pos && state.source[j] === '.' && state.source[j+1] === ' ') {
          if (firstLine || state.source[state.pos-1] === '\n') break;
        }
        // Indented code block inside list item
        if ((state.source[state.pos] === ' ' && state.source[state.pos+1] === ' ' && state.source[state.pos+2] === ' ' && state.source[state.pos+3] === ' ') || state.source[state.pos] === '\t') {
          let codeBlockStart = state.pos;
          if (parseCodeBlock(state)) {
            children.push(state.nodes.pop());
            itemEnd = state.pos;
            continue;
          }
        }
        // Paragraph inside list item
        if (parseParagraph(state)) {
          children.push(state.nodes.pop());
          itemEnd = state.pos;
          continue;
        }
        // Inline text fallback
        let lineStart = state.pos;
        while (state.pos < state.len && state.source[state.pos] !== '\n') state.advance();
        if (state.pos > lineStart) {
          children.push(new TextNode(lineStart, state.pos));
          itemEnd = state.pos;
        }
        if (state.pos < state.len && state.source[state.pos] === '\n') state.advance();
        firstLine = false;
      }
      items.push(new ListItemNode(itemStart, itemEnd, children));
      matched = true;
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
