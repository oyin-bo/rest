// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHr } from '../parse-hr.js';

function makeState(source) {
  return {
    source,
    pos: 0,
    len: source.length,
    currentChar: source.charCodeAt(0),
    /** @type {object[]} */
    nodes: [],
    advance(n = 1) {
      this.pos += n;
      this.currentChar = this.pos < this.len ? this.source.charCodeAt(this.pos) : -1;
    }
  };
}

test('parseHr parses ---', () => {
  const src = '---\n';
  const state = makeState(src);
  const ok = parseHr(state);
  assert.equal(ok, true);
  assert.equal(state.nodes.length, 1);
  assert.equal(state.nodes[0].type, 'hr');
});

test('parseHr parses ***', () => {
  const src = '***\n';
  const state = makeState(src);
  const ok = parseHr(state);
  assert.equal(ok, true);
  assert.equal(state.nodes.length, 1);
  assert.equal(state.nodes[0].type, 'hr');
});

test('parseHr fails on non-hr', () => {
  const src = 'not a rule';
  const state = makeState(src);
  const ok = parseHr(state);
  assert.equal(ok, false);
  assert.equal(state.nodes.length, 0);
});
