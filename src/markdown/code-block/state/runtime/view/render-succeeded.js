// @ts-check

import { accessLanguageService } from '../../../../../typescript-services';
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
    renderObject(scriptState.result, output, invalidate);

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
 */
function renderObject(result, output, invalidate) {
  if (typeof result === 'undefined') {
    output.push({ class: 'success success-quiet', textContent: 'OK' });
  } else if (typeof result === 'function') {
    const functionStr = String(result).trim();
    const firstLineEnd = functionStr.indexOf('\n');
    if (firstLineEnd < 0) {
      output.push({ class: 'success success-function', textContent: functionStr });
    } else {
      output.push({ class: 'success success-function', textContent: functionStr.slice(0, firstLineEnd) });
      output.push({ class: 'success success-function success-function-more', textContent: functionStr.slice(firstLineEnd) });
    }
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
        renderJsonWithTS(json, accessLang, output);
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
 */
function renderJsonWithTS(originalJson, accessLang, output) {

  const prettifiedJson = prettifyJson(originalJson, accessLang);

  accessLang.update({
    'file.json': prettifiedJson
  });
  const highlights = getHighlightSpansForCode(accessLang, prettifiedJson, 'file.json');

  let pos = 0;
  for (const hi of highlights) {
    if (pos < hi.from) {
      output.push({
        class: 'success success-json',
        textContent: prettifiedJson.slice(pos, hi.from)
      });
    }
    output.push({
      class: 'success ' + hi.class,
      textContent: prettifiedJson.slice(hi.from, hi.to)
    });

    pos = hi.to;
  }

  if (pos < prettifiedJson.length) {
    output.push({
      class: 'success success-json',
      textContent: prettifiedJson.slice(pos, prettifiedJson.length)
    });
  }
}

/**
 * @param {string} json
 * @param {import('../../../../../typescript-services').LanguageServiceAccess} accessLang
 */
function prettifyJson(json, accessLang) {
  accessLang.update({
    'source-file.json': json
  });

  const ast = /** @type {import('typescript').SourceFile} */(accessLang.languageService.getProgram()?.getSourceFile('source-file.json'));
  if (!ast) return json;

  /** @type {{ from: number, to: number, fill: string }[]} */
  const collapseSpans = [];
  ast.forEachChild(visit);
  collapseSpans.sort((a, b) => a.from - b.from);

  let pos = 0;
  let output = '';
  for (const span of collapseSpans) {
    output += json.slice(pos, span.from) + span.fill;
    pos = span.to;
  }
  output += json.slice(pos);

  return output;

  /**
   * @param {import('typescript').Node} node
   */
  function visit(node) {
    if (accessLang.ts.isObjectLiteralExpression(node)) {
      // no need to collapse already collapsed
      if (ast.getLineEndOfPosition(node.pos) === ast.getLineEndOfPosition(node.end)) return;

      let shouldCollapseToSingleLine = true;
      let allPropertiesShort = true;
      for (const property of node.properties) {
        if (ast.getLineEndOfPosition(property.getStart()) !== ast.getLineEndOfPosition(property.end)) {
          shouldCollapseToSingleLine = false;
          break;
        }
        if (property.getWidth() > 10) allPropertiesShort = false;
      }

      if (!allPropertiesShort && shouldCollapseToSingleLine && node.getText().replace(/\s*\n\s*/g, '').length > 180) shouldCollapseToSingleLine = false;

      if (shouldCollapseToSingleLine) {
        //collapseAroundNode(node);
        let lastPropEnd = 0;
        for (const property of node.properties) {
          if (!lastPropEnd) {
            collapseSpans.push({
              from: node.getStart(),
              to: property.getStart(),
              fill: '{ '
            });
          } else {
            collapseSpans.push({
              from: lastPropEnd,
              to: property.getStart(),
              fill: ', '
            });
          }

          //collapseAroundNode(property);
          lastPropEnd = property.end;
        }
        if (lastPropEnd) {
          collapseSpans.push({
            from: lastPropEnd,
            to: node.end,
            fill: ' }'
          });
        }
      } else {
        node.forEachChild(visit);
      }
    } else if (accessLang.ts.isArrayLiteralExpression(node)) {
      // no need to collapse already collapsed
      if (ast.getLineEndOfPosition(node.pos) === ast.getLineEndOfPosition(node.end)) return;

      let shouldCollapseToSingleLine = true;
      let allPropertiesShort = true;
      for (const property of node.elements) {
        if (ast.getLineEndOfPosition(property.getStart()) !== ast.getLineEndOfPosition(property.end)) {
          shouldCollapseToSingleLine = false;
          break;
        }
        if (property.getWidth() > 10) allPropertiesShort = false;
      }

      if (!allPropertiesShort && shouldCollapseToSingleLine && node.getText().replace(/\s*\n\s*/g, '').length > 180) shouldCollapseToSingleLine = false;

      if (shouldCollapseToSingleLine) {
        //collapseAroundNode(node);
        let lastPropEnd = 0;
        for (const property of node.elements) {
          if (!lastPropEnd) {
            collapseSpans.push({
              from: node.getStart(),
              to: property.getStart(),
              fill: '['
            });
          } else {
            collapseSpans.push({
              from: lastPropEnd,
              to: property.getStart(),
              fill: ', '
            });
          }

          //collapseAroundNode(property);
          lastPropEnd = property.end;
        }
        if (lastPropEnd) {
          collapseSpans.push({
            from: lastPropEnd,
            to: node.end,
            fill: ']'
          });
        }
      } else {
        node.forEachChild(visit);
      }
    } else {
      node.forEachChild(visit);
    }
  }

  /**
   * @param {import('typescript').Node} node
   */
  function collapseAroundNode(node) {
    const nodeLead = node.pos - node.getStart();
    if (nodeLead > 0) {
      collapseSpans.push({
        from: node.pos,
        to: node.pos + nodeLead,
        fill: node.pos ? ' ' : ''
      });
    }
  }
}