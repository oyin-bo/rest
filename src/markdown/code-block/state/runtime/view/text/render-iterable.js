// @ts-check

import { renderValue } from './render-value';

import './render-iterable.css';

const ITERATE_INITIAL_TIME = 600;
const ITERATE_RECURRENT_TIME = 2000;

/**
 * @param {import('.').ValueRenderParams<Iterable | AsyncIterable>} _
 * @returns {import('..').RenderedContent | import('..').RenderedContent[]}
 */
export function renderIterable({ value, path, indent, wrap, invalidate, state }) {
  /** @typedef {{
   *  top: any[],
   *  paused: boolean,
   *  completed: boolean,
   *  error: any,
   *  next: () => void
   * }} IterationStatus */
  /** @type {Map<any, IterationStatus>} */
  let iterationStatuses = state.iterationStatuses || (state.iterationStatuses = new Map());

  let status = iterationStatuses.get(value);
  if (!status) {
    status = {
      top: [],
      paused: false,
      completed: false,
      error: undefined,
      next: () => { }
    };
    state.iterationStatuses.set(value, status);

    (async () => {
      let initial = true;
      let lastRest = Date.now();
      try {
        for await (const entry of value) {
          status.top.push(entry);
          invalidate();

          if (Date.now() - lastRest > (initial ? ITERATE_INITIAL_TIME : ITERATE_RECURRENT_TIME)) {
            status.paused = true;
            // @ts-ignore
            let morePromise = new Promise(resolve => status.next = resolve);
            await morePromise;
            status.paused = false;
            initial = false;

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

  const top = !status.error ? status.top :
    [
      ...status.top,
      status.error
    ];
  
  const topRender = renderValue({ value: top, path, indent, wrap, invalidate, state });
  if (status.completed) {
    return topRender;
  }

  return [
    topRender,
    { class: 'indent-space-for-iterable', textContent: indent + '  ' },
    {
      widget: () => {
        const btnMore = document.createElement('button');
        btnMore.className = 'iterable-more';
        btnMore.textContent = status.paused ? '+ iterate...' : 'iterating . . .';
        btnMore.onclick = () => {
          status?.next();
        };
        return btnMore;
      }
    }
  ].flat();
}
