// @ts-check
/**
 * CommonMark spec.txt test extractor and runner (stub version)
 * This script parses spec.txt and generates a test for each example, but all tests pass unconditionally.
 * Actual parser and HTML comparison logic will be added later.
 */


import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdownHtml } from '../markdown-html-parser.js';
import { renderHtml } from '../render-html.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPEC_PATH = path.join(__dirname, 'spec.txt');

/**
 * Parse spec.txt and extract test cases as {sections, markdown, html, comment}
 * @param {string} specText
 * @returns {Array<{sections: string[], markdown: string, html: string, comment: string}>}
 */
function extractSpecTests(specText) {
  const lines = specText.split(/\r?\n/);
  const tests = [];
  let sectionStack = [];
  let inExample = false;
  let inMarkdown = false;
  let inHtml = false;
  let markdown = [];
  let html = [];
  let lastComment = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Section headers (track hierarchy)
    const m = /^(#{1,6}) (.*)/.exec(line);
    if (m) {
      const level = m[1].length;
      const title = m[2].trim();
      sectionStack = sectionStack.slice(0, level - 1);
      sectionStack[level - 1] = title;
      lastComment = [];
      continue;
    }
    // Start of example
    if (/^`{32,} example/.test(line)) {
      inExample = true;
      inMarkdown = true;
      markdown = [];
      html = [];
      // Find preceding comment block (non-header, non-blank, non-example lines)
      let j = i - 1;
      lastComment = [];
      while (j >= 0) {
        const prev = lines[j];
        if (/^(#{1,6}) /.test(prev) || /^`{32,}/.test(prev)) break;
        if (prev.trim() === '') {
          if (lastComment.length > 0) break; // stop at first blank after comment
        } else {
          lastComment.unshift(prev);
        }
        j--;
      }
      continue;
    }
    // End of markdown, start of HTML
    if (inExample && line === '.') {
      inMarkdown = false;
      inHtml = true;
      continue;
    }
    // End of example
    if (inExample && /^`{32,}/.test(line)) {
      inExample = false;
      inHtml = false;
      tests.push({
        sections: sectionStack.filter(Boolean),
        markdown: markdown.join('\n'),
        html: html.join('\n'),
        comment: lastComment.join(' ').trim(),
      });
      continue;
    }
    // Collect lines
    if (inExample) {
      if (inMarkdown) {
        markdown.push(line);
      } else if (inHtml) {
        html.push(line);
      }
    }
  }
  return tests;
}

const specText = fs.readFileSync(SPEC_PATH, 'utf8');
const tests = extractSpecTests(specText);


// Run only the first 5 tests for focused debugging
function getFirstSentence(text) {
  if (!text) return '';
  const m = text.match(/^(.*?[.!?])(?:\s|$)/);
  let sentence = m ? m[1] : text;
  sentence = sentence.replace(/[.!?:]+$/, '');
  return sentence.trim();
}

tests.slice(0, 5).forEach((t, i) => {
  let base = t.comment ? getFirstSentence(t.comment) : `Example ${i + 1}`;
  test(base, () => {
    const ast = parseMarkdownHtml(t.markdown);
    const actual = renderHtml(ast).replace(/\r\n|\r/g, '\n');
    const expected = t.html.replace(/\r\n|\r/g, '\n');
    assert.strictEqual(actual, expected);
  });
});
