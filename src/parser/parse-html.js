// @ts-check
import { HtmlNode, ParagraphNode, TextNode } from './ast-nodes.js';
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
  // Handle comments <!-- ... -->
  if (state.source.startsWith('<!--', state.pos)) {
    const endIdx = state.source.indexOf('-->', state.pos + 4);
    if (endIdx !== -1) {
      state.nodes.push(new HtmlNode(htmlStart, endIdx + 3, [state.source.slice(htmlStart, endIdx + 3)]));
      state.pos = endIdx + 3;
      return true;
    }
  }
  // Handle CDATA <![CDATA[ ... ]]>
  if (state.source.startsWith('<![CDATA[', state.pos)) {
    const endIdx = state.source.indexOf(']]>', state.pos + 9);
    if (endIdx !== -1) {
      state.nodes.push(new HtmlNode(htmlStart, endIdx + 3, [state.source.slice(htmlStart, endIdx + 3)]));
      state.pos = endIdx + 3;
      return true;
    }
  }
  // Handle processing instructions <? ... ?>
  if (state.source.startsWith('<?', state.pos)) {
    const endIdx = state.source.indexOf('?>', state.pos + 2);
    if (endIdx !== -1) {
      state.nodes.push(new HtmlNode(htmlStart, endIdx + 2, [state.source.slice(htmlStart, endIdx + 2)]));
      state.pos = endIdx + 2;
      return true;
    }
  }
  // Handle declarations <! ... >
  if (state.source.startsWith('<!', state.pos) && !state.source.startsWith('<!--', state.pos) && !state.source.startsWith('<![CDATA[', state.pos)) {
    const tagEnd = state.source.indexOf('>', state.pos + 2);
    if (tagEnd !== -1) {
      state.nodes.push(new HtmlNode(htmlStart, tagEnd + 1, [state.source.slice(htmlStart, tagEnd + 1)]));
      state.pos = tagEnd + 1;
      return true;
    }
  }
  // Find next '>'
  const tagEnd = state.source.indexOf('>', state.pos);
  if (tagEnd === -1) return false;
  // Parse tag name
  let tagName = '';
  let i = state.pos + 1;
  let c = state.source.charCodeAt(i);
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
  let isSelfClosing = false;
  const beforeClose = state.source.slice(Math.max(tagEnd - 1, htmlStart), tagEnd);
  if (beforeClose.trim().endsWith('/')) isSelfClosing = true;
  if (SELF_CLOSING_TAGS.has(tagName)) isSelfClosing = true;
  // Block-level HTML
  if (tagName && BLOCK_TAGS.has(tagName) && !isSelfClosing) {
    const closeTag = '</' + tagName + '>';
    const closeIdx = state.source.indexOf(closeTag, tagEnd);
    if (closeIdx !== -1) {
      state.nodes.push(new HtmlNode(htmlStart, closeIdx + closeTag.length, [state.source.slice(htmlStart, closeIdx + closeTag.length)]));
      state.pos = closeIdx + closeTag.length;
      return true;
    }
  }
  // If not a valid tag, treat as plain text
  if (!tagName || (!BLOCK_TAGS.has(tagName) && !SELF_CLOSING_TAGS.has(tagName))) {
    // Escape and push as TextNode inside ParagraphNode
    state.nodes.push(new ParagraphNode(htmlStart, tagEnd + 1, [new TextNode(htmlStart, tagEnd + 1, state.source.slice(htmlStart, tagEnd + 1))]));
    state.pos = tagEnd + 1;
    return true;
  }
  // Inline or self-closing HTML tag
  state.nodes.push(new HtmlNode(htmlStart, tagEnd + 1, [state.source.slice(htmlStart, tagEnd + 1)]));
  state.pos = tagEnd + 1;
  return true;
}
