// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTable } from '../parse-table.js';

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

test('parseTable parses a simple GFM table', () => {
  const src = `| h1 | h2 |\n|:--|--:|\n| a | b |\n| c | d |\n`;
  const state = makeState(src);
  const ok = parseTable(state);
  assert.equal(ok, true);
  assert.equal(state.nodes.length, 1);
  const table = state.nodes[0];
  assert.equal(table.type, 'table');
  assert.deepEqual(table.headers, ['h1', 'h2']);
  assert.deepEqual(table.aligns, ['left', 'right']);
  assert.deepEqual(table.rows, [
    ['a', 'b'],
    ['c', 'd']
  ]);
});

test('parseTable fails on non-table input', () => {
  const src = 'not a table\n';
  const state = makeState(src);
  const ok = parseTable(state);
  assert.equal(ok, false);
  assert.equal(state.nodes.length, 0);
});
