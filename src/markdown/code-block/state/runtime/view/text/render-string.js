// @ts-check

import { renderValue } from './render-value';

import './render-string.css';

/**
 * @param {import('.').ValueRenderParams<string>} params
 */
export function renderString(params) {
  const { value, path, indent: originialIndent, wrap, invalidate, state } = params;

  if (!value.length) {
    params.wrap.availableHeight = 1;
    return { class: 'string-empty hi-string', textContent: '""' };
  }

  const trimmed = value.trim();
  if (trimmed.length > 10) {

    // handling JSON island inside string
    if (likelyJSON(trimmed)) {
      let parsed;
      let parsedMarkers;
      try {
        parsed = JSON.parse(value);
        parsedMarkers = ['JSON/', '/JSON'];
      } catch (error) {
        const removeLeadingZeroes = value.replace(/^\0+/, '');
        const removeSurroundingZeroes = removeLeadingZeroes.replace(/\0+$/, '');
        if (removeSurroundingZeroes !== value) {
          try {
            parsed = JSON.parse(removeSurroundingZeroes);
            parsedMarkers = [
              removeLeadingZeroes === value ? 'JSON/' : 'zJSON/',
              removeSurroundingZeroes === removeLeadingZeroes ? '/JSON' : 'JSONz'
            ];
          } catch {}
        }

        if (!parsedMarkers) {
          const trimmedInsideZeroes = removeSurroundingZeroes.trim();
          const posNewLine = trimmedInsideZeroes.indexOf('\n');
          if (posNewLine >= 0) {
            if (trimmedInsideZeroes.charCodeAt(posNewLine - 1) === trimmedInsideZeroes.charCodeAt(0)) {
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

              if (!jsonlFailed) {
                parsed = jsonlParsed;
                parsedMarkers = [
                  removeLeadingZeroes === value ? 'JSON-L/' : 'zJSON-L/',
                  removeSurroundingZeroes === removeLeadingZeroes ? '/JSON-L' : 'JSON-Lz'
                ];
              }
            }
          }
        }
      }

      if (parsedMarkers) {
        const delegateWrap = { availableHeight: wrap.availableHeight - 2 };
        let renderedParsed = renderValue({
          value: parsed,
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
            { class: 'hi-json-mark-start', textContent: parsedMarkers[0] });

          renderedParsed.push(
            { class: 'hi-json-mark-end', textContent: parsedMarkers[1] },
            { class: 'hi-string', textContent: '"' }
          );
        } else {
          renderedParsed = [
            { class: 'hi-string', textContent: '"' },
            { class: 'hi-json-mark-start', textContent: parsedMarkers[0] },
            renderedParsed,
            { class: 'hi-json-mark-end', textContent: parsedMarkers[1] },
            { class: 'hi-string', textContent: '"' }
          ];
        }

        return renderedParsed;

      }
    }

    // TODO: handle other interesting text formats
  }

  params.wrap.availableHeight = 1;
  return { class: 'hi-string', textContent: JSON.stringify(value) };
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