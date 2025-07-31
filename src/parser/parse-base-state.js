// @ts-check
// Shared parser state and constants for Markdown+HTML parser

/**
 * Lightweight parser state for Markdown+HTML parser
 * @class
 */
export class ParserState {
  /**
   * @param {string} source
   */
  constructor(source) {
    /** @type {string} */
    this.source = source;
    /** @type {number} */
    this.pos = 0;
    /** @type {number} */
    this.len = source.length;
    /** @type {any[]} */
    this.nodes = [];
  }
  /**
   * @returns {number}
   */
  get currentChar() {
    return this.source.charCodeAt(this.pos);
  }
  /**
   * @param {number} [n=1]
   */
  advance(n = 1) {
    this.pos += n;
  }
}

export const CHAR_NL = 10, CHAR_CR = 13, CHAR_HASH = 35, CHAR_LT = 60, CHAR_SPACE = 32;

/**
 * Set of self-closing HTML tag names (lowercase).
 * @type {Set<string>}
 */
export const SELF_CLOSING_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

/**
 * Set of block-level HTML tag names (lowercase).
 * @type {Set<string>}
 */
export const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'canvas', 'dd', 'div', 'dl', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hr', 'li', 'main', 'nav', 'noscript', 'ol', 'output', 'p', 'pre', 'section',
  'table', 'tfoot', 'ul', 'video'
]);
