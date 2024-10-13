// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';

import { addCodeHighlightProvider } from '../state/plugin-highlight-service';

const key = new PluginKey('HTTP_HIGHLIGHT');
export const httpHighlightPlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => {
      addCodeHighlightProvider(
        editorState,
        ({ codeBlockRegions, editorState, invalidate }) => {
          return getHttpHighlightsForCodeBlocks(codeBlockRegions);
        });
    },
    apply: (tr, pluginState, oldState, newState) => undefined
  },
});

/**
 * @param {import('../state-block-regions/find-code-blocks').CodeBlockNodeset[]} codeBlockRegions
 */
function getHttpHighlightsForCodeBlocks(codeBlockRegions) {
  /**
   * @type {(import('../state/plugin-highlight-service').CodeBlockHighlightSpan[] | undefined)[]}
   */
  const highlightsOfBlocks = [];

  for (let iBlock = 0; iBlock < codeBlockRegions.length; iBlock++) {
    const block = codeBlockRegions[iBlock];
    if (block.language !== 'HTTP') continue;

    const parsed = parseHttpText(block.code);
    if (parsed) {
      /** @type {typeof highlightsOfBlocks[0]} */
      const highlights = [];

      if (parsed.firstLine.verbLength)
        highlights.push({
          from: parsed.firstLine.verbPos,
          to: parsed.firstLine.verbPos + parsed.firstLine.verbLength,
          class: 'http-verb'
        });

      if (parsed.firstLine.urlLength)
        highlights.push({
          from: parsed.firstLine.urlPos,
          to: parsed.firstLine.urlPos + parsed.firstLine.urlLength,
          class: 'http-url'
        });

      if (parsed.headers) {
        for (const header of parsed.headers) {
          if (!header) continue;
          if (header.nameLength)
            highlights.push({
              from: header.namePos,
              to: header.namePos + header.nameLength,
              class: 'http-header-name'
            });

          if (header.valueLength)
            highlights.push({
              from: header.valuePos,
              to: header.valuePos + header.valueLength,
              class: 'http-header-value'
            });

          if (header.errors) {
            for (const error of header.errors) {
              highlights.push({
                from: error.pos,
                to: error.pos + error.length,
                class: 'http-header-error'
              });
            }
          }
        }
      }

      if (typeof parsed.bodyPos === 'number' && parsed.bodyLength) {
        highlights.push({
          from: parsed.bodyPos,
          to: parsed.bodyPos + parsed.bodyLength,
          class: 'http-body'
        });
      }

      if (highlights.length) highlightsOfBlocks[iBlock] = highlights;
    }
  }

  return highlightsOfBlocks;
}

/**
 * @param {string} httpText
 */
export function parseHttpText(httpText) {

  const nonWhitespace = /\S/.exec(httpText);
  if (!nonWhitespace) return undefined;

  const firstLineStart = nonWhitespace.index;

  let firstLineEnd = httpText.indexOf('\n', firstLineStart + 1);
  if (firstLineEnd < 0) firstLineEnd = httpText.length;

  const parsedFirstLine = parseHttpFirstLine(httpText.slice(firstLineStart, firstLineEnd));

  // headers...
  const parsedHeaders = [];
  let lineStart = firstLineEnd + 1;
  while (lineStart < httpText.length) {
    let lineEnd = httpText.indexOf('\n', lineStart);
    if (lineEnd < 0) lineEnd = httpText.length;

    if (lineEnd === lineStart) {
      // new line after headers
      lineStart = lineEnd + 1;
      break;
    }

    const header = parseHeader(lineStart, httpText.slice(lineStart, lineEnd));
    if (header) parsedHeaders.push(header);

    lineStart = lineEnd + 1;
  }

  // body...
  const rawBody = lineStart < httpText.length ? httpText.slice(lineStart) : undefined;

  return {
    firstLine: parsedFirstLine,
    headers: parsedHeaders,
    body: rawBody,
    bodyPos: rawBody ? lineStart : undefined,
    bodyLength: rawBody ? rawBody.length : undefined
  };
}

/**
 * @param {string} firstLine
 */
function parseHttpFirstLine(firstLine) {
  const verbUrlMatch = /^(\s*)([a-z0-9]+)(\s+)(.+)$/i.exec(firstLine);
  if (verbUrlMatch) {
    return {
      verb: verbUrlMatch[2],
      verbPos: verbUrlMatch.index + verbUrlMatch[1].length,
      verbLength: verbUrlMatch[2].length,
      url: verbUrlMatch[4],
      urlPos: verbUrlMatch.index + verbUrlMatch[1].length + verbUrlMatch[2].length + verbUrlMatch[3].length,
      urlLength: verbUrlMatch[4].length
    };
  }

  const url = firstLine.trim();

  return {
    verb: 'GET',
    verbPos: undefined, verbLength: undefined,
    url,
    urlPos: firstLine.indexOf(url),
    urlLength: url.length
  };
}

/**
 * @param {number} offset
 * @param {string} headerLine
 */
function parseHeader(offset, headerLine) {

  const headerMatch = /^(\s*)([^:]+)(\s*):(\s*)(.+)$/i.exec(headerLine);
  if (!headerMatch) {
    const errorText = headerLine.trim();
    if (!errorText) return;
    return {
      name: undefined, namePos: undefined, nameLength: undefined,
      value: undefined, valuePos: undefined, valueLength: undefined,
      errors: [
        {
          pos: offset + headerLine.indexOf(errorText),
          length: errorText.length,
          message: 'Colon must separate header name and value.'
        }
      ]
    };
  }

  return {
    name: headerMatch[2],
    namePos: offset + headerMatch.index + headerMatch[1].length,
    nameLength: headerMatch[2].length,
    value: headerMatch[5],
    valuePos: offset + headerMatch.index + headerMatch[1].length +
      headerMatch[2].length + headerMatch[3].length +
      1 + // colon character itself
      headerMatch[4].length,
    valueLength: headerMatch[5].length,
    errors: undefined
  };
}
