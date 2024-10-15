// @ts-check

/**
 * @param {import('.').RenderParams<import('..').ScriptRuntimeStateFailed>} _
 * @returns {(import('.').RenderedSpan |
 *  import('.').RenderedWidget |
 *  string
 * )[]}
 */

export function renderFailed({ scriptState }) {
  const output = [];
  output.push({ class: 'fail fail-time execution-time', textContent: (scriptState.completed - scriptState.started) / 1000 + 's' });
  const error = scriptState.error;
  if (!error || !(error instanceof Error)) {
    output.push({ class: 'fail fail-exotic', textContent: typeof error + ' ' + JSON.stringify(error) });
  } else {
    let wholeText = String(error).length > (error.stack || '').length ? String(error) : (error.stack || '');

    let title = wholeText.split('\n')[0];
    let subtitle = '';
    let details = wholeText.slice(title.length);

    if (title.indexOf(error.message) >= 0) {
      title = title.slice(0, title.indexOf(error.message));
      subtitle = error.message;
    }

    if (title)
      output.push({ class: 'fail fail-error fail-error-title', textContent: title });
    if (subtitle)
      output.push({ class: 'fail fail-error fail-error-subtitle', textContent: subtitle });
    if (details)
      output.push({ class: 'fail fail-error fail-error-details', textContent: details });
  }

  return output;
}
