// @ts-check

/**
 * Markdown parser using mdast-util-from-markdown
 * @param {string} markdown - The Markdown input to parse
 * @returns {object} AST produced by mdast-util-from-markdown
 */

import { fromMarkdown } from 'mdast-util-from-markdown';
import { preserveFormat } from './preserve-format-extension.js';
import { preserveFormatMdast } from './preserve-format-mdast-extension.js';

/**
 * Parse Markdown to AST, with optional extension for roundtrip details
 * @param {string} markdown
 */
export function parseMarkdown(markdown) {
  // Use extensions to preserve formatting details
  const ast = fromMarkdown(markdown, {
    extensions: [preserveFormat()],
    mdastExtensions: [preserveFormatMdast()]
  });
  return ast;
}
