// @ts-check
// Node.js built-in test for markdown-html-parser.js

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdownHtml } from './markdown-html-parser.js';
import { HeadingNode, ParagraphNode, HtmlNode, TextNode } from './ast-nodes.js';

test('parses ATX heading', () => {
  const src = '# Hello world\n';
  const ast = parseMarkdownHtml(src);
  assert.equal(ast.length, 1);
  assert.ok(ast[0] instanceof HeadingNode);
  assert.equal(ast[0].level, 1);
  // HeadingNode's children should be an array of TextNode(s)
  assert.ok(Array.isArray(ast[0].children));
  assert.ok(ast[0].children[0] instanceof TextNode);
  assert.equal(src.slice(ast[0].children[0].start, ast[0].children[0].end), 'Hello world');
});

test('parses paragraph', () => {
  const src = 'Just a paragraph.';
  const ast = parseMarkdownHtml(src);
  assert.equal(ast.length, 1);
  assert.ok(ast[0] instanceof ParagraphNode);
  assert.ok(Array.isArray(ast[0].children));
  assert.ok(ast[0].children[0] instanceof TextNode);
  assert.equal(src.slice(ast[0].children[0].start, ast[0].children[0].end), 'Just a paragraph.');
});

test('parses inline HTML', () => {
  const src = 'Hello <b>world</b>!';
  const ast = parseMarkdownHtml(src);
  assert(ast.some(n => n instanceof HtmlNode));
});

test('parses block HTML', () => {
  const src = '<div>block html</div>';
  const ast = parseMarkdownHtml(src);
  assert.equal(ast.length, 1);
  assert.ok(ast[0] instanceof HtmlNode);
  assert.equal(src.slice(ast[0].start, ast[0].end), '<div>block html</div>');
});

test('parses self-closing HTML', () => {
  const src = 'foo<br/>bar';
  const ast = parseMarkdownHtml(src);
  assert(ast.some(n => n instanceof HtmlNode));
});

test('AST nodes are tight (no gaps or overlaps)', () => {
  /**
   * @param {import('./ast-nodes.js').Node[]} nodes
   * @param {string} source
   */
  function checkAstTightness(nodes, source) {
    for (let i = 1; i < nodes.length; ++i) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      if (prev.end + (prev.trail || 0) < curr.start - (curr.lead || 0)) {
        const prevType = prev.type || prev.constructor.name;
        const currType = curr.type || curr.constructor.name;
        const prevLead = source.slice(prev.start, prev.start + (prev.lead || 0));
        const prevText = source.slice(prev.start, prev.end);
        const prevTrail = source.slice(prev.end - (prev.trail || 0), prev.end);
        const currLead = source.slice(curr.start, curr.start + (curr.lead || 0));
        const currText = source.slice(curr.start, curr.end);
        const currTrail = source.slice(curr.end - (curr.trail || 0), curr.end);

        throw new Error(
          'Gap [' + (i - 1) + ',' + i + ']:\n' +
          '  ' + prevType + ' ' + prev.start + ':' + prev.end + ' ' +
          (!prevLead ? '' : JSON.stringify(prevLead) + '>') +
          JSON.stringify(prevText) +
          (!prevTrail ? '' : '<' + JSON.stringify(prevTrail)) +
          '\n' +

          '  ' + JSON.stringify(source.slice(prev.end + (prev.trail || 0), curr.start - (curr.lead || 0))) + '\n' +

          '  ' + currType + ' ' + curr.start + ':' + curr.end + ' ' +
          (!currLead ? '' : JSON.stringify(currLead) + '>') +
          JSON.stringify(currText) +
          (!currTrail ? '' : '<' + JSON.stringify(currTrail)) +
          '\n'
        );
      }
      if (prev.end + (prev.trail || 0) > curr.start - (curr.lead || 0)) {
        const prevType = prev.type || prev.constructor.name;
        const currType = curr.type || curr.constructor.name;
        const prevText = source.slice(prev.start, prev.end);
        const currText = source.slice(curr.start, curr.end);
        throw new Error(
          'Overlap [' + (i - 1) + ',' + i + ']:\n' +
          '  ' + prevType + ' ' + prev.start + ':' + prev.end + ' ' + JSON.stringify(prevText) + '\n' +
          '  ' + currType + ' ' + curr.start + ':' + curr.end + ' ' + JSON.stringify(currText)
        );
      }
    }
  }
  const markdown = `
# Heading 1

---

## Heading 2

| Col1 | Col2 |
|------|------|
| A    | B    |

- foo

    bar

- baz

Paragraph after list.

### Heading 3

Another paragraph.

* * *

1. First
2. Second

<div>block html</div>
`;
  const ast = parseMarkdownHtml(markdown);
  checkAstTightness(ast, markdown);
});
