// @ts-check

/**
 * @param {string} str
 * @param {(import('..').RenderedContent)[]} output
 */
export function renderString(str, output) {
  if (!str.length) {
    output.push({ class: 'string-empty', textContent: '""' });
    return;
  }

  const trimmed = str.trim();
  if (trimmed.length > 10) {
    // TODO: check if it might be JSON island?
  }

}