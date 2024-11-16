// @ts-check

/**
 * @param {RenderParams<string>} _
 */
export function renderString({ value }) {
  if (!value.length)
    return { class: 'string-empty', textContent: '""' };

  const trimmed = value.trim();
  if (trimmed.length > 10) {
    // TODO: check if it might be JSON island?
  }


}