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
    if (trimmed.startsWith('{') && trimmed.endsWith('}') || trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const delegateWrap = { availableHeight: wrap.availableHeight - 2 };
        let renderedParsed = renderValue({
          value: JSON.parse(value),
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

  params.wrap.availableHeight = 1;
  return { class: 'hi-string', textContent: JSON.stringify(value) };
}