// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { ParserState, CHAR_NL } from '../parse-base-state.js';
import { HeadingNode, TextNode, CommentNode } from '../ast-nodes.js';
import { parseHeading } from '../parse-heading.js';

test('parseHeading parses ATX heading', () => {
  const src = '# Hello world\n';
  const state = new ParserState(src);
  const result = parseHeading(state);
  assert.equal(result, true);
  assert.equal(state.nodes.length, 1);
  assert.ok(state.nodes[0] instanceof HeadingNode);
  assert.equal(state.nodes[0].level, 1);
  assert.ok(state.nodes[0].children[0] instanceof TextNode);
  assert.equal(src.slice(state.nodes[0].children[0].start, state.nodes[0].children[0].end), 'Hello world');
});

test('HeadingNode and TextNode trivia and outerMarkdown', () => {
  const src = '   # Hello world   \n';
  const lead = 3, trail = 3;
  const leadComments = [new CommentNode(0, 2, '<!--c1-->')];
  const trailComments = [new CommentNode(17, 20, '<!--c2-->')];
  const textNode = new TextNode(5, 16, 'Hello world', 0, 0);
  // end position should be 19 to include all trailing spaces
  const node = new HeadingNode(3, 19, 1, [textNode]);
  node.lead = lead;
  node.trail = trail;
  node.leadComments = leadComments;
  node.trailComments = trailComments;
  // Check trivia fields
  assert.equal(node.lead, lead);
  assert.equal(node.trail, trail);
  assert.equal(node.leadComments, leadComments);
  assert.equal(node.trailComments, trailComments);
  // Check outerMarkdown
  assert.equal(node.outerMarkdown(src), '# Hello world   ');
  // Check TextNode logical text
  assert.equal(node.children[0].text, 'Hello world');
});
