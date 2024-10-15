// @ts-check

/**
 * @param {import('.').RenderParams<import('..').ScriptRuntimeStateExecuting>} _
 * @returns {(import('.').RenderedSpan |
 *  import('.').RenderedWidget |
 *  string
 * )[]}
 */
export function renderExecuting({ }) {
  return [{ class: 'low low-executing', textContent: '...' }];
}
