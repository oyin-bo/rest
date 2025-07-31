// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { ParserState } from '../parse-base-state.js';
import { ParagraphNode, TextNode } from '../ast-nodes.js';
import { parseParagraph } from '../parse-paragraph.js';

test('parseParagraph parses a paragraph', () => {
  const src = 'Just a paragraph.';
  const state = new ParserState(src);
  const result = parseParagraph(state);
  assert.equal(result, true);
  assert.equal(state.nodes.length, 1);
  assert.ok(state.nodes[0] instanceof ParagraphNode);
  assert.ok(state.nodes[0].children[0] instanceof TextNode);
  assert.equal(src.slice(state.nodes[0].children[0].start, state.nodes[0].children[0].end), 'Just a paragraph.');
});
