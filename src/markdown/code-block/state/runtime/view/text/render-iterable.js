// @ts-check

import { renderValue } from './render-value';

import './render-iterable.css';

const ITERATE_INITIAL_TIME = 3000;

/**
 * @param {import('.').ValueRenderParams<Iterable | AsyncIterable>} _
 * @returns {import('..').RenderedContent | import('..').RenderedContent[]}
 */
export function renderIterable({ value, path, indent, wrap, invalidate, state }) {
  /**
   * @typedef {{
   *  top: any[],
   *  paused: boolean,
   *  completed: boolean,
   *  error: any,
   *  next: () => void
   * }} IterationStatus
   */
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
          if (status.completed) return;

          status.top.push(entry);
          invalidate();

          const needsPause =
            status.paused ||
            (initial && Date.now() - lastRest > ITERATE_INITIAL_TIME);
          if (needsPause) {
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

  const top = !status.error ? [...status.top] :
    [
      ...status.top,
      status.error
    ];
  
  const topRender = renderValue({ value: top, path, indent, wrap, invalidate, state });

  const result = Array.isArray(topRender) ? topRender : [topRender];
  result.push({ class: 'indent-space-for-iterable', textContent: indent + '  ' });

  const showStatusCompletedButton =
    status && !status.completed;

  result.push({
    widget: () => {
      const isCompleted = status?.completed;
      const isRunning = !isCompleted && status && !status.paused;
      const btnMore = document.createElement('button');
      btnMore.className = (
        isCompleted ? 'iterable-more iterable-more-restart' :
          isRunning ? 'iterable-more iterable-more-running' :
            'iterable-more'
      ) + (showStatusCompletedButton ? ' iterable-more-edge' : '');

      btnMore.textContent = 'iterable';
      const icon = document.createElement('span');
      icon.textContent = isRunning ? '◾️' : '⏵';
      icon.className = isRunning ?
        'iterable-more-icon iterable-more-icon-running' :
        'iterable-more-icon iterable-more-icon-run';
      btnMore.appendChild(icon);

      btnMore.onclick = () => {
        if (isCompleted) {
          state.iterationStatuses.set(value, status = undefined);
        } else if (status?.paused) {
          status.paused = false;
          status?.next();
        } else if (status) {
          status.paused = true;
        }

        invalidate();
      };
      return btnMore;
    }
  });

  if (showStatusCompletedButton) {
    result.push({
      widget: () => {
        if (!status) return document.createElement('span');
        const { completed } = status;
        const btnMore = document.createElement('button');
        btnMore.className = 'iterable-additional-action';
        const icon = document.createElement('span');
        icon.textContent = completed ? '▹' : '×';
        icon.className = 'iterable-more-icon iterable-more-icon-stop';
        btnMore.appendChild(icon);
        btnMore.onclick = () => {
          if (status && !status?.completed) {
            status.completed = true;
          }
          invalidate();
        };
        return btnMore;
      }
    });
  }

  return result.flat();
}
