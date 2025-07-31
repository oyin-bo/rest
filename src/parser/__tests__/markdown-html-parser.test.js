// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdownHtml } from '../markdown-html-parser.js';
import { HeadingNode, ParagraphNode, HtmlNode, TextNode } from '../ast-nodes.js';

test('parseMarkdownHtml parses ATX heading', () => {
  const src = '# Hello world\n';
  const ast = parseMarkdownHtml(src);
  assert.equal(ast.length, 1);
  assert.ok(ast[0] instanceof HeadingNode);
  assert.equal(ast[0].level, 1);
  assert.ok(ast[0].children[0] instanceof TextNode);
  assert.equal(src.slice(ast[0].children[0].start, ast[0].children[0].end), 'Hello world');
});

test('parseMarkdownHtml parses paragraph', () => {
  const src = 'Just a paragraph.';
  const ast = parseMarkdownHtml(src);
  assert.equal(ast.length, 1);
  assert.ok(ast[0] instanceof ParagraphNode);
  assert.ok(ast[0].children[0] instanceof TextNode);
  assert.equal(src.slice(ast[0].children[0].start, ast[0].children[0].end), 'Just a paragraph.');
});

test('parseMarkdownHtml parses inline HTML', () => {
  const src = 'Hello <b>world</b>!';
  const ast = parseMarkdownHtml(src);
  assert(ast.some(n => n instanceof HtmlNode));
});

test('parseMarkdownHtml parses block HTML', () => {
  const src = '<div>block html</div>';
  const ast = parseMarkdownHtml(src);
  assert.equal(ast.length, 1);
  assert.ok(ast[0] instanceof HtmlNode);
  assert.equal(src.slice(ast[0].start, ast[0].end), '<div>block html</div>');
});

test('parseMarkdownHtml parses self-closing HTML', () => {
  const src = 'foo<br/>bar';
  const ast = parseMarkdownHtml(src);
  assert(ast.some(n => n instanceof HtmlNode));
});
