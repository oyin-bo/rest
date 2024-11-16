// @ts-check

import { renderError } from './text/render-error';

import './render-failed.css';

/**
 * @param {import('.').RenderParams<import('..').ScriptRuntimeStateFailed>} _
 * @returns {(import('.').RenderedSpan |
 *  import('.').RenderedWidget |
 *  string
 * )[]}
 */

export function renderFailed({ scriptState, viewState, invalidate }) {
  /** @type {(import('.').RenderedContent)[]} */
  let output = [];
  output.push({ class: 'fail fail-time execution-time', textContent: (scriptState.completed - scriptState.started) / 1000 + 's ' });

  const errArray = renderError({ value: scriptState.error, path: '', invalidate, state: viewState })
  output = output.concat(errArray);

  return output;
}
