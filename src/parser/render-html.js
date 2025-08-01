// @ts-check
// Minimal HTML renderer for Markdown AST (for testing)
import {
  TextNode,
  HeadingNode,
  ParagraphNode,
  HtmlNode,
  TableNode,
  CodeBlockNode,
  HrNode,
  ListNode,
  ListItemNode,
  BlockquoteNode
} from './ast-nodes.js';

/**
 * Render an AST node (or array of nodes) to HTML string.
 * @param {any|any[]} node
 * @returns {string}
 */
export function renderHtml(node) {
  if (Array.isArray(node)) return node.map(renderHtml).join('');
  if (!node) return '';
  switch (node.type) {
    case 'text':
      return escapeHtml(node.text || node.value || '');
    case 'em':
      return `<em>${renderHtml(node.children || '')}</em>`;
    case 'strong':
      return `<strong>${renderHtml(node.children || '')}</strong>`;
    case 'code':
      return `<code>${escapeHtml(node.value || '')}</code>`;
    case 'link':
      return `<a href="${escapeHtml(node.url || '')}">${escapeHtml(node.text || '')}</a>`;
    case 'heading':
      return `<h${node.level}>${renderHtml(node.children || '')}</h${node.level}>`;
    case 'paragraph':
      return `<p>${renderHtml(node.children || '')}</p>`;
    case 'html': {
      // If children is array of strings, escape and wrap in <p> unless block-level
      if (Array.isArray(node.children) && node.children.length > 0) {
        let htmlContent = node.children.map(c => typeof c === 'string' ? escapeHtml(c) : renderHtml(c)).join('');
        // If starts with block tag, do not wrap
        const blockTags = ['<div', '<table', '<blockquote', '<pre', '<ul', '<ol', '<h1', '<h2', '<h3', '<h4', '<h5', '<h6'];
        const trimmed = node.children[0].trim();
        if (blockTags.some(tag => trimmed.startsWith(tag))) {
          return htmlContent;
        }
        return `<p>${htmlContent}</p>`;
      }
      return '';
    }
    case 'table':
      return renderTable(node);
    case 'codeBlock':
      return `<pre><code${node.lang ? ` class=\"language-${escapeHtml(node.lang)}\"` : ''}>${escapeHtml(node.value || '')}</code></pre>`;
    case 'hr':
      return '<hr />';
    case 'list':
      return `<${node.ordered ? 'ol' : 'ul'}>\n${Array.isArray(node.items) ? node.items.map(renderHtml).join('\n') : ''}</${node.ordered ? 'ol' : 'ul'}>`;
    case 'listItem':
      return `<li>${renderHtml(node.children || '')}</li>`;
    case 'blockquote':
      return `<blockquote>\n${renderHtml(node.children || '')}\n</blockquote>`;
    default:
      return '';
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTable(node) {
  // node.headers: array of TextNode[]
  // node.rows: array of array of TextNode[]
  const headers = Array.isArray(node.headers) ? node.headers : [];
  const rows = Array.isArray(node.rows) ? node.rows : [];
  let thead = '<thead><tr>' + headers.map(h => `<th>${renderHtml(h)}</th>`).join('') + '</tr></thead>';
  let tbody = '<tbody>' + rows.map(row => '<tr>' + (Array.isArray(row) ? row.map(cell => `<td>${renderHtml(cell)}</td>`).join('') : '') + '</tr>').join('') + '</tbody>';
  return `<table>${thead}${tbody}</table>`;
}
