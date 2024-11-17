// @ts-check

/**
 * @param {string} propName
 */
export function renderPropName(propName) {
  if (propName === '') return { class: 'hi-string', textContent: '""' };

  const str = JSON.stringify(propName);

  return [
    { class: 'hi-string-property-quote', textContent: str.charAt(0) },
    { class: 'hi-property', textContent: str.slice(1, -1) },
    { class: 'hi-string-property-quote', textContent: str.charAt(str.length - 1) },
    { class: 'hi-punctuation', textContent: ': ' },
  ];
}