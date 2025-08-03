// @ts-check
import assert from 'assert';
import test from 'node:test';

import { parseMarkdown } from './markdownParser.js';

test.describe('Markdown AST', () => {

	test('AST types', () => {
		const ast = parseMarkdown(
			`
# Hello

This is **bold** and *italic*.`);
		assert.deepEqual(ast.children.map(n => n.type), ['heading', 'paragraph']);
	});

	test('AST types with lists', () => {
		const ast = parseMarkdown(
			`
# Hello

This is **bold** and *italic*.

- Item 1
- Item 2
- Item 3`);
		assert.deepEqual(ast.children.map(n => n.type), ['heading', 'paragraph', 'list']);
	});

	test('preserves emphasis marker', () => {
		const ast = parseMarkdown('*italic*');
		const p = ast.children[0];
		assert.equal(p.type, 'paragraph');
		const emphasis = p.children[0];
		assert.equal(emphasis.type, 'emphasis');
		// Should preserve marker
		assert.equal(emphasis.data && emphasis.data.marker, '*');
	});

	test('debug AST for emphasis marker', () => {
		const ast = parseMarkdown('*italic*');
		console.dir(ast, { depth: 10 });
	});

	test('preserves heading marker', () => {
		const ast = parseMarkdown('## Hello');
		const heading = ast.children[0];
		assert.strictEqual(heading.type, 'heading');
		assert.strictEqual(heading.data.marker, '##');
	});

	test('preserves list item marker', () => {
		const ast = parseMarkdown('- Item 1');
		const list = ast.children[0];
		const listItem = list.children[0];
		assert.strictEqual(listItem.type, 'listItem');
		assert.strictEqual(listItem.data.marker, '-');
	});

	test('preserves whitespace after heading marker', () => {
		const ast = parseMarkdown('#  Hello');
		const heading = ast.children[0];
		assert.strictEqual(heading.type, 'heading');
		assert.ok(heading.data, 'heading.data should exist');
		assert.strictEqual(heading.data.marker, '#');
		assert.strictEqual(heading.data.whitespaceAfterMarker, '  ');
	});

	test('preserves soft line break in paragraph', () => {
		const markdown = 'hello\nworld';
		const ast = parseMarkdown(markdown);
		const p = ast.children[0];
		assert.strictEqual(p.type, 'paragraph');
		assert.strictEqual(p.children.length, 3, 'should have 3 children: text, break, text');
		assert.strictEqual(p.children[0].type, 'text');
		assert.strictEqual(p.children[0].value, 'hello');
		assert.strictEqual(p.children[1].type, 'break');
		assert.strictEqual(p.children[2].type, 'text');
		assert.strictEqual(p.children[2].value, 'world');
	});

});

