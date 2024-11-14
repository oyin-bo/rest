// @ts-check

import { renderObject } from './render-object';

/**
 * @param {any} result
 * @param {(import('..').RenderedContent)[]} output
 * @param {() => void} invalidate
 * @param {Record<string, any>} viewState
 */
export function renderIterable(result, output, invalidate, viewState) {
  /** @typedef {{ top: any[], completed: boolean, error: any, next: () => void }} IterationStatus */
  /** @type {Map<any, IterationStatus>} */
  let iterationStatuses = viewState.iterationStatuses || (viewState.iterationStatuses = new Map());

  let status = iterationStatuses.get(result);
  if (!status) {
    status = {
      top: [],
      completed: false,
      error: undefined,
      next: () => { }
    };
    viewState.iterationStatuses.set(result, status);

    (async () => {
      let lastRest = Date.now();
      try {
        for await (const entry of result) {
          status.top.push(entry);
          invalidate();

          if (Date.now() - lastRest > 600) {
            // @ts-ignore
            let morePromise = new Promise(resolve => status.next = resolve);
            await morePromise;

            lastRest = Date.now();
            invalidate();
          }
        }
        status.completed = true;
        invalidate();
      } catch (error) {
        status.completed = true;
        status.error = error;
        invalidate();
      }
    })();
  }

  const top = status.completed && !status.error ? status.top :
    [
      ...status.top,
      status.error || 'Loading...'
    ];

  renderObject(top, output, invalidate, viewState);

  output.push({
    widget: () => {
      const btnMore = document.createElement('button');
      btnMore.className = 'iterable-more';
      btnMore.textContent = 'More...';
      btnMore.onclick = () => {
        status?.next();
      };
      return btnMore;
    }
  });
}
