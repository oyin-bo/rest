// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { ParserState } from '../parse-base-state.js';
import { HtmlNode } from '../ast-nodes.js';
import { parseHtml } from '../parse-html.js';

test('parseHtml parses inline HTML', () => {
  const src = 'Hello <b>world</b>!';
  const state = new ParserState(src);
  state.pos = 6; // position at '<'
  const result = parseHtml(state);
  assert.equal(result, true);
  assert.ok(state.nodes.some(n => n instanceof HtmlNode));
});

test('parseHtml parses block HTML', () => {
  const src = '<div>block html</div>';
  const state = new ParserState(src);
  const result = parseHtml(state);
  assert.equal(result, true);
  assert.equal(state.nodes.length, 1);
  assert.ok(state.nodes[0] instanceof HtmlNode);
  assert.equal(src.slice(state.nodes[0].start, state.nodes[0].end), '<div>block html</div>');
});
