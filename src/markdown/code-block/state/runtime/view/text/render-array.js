// @ts-check

import { renderValue } from './render-value';
import { renderPropName } from './render-prop-name';

import './render-array.css';
import { DEFAULT_DESIRABLE_EXPAND_HEIGHT } from '../render-succeeded';

/**
 * @param {import('.').ValueRenderParams<any[]>} params
 */
export function renderArray(params) {
  const { value, path, indent: originialIndent, wrap, invalidate, state } = params;
  const indent = originialIndent + '  ';

  /** @type {import('..').RenderedContent[]} */
  let output = [];
  const openingSquareBracket = { class: 'hi-obj-array hi-punctuation', textContent: '[' };
  output.push(openingSquareBracket);

  let complexObjects = 0;
  let ownProperties = 0;
  let index = 0;
  const props = Object.getOwnPropertyNames(value);

  // try to budget the available height for the wrapping purposes
  const likelyComplexProps = props.filter((k) => {
    const item = value[k];
    if (typeof item === 'object' && item !== null) return true;
    if (typeof item === 'string' && item.length > 50) return true;
    return false;
  }).length;
  const likelyExpanded = state[path + '.expanded'] ?? (
    likelyComplexProps ? props.length < wrap.availableHeight * 3 :
      true
  );

  let spentHeight = 0;
  const entries = props.map((k, iProp) => {
    if (k === 'length') return;
    // TODO: no render for collapsed content
    // if (state[path + '.expanded'] === false) return;

    const i = Number(k);
    const isIndex = !Number.isNaN(i);

    if (!isIndex) ownProperties++;

    const item = value[k];
    if (typeof item === 'object' && item !== null)
      complexObjects++;
    else if (typeof item === 'string' && item.length > 50)
      complexObjects++;

    const itemPath = isIndex ? path + '[' + k + ']' : path + '.' + k;

    const allocateInnerHeight =
      // !likelyExpanded || state[path + '.expanded'] ? DEFAULT_DESIRABLE_EXPAND_HEIGHT :
        !likelyComplexProps ? wrap.availableHeight - spentHeight :
          wrap.availableHeight - props.length - spentHeight;

    const innerWrap = { availableHeight: allocateInnerHeight };

    let itemOutput = renderValue({
      value: item,
      path: itemPath,
      indent: indent + ' ',
      wrap: innerWrap,
      invalidate,
      state
    });

    spentHeight -= (innerWrap.availableHeight - allocateInnerHeight);

    if (isIndex && i > index + 1) {
      const skip = i - index - 1;
      const skipSpan = document.createElement('span');
      skipSpan.className = 'hi-obj-array hi-obj-array-skip';
      skipSpan.textContent = skip === 1 ? 'skip, ' : '…skip ' + skip + ', ';
      const skipWidget = {
        widget: () => {
          return skipSpan;
        }
      };

      if (itemOutput && Array.isArray(itemOutput)) itemOutput.unshift(skipWidget);
      else itemOutput = [skipWidget, itemOutput];
    }

    if (isIndex) {
      if (isIndex) index = i;
      return itemOutput;
    } else {
      const propName = renderPropName(k);
      /** @type {import('..').RenderedContent[]} */
      let arr = Array.isArray(propName) ? propName : [propName];
      if (itemOutput && Array.isArray(itemOutput)) arr = arr.concat(itemOutput);
      else arr.push(itemOutput);
      return arr;
    }
  }).filter(Boolean);

  const singleLine = !complexObjects && !ownProperties;

  if (singleLine) {
    // TODO: break array into multiple lines where it is very long
    for (let i = 0; i < entries.length; i++) {
      // array in single line
      if (i) output.push({ class: 'hi-obj-array hi-punctuation', textContent: ',' });
      const arr = entries[i];
      if (Array.isArray(arr)) output = output.concat(arr);
      else output.push(/** @type {import('..').RenderedContent} */(arr));
    }
  } else {
    openingSquareBracket.class += ' json-collapse-hint';

    const defaultExpand = entries.length < wrap.availableHeight * 5;
    const expanded = state[path + '.expanded'] ?? defaultExpand;
    const expandedTo =
      !expanded ? 0 :
        entries.length < 20 ? entries.length :
          (state[path + '.expandedTo'] ?? 20);

    if (expandedTo) {
      output.push({
        widget: () => {
          const collapseButton = document.createElement('button');
          collapseButton.className = 'json-toggle-collapse';
          collapseButton.onclick = () => {
            state[path + '.expanded'] = false;
            invalidate();
          };
          return collapseButton;
        }
      });
    }

    for (let i = 0; i < expandedTo; i++) {
      if (!i) output.push('\n' + indent);
      else output.push({ class: 'hi-obj-array hi-punctuation', textContent: ',\n' + indent });

      const arr = entries[i];
      if (Array.isArray(arr)) output = output.concat(arr);
      else output.push(/** @type {import('..').RenderedContent} */(arr));
    }

    if (expandedTo < entries.length) {
      if (expandedTo)
        output.push({ class: 'hi-obj-array hi-punctuation', textContent: ',\n' + indent });

      output.push({
        widget: () => {
          const expandButton = document.createElement('button');
          expandButton.className = 'json-toggle-expand';
          expandButton.textContent =
            expandedTo ? '...' + (entries.length - expandedTo).toLocaleString() + ' more' :
              '...' + entries.length;
          expandButton.onclick = () => {
            state[path + '.expanded'] = true;
            state[path + '.expandedTo'] = entries.length;
            invalidate();
          };
          return expandButton;
        }
      });
    }

    if (expandedTo) {
      output.push('\n' + originialIndent);
    }
  }

  output.push({ class: 'hi-obj-array hi-punctuation', textContent: ']' });

  // TODO: hide count for small arrays, not just for 1-element arrays
  if (value.length >=10) {
    output.push({
      widget: () => {
        const countSpan = document.createElement('span');
        countSpan.className = 'hi-obj-array hi-obj-array-count';
        countSpan.textContent = value.length.toLocaleString();
        return countSpan;
      }
    });
  }

  return output;
}
