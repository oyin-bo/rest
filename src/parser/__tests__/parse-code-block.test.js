// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCodeBlock } from '../parse-code-block.js';

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

test('parseCodeBlock parses fenced code block', () => {
  const src = '```js\nconsole.log(1)\n```\n';
  const state = makeState(src);
  const ok = parseCodeBlock(state);
  assert.equal(ok, true);
  assert.equal(state.nodes.length, 1);
  const node = state.nodes[0];
  assert.equal(node.type, 'codeBlock');
  assert.equal(node.lang, 'js');
  assert.equal(node.value, 'console.log(1)');
});

test('parseCodeBlock fails on non-code', () => {
  const src = 'not a code block';
  const state = makeState(src);
  const ok = parseCodeBlock(state);
  assert.equal(ok, false);
  assert.equal(state.nodes.length, 0);
});
