// @ts-check

import { renderValue } from './render-value';

import './render-string.css';

const MIN_SIZE_FOR_INTERPRETING = 10;

/**
 * @param {import('.').ValueRenderParams<string>} params
 */
export function renderString(params) {
  const { value, path, indent: originialIndent, wrap, invalidate, state } = params;

  const interpreted = interpretString(value);
  if (!interpreted) {
    params.wrap.availableHeight = 1;
    return { class: 'string-empty hi-string', textContent: !value ? '""' : JSON.stringify(value) };
  }

  const delegateWrap = { availableHeight: wrap.availableHeight - 2 };
  let renderedParsed = renderValue({
    value: interpreted.parsed,
    path: path + '.parse()',
    indent: originialIndent + '  ',
    wrap: delegateWrap,
    invalidate,
    state
  });
  wrap.availableHeight = delegateWrap.availableHeight;

  if (Array.isArray(renderedParsed)) {
    renderedParsed.unshift(
      { class: 'hi-string', textContent: '"' },
      { class: 'hi-json-mark-start', textContent: interpreted.markers[0] });

    renderedParsed.push(
      { class: 'hi-json-mark-end', textContent: interpreted.markers[1] },
      { class: 'hi-string', textContent: '"' }
    );
  } else {
    renderedParsed = [
      { class: 'hi-string', textContent: '"' },
      { class: 'hi-json-mark-start', textContent: interpreted.markers[0] },
      renderedParsed,
      { class: 'hi-json-mark-end', textContent: interpreted.markers[1] },
      { class: 'hi-string', textContent: '"' }
    ];
  }

  return renderedParsed;
}

/** @param {string} trimmed */
function likelyJSON(trimmed) {
  return (
    trimmed.startsWith('{') && trimmed.endsWith('}') ||
    trimmed.startsWith('[') && trimmed.endsWith(']')
  );
}

/** @param {string} trimmed */
function likelyCSV(trimmed) {
  // TODO: detect CSV
  return undefined;
}

/** @param {string} trimmed */
function likelySVGorXMLorHTML(trimmed) {
}

/** @param {string} trimmed */
function likelyTeX(trimmed) {

}

/**
 * @param {string} str
 */
export function interpretString(str) {
  if (!str) return "";
  const trimmed = str.trim();
  if (trimmed.length < MIN_SIZE_FOR_INTERPRETING) return;

  // handling JSON island inside string
  if (likelyJSON(trimmed)) {
    let parsed;
    let parsedMarkers;
    try {
      return { parsed: JSON.parse(trimmed), markers: ['JSON', 'JSON'] };
    } catch (error) {
      const removeLeadingZeroes = trimmed.replace(/^\0+/, '');
      const removeSurroundingZeroes = removeLeadingZeroes.replace(/\0+$/, '');
      if (removeSurroundingZeroes !== trimmed) {
        try {
          return {
            parsed: JSON.parse(removeSurroundingZeroes),
            markers: [
              removeLeadingZeroes === trimmed ? 'JSON/' : 'zJSON/',
              removeSurroundingZeroes === removeLeadingZeroes ? '/JSON' : 'JSONz'
            ]
          };
        } catch { }
      }

      if (!parsedMarkers) {
        const trimmedInsideZeroes = removeSurroundingZeroes.trim();
        const posNewLine = trimmedInsideZeroes.indexOf('\n');
        if (posNewLine >= 0) {
          const openBracket = trimmedInsideZeroes.charAt(0);
          const closeBracket = trimmedInsideZeroes.charAt(posNewLine - 1);
          if (openBracket === '{' && closeBracket === '}' ||
            openBracket === '[' && closeBracket === ']') {
            const lines = trimmedInsideZeroes.split('\n');
            let jsonlFailed;
            const jsonlParsed = lines.map(ln => {
              if (jsonlFailed) return;
              try {
                return JSON.parse(ln);
              } catch {
                jsonlFailed = true;
              }
            });

            if (!jsonlFailed)
              return {
                parsed: jsonlParsed,
                markers: [
                  removeLeadingZeroes === trimmed ? 'JSON-L/' : 'zJSON-L/',
                  removeSurroundingZeroes === removeLeadingZeroes ? '/JSON-L' : 'JSON-Lz'
                ]
              };
          }
        }
      }
    }
  }

  if (likelyCSV(trimmed)) {
  }
}
