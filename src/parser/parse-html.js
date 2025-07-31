// @ts-check
import { HtmlNode } from './ast-nodes.js';
import { CHAR_LT, SELF_CLOSING_TAGS, BLOCK_TAGS } from './parse-base-state.js';

/**
 * Parse an HTML block or inline HTML tag.
 *
 * @param {import('./parse-base-state.js').ParserState} state
 * @returns {boolean}
 */
export function parseHtml(state) {
  if (state.currentChar !== CHAR_LT) return false;
  const htmlStart = state.pos;
  const tagEnd = state.source.indexOf('>', state.pos);
  if (tagEnd === -1) return false;
  let tagName = '';
  let isSelfClosing = false;
  let i = state.pos + 1;
  let c = state.source.charCodeAt(i);
  // Parse tag name
  if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) {
    while (i < tagEnd) {
      c = state.source.charCodeAt(i);
      if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57)) {
        tagName += state.source[i];
        i++;
      } else {
        break;
      }
    }
  }
  tagName = tagName.toLowerCase();
  // Check for self-closing syntax (e.g., <br/>)
  const beforeClose = state.source.slice(Math.max(tagEnd - 1, htmlStart), tagEnd);
  if (beforeClose.trim().endsWith('/')) isSelfClosing = true;
  // Or if tag is in self-closing set
  if (SELF_CLOSING_TAGS.has(tagName)) isSelfClosing = true;
  // Block-level HTML
  if (tagName && BLOCK_TAGS.has(tagName) && !isSelfClosing) {
    const closeTag = '</' + tagName + '>';
    const closeIdx = state.source.indexOf(closeTag, tagEnd);
    if (closeIdx !== -1) {
      state.nodes.push(new HtmlNode(htmlStart, closeIdx + closeTag.length, []));
      state.pos = closeIdx + closeTag.length;
      return true;
    }
  }
  // Inline or self-closing HTML tag
  state.nodes.push(new HtmlNode(htmlStart, tagEnd + 1, undefined));
  state.pos = tagEnd + 1;
  return true;
}
