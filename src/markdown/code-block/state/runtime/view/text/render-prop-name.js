// @ts-check

/**
 * @param {import('.').ValueRenderParams<string>} params
 */
export function renderPropName({ value, path, invalidate, state }) {
  if (value === '') return { class: 'hi-string', textContent: '""' };

  const str = JSON.stringify(value);

  return [
    { class: 'hi-string-property-quote', textContent: str.charAt(0) },
    { class: 'hi-property', textContent: str.slice(0, -1) },
    { class: 'hi-string-property-quote', textContent: str.charAt(-1) },
    { class: 'hi-punctuation', textContent: ': ' },
  ];
}