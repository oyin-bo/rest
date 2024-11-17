// @ts-check

import { renderValue } from './render-value';

import './render-string.css';

/**
 * @param {import('.').ValueRenderParams<string>} params
 */
export function renderString(params) {
  const { value, path, indent: originialIndent, invalidate, state } = params;

  if (!value.length)
    return { class: 'string-empty hi-string', textContent: '""' };

  const trimmed = value.trim();
  if (trimmed.length > 10) {

    // handling JSON island inside string
    if (trimmed.startsWith('{') && trimmed.endsWith('}') || trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        let renderedParsed = renderValue({ value: JSON.parse(value), path: path + '.parse()', indent: originialIndent + '  ', invalidate, state });
        if (Array.isArray(renderedParsed)) {
          renderedParsed.unshift(
            { class: 'hi-string', textContent: '"' },
            { class: 'hi-json-mark-start', textContent: 'JSON/' });

          renderedParsed.push(
            { class: 'hi-json-mark-end', textContent: '/JSON' },
            { class: 'hi-string', textContent: '"' }
          );
        } else {
          renderedParsed = [
            { class: 'hi-string', textContent: '"' },
            { class: 'hi-json-mark-start', textContent: 'JSON/' },
            renderedParsed,
            { class: 'hi-json-mark-end', textContent: '/JSON' },
            { class: 'hi-string', textContent: '"' }
          ];
        }

        return renderedParsed;
      } catch (error) {
      }
    }

    // TODO: handle other interesting text formats
  }

  return { class: 'hi-string', textContent: JSON.stringify(value) };
}