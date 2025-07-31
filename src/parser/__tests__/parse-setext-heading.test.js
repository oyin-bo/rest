// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSetextHeading } from '../parse-setext-heading.js';

function makeState(source) {
  return {
    source,
    pos: 0,
    len: source.length,
    currentChar: source.charCodeAt(0),
    nodes: [],
    advance(n = 1) {
      this.pos += n;
      this.currentChar = this.pos < this.len ? this.source.charCodeAt(this.pos) : -1;
    }
  };
}

test('parseSetextHeading parses === heading', () => {
  const src = 'Heading\n======';
  const state = makeState(src);
  const ok = parseSetextHeading(state);
  assert.equal(ok, true);
  assert.equal(state.nodes.length, 1);
  const node = state.nodes[0];
  assert.equal(node.type, 'heading');
  assert.equal(node.level, 1);
});

test('parseSetextHeading parses --- heading', () => {
  const src = 'Heading\n------';
  const state = makeState(src);
  const ok = parseSetextHeading(state);
  assert.equal(ok, true);
  assert.equal(state.nodes.length, 1);
  const node = state.nodes[0];
  assert.equal(node.type, 'heading');
  assert.equal(node.level, 2);
});

test('parseSetextHeading fails on non-heading', () => {
  const src = 'Not a heading\nfoo';
  const state = makeState(src);
  const ok = parseSetextHeading(state);
  assert.equal(ok, false);
  assert.equal(state.nodes.length, 0);
});
