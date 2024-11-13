// @ts-check

import { accessLanguageService } from '../../../../../typescript-services';
import { collectRanges } from '../../../../../typescript-services/collect-ranges';
import { prettifyJson } from '../../../../../typescript-services/prettify-json';
import { getHighlightSpansForCode } from '../../../state-javascript/plugin-highlights';
import { collectColumns } from './table/collect-columns';
import { createTableViewAndToggle } from './table/create-table-view-and-toggle';

/**
 * @param {import('.').RenderParams<import('..').ScriptRuntimeStateSucceeded>} renderParams
 * @returns {(import('.').RenderedSpan |
 *  import('.').RenderedWidget |
 *  string
 * )[]}
 */
export function renderSucceeded(renderParams) {
  const { scriptState, viewState, invalidate } = renderParams;

  /**
   * @type {(import('.').RenderedSpan |
 *  import('.').RenderedWidget |
 *  string
 * )[]}
   */
  const output = [];

  if (typeof scriptState.result?.length === 'number' && scriptState.result?.length > 2) {
    const columns = collectColumns(scriptState.result);
    if (columns) {
      /** @type {ReturnType<typeof createTableViewAndToggle> | undefined} */
      let tableView = viewState.tableView;
      if (tableView) {
        tableView.rebind({ ...renderParams, columns });
      } else {
        tableView = viewState.tableView = createTableViewAndToggle({ ...renderParams, columns });
      }
      output.push({ widget: () => tableView.panel });
    }
  }

  output.push({ class: 'success success-time execution-time', textContent: (scriptState.completed - scriptState.started) / 1000 + 's ' });
  if (!viewState.tableViewSelected)
    renderObject(scriptState.result, output, invalidate, viewState);

  return output;
}

/** @type {ReturnType<typeof accessLanguageService> | undefined} */
var accessLang;

/**
 * @param {any} result
 * @param {(import('.').RenderedSpan |
 *  import('.').RenderedWidget |
 *  string
 * )[]} output
 * @param {() => void} invalidate
 * @param {Record<string, any>} viewState
 */
function renderObject(result, output, invalidate, viewState) {
  if (typeof result === 'undefined') {
    output.push({ class: 'success success-quiet', textContent: 'OK' });
  } else if (typeof result === 'function') {
    let functionName = result.name;
    if (!functionName) {
      functionName = String(result).trim().split('\n')[0];
      if (functionName.length > 60)
        functionName = functionName.slice(0, 50) + '...' + functionName.slice(-5);
    }
    output.push({ class: 'success success-function function-render hi-identifier', textContent: functionName });
    output.push({
      widget: () => {
        const btnRun = document.createElement('button');
        btnRun.className = 'function-render-invoke-button';
        btnRun.textContent = '() >';
        btnRun.onclick = async () => {
          /** @type {any} */
          let args = prompt('functionName arguments:');
          if (args === null) return;

          try {
            args = (0, eval)('[' + args + ']');
          } catch (err) {
            args = [args];
          }

          btnRun.textContent = '() >...';

          const returnValue = await result(...args);
          btnRun.textContent = '() = ' +
            (returnValue ? returnValue : typeof returnValue + ' ' + returnValue);
        };
        return btnRun;
      }
    })
  } else if (!result) {
    if (typeof result === 'string') {
      output.push({ class: 'success success-string', textContent: '""' });
    } else {
      output.push({ class: 'success success-value', textContent: String(result) });
    }
  } else {
    try {
      const json = JSON.stringify(result, null, 2);
      if (!accessLang) {
        accessLang = accessLanguageService(invalidate);
        if (typeof accessLang.then === 'function') {
          accessLang.then(resolved => {
            accessLang = resolved;
            invalidate();
          });
        }
      }

      if (typeof accessLang.then === 'function') {
        output.push({
          class: 'success success-json',
          textContent: json.length > 20 ? json.slice(0, 13) + '...' + json.slice(-4) : json
        });
      } else {
        renderJsonWithTS(json, accessLang, output, invalidate, viewState);
      }
    } catch {
      try {
        output.push({ class: 'success success-tostring', textContent: String(result) });
      } catch (toStringError) {
        output.push({ class: 'success success-tostring-error', textContent: toStringError.message.split('\n')[0] });
      }
    }
  }
}

/**
 * @param {string} originalJson
 * @param {import('../../../../../typescript-services').LanguageServiceAccess} accessLang
 * @param {(import('.').RenderedSpan |
 *  import('.').RenderedWidget |
 *  string
 * )[]} output
 * @param {() => void} invalidate
 * @param {Record<string, any>} viewState
 */
function renderJsonWithTS(originalJson, accessLang, output, invalidate, viewState) {

  const prettifiedJson = prettifyJson(originalJson, accessLang);

  accessLang.update({
    'file.json': prettifiedJson
  });
  const highlights = getHighlightSpansForCode(accessLang, prettifiedJson, 'file.json');
  const { allRanges } = collectRanges(accessLang, 'file.json') || {};

  console.log('collapse ranges? ', allRanges);

  let pos = 0;
  let iRange = 0;
  let iHighlight = 0;

  while (pos < prettifiedJson.length) {
    let hi = nextHighlightAfter(pos);
    let range = nextRangeAfter(pos);

    let nextStart = prettifiedJson.length;
    if (hi && hi.from <= nextStart) {
      nextStart = hi.from;
    } else {
      hi = undefined;
    }

    if (range && range.from <= nextStart) {
      nextStart = range.from;
    } else {
      range = undefined;
    }

    if (pos < nextStart) {
      output.push({
        class: 'success success-json',
        textContent: prettifiedJson.slice(pos, nextStart)
      });
      pos = nextStart;
    }

    if (range) {
      renderRange(range, iRange);
    } else if (hi) {
      output.push({
        class: 'success success-json ' + hi.class,
        textContent: prettifiedJson.slice(hi.from, hi.to)
      });
      pos = hi.to;
    } else if (pos < prettifiedJson.length) {
      output.push({
        class: 'success success-json',
        textContent: prettifiedJson.slice(pos)
      });
      pos = prettifiedJson.length;
    }
  }

  /**
   * @param {number} to
   * @param {string} trailingClass
   */
  function renderHighlightsUntil(to, trailingClass) {
    while (pos < to) {
      let hi = nextHighlightAfter(pos);
      if (hi && hi.from <= to) {
        if (hi.from > pos) {
          output.push({
            class: 'success success-json',
            textContent: prettifiedJson.slice(pos, hi.from)
          });
          pos = hi.from;
        }

        const end = Math.min(hi.to, to);
        output.push({
          class: 'success success-json ' + hi.class + (end === to ? ' ' + trailingClass : ''),
          textContent: prettifiedJson.slice(pos, end)
        });
        pos = end;
        iHighlight++;
      } else {
        if (pos < to) {
          output.push({
            class: 'success success-json ' + trailingClass,
            textContent: prettifiedJson.slice(pos, to)
          });
          pos = to;
        }
      }
    }
  }

  /**
   * @param {import('../../../../../typescript-services/collect-ranges').SemanticRange} range
   * @param {number} rangeIndex
   */
  function renderRange(range, rangeIndex) {
    let expanded = viewState['expanded-' + rangeIndex];
    if (typeof expanded !== 'boolean') expanded = !range.recommendCollapse;

    if (pos < range.from) {
      renderHighlightsUntil(range.from, '');
    }

    if (!expanded) {
      if (range.from < range.foldFrom) {
        renderHighlightsUntil(range.foldFrom, 'json-collapse-hint');
      }

      output.push({
        widget: () => {
          const button = document.createElement('button');
          button.className = 'json-toggle-expand';
          button.textContent = '...' + (range.toLine - range.fromLine - 1).toLocaleString() + ' lines...';
          button.title = prettifiedJson.slice(range.foldFrom, range.foldTo);
          button.onclick = () => {
            viewState['expanded-' + rangeIndex] = true;
            invalidate();
          };
          return button;
        }
      });

      output.push({
        class: 'render-result-range-collapse-all',
        textContent: prettifiedJson.slice(range.foldFrom, range.foldTo)
      })

      pos = range.foldTo;

      if (range.foldTo < range.to) {
        renderHighlightsUntil(range.to, '');
      }
    } else {
      if (range.foldFrom > range.from) {
        renderHighlightsUntil(range.foldFrom, 'json-collapse-hint');
      }

      output.push({
        widget: () => {
          const button = document.createElement('button');
          button.className = 'json-toggle-collapse';
          button.onclick = () => {
            viewState['expanded-' + rangeIndex] = false;
            invalidate();
          };
          return button;
        }
      });

      pos = range.foldFrom;
    }

    iRange++;
  }

  /** @param {number} pos */
  function nextHighlightAfter(pos) {
    while (iHighlight < highlights.length && highlights[iHighlight].from < pos) {
      iHighlight++;
    }

    return iHighlight < highlights.length ? highlights[iHighlight] : undefined;
  }

  /** @param {number} pos */
  function nextRangeAfter(pos) {
    if (!allRanges) return undefined;
    while (iRange < allRanges.length && allRanges[iRange].from < pos) {
      iRange++;
    }
    return iRange < allRanges.length ? allRanges[iRange] : undefined;
  }
}
