// @ts-check

import { renderValue } from './render-value';
import { renderPropName } from './render-prop-name';

import './render-array.css';

/**
 * @param {import('.').ValueRenderParams<any[]>} params
 */
export function renderArray(params) {
  const { value, path, indent: originialIndent, invalidate, state } = params;
  const indent = originialIndent + '  ';

  /** @type {import('..').RenderedContent[]} */
  let output = [];
  const openingSquareBracket = { class: 'hi-obj-array hi-punctuation', textContent: '[' };
  output.push(openingSquareBracket);

  let complexObjects = 0;
  let ownProperties = 0;
  let index = 0;
  const entries = Object.getOwnPropertyNames(value).map((k) => {
    if (k === 'length') return;

    const i = Number(k);
    const isIndex = !Number.isNaN(i);

    if (!isIndex) ownProperties++;

    const item = value[i];
    if (typeof item === 'object' && item !== null)
      complexObjects++;

    const itemPath = isIndex ? path + '[' + k + ']' : path + '.' + k;

    let itemOutput = renderValue({ value: item, path: itemPath, indent: indent + ' ', invalidate, state });
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
      const propName = renderPropName({ value: k, path: itemPath, indent: indent + ' ', invalidate, state });
      /** @type {import('..').RenderedContent[]} */
      let arr = Array.isArray(propName) ? propName : [propName];
      if (itemOutput && Array.isArray(itemOutput)) arr = arr.concat(itemOutput);
      else arr.push(itemOutput);
      return arr;
    }
  }).filter(Boolean);

  /** @type {import('..').RenderedContent[][] | undefined} */
  let objEntries;
  for (const k in value) {
    if (Number.isNaN(Number(k))) {
      const itemPath = path + '.' + k;
      const itemOutput = renderValue({ value: value[k], path: itemPath, indent: indent + ' ', invalidate, state });

      const propName = renderPropName({ value: k, path: itemPath, indent: indent + ' ', invalidate, state });

      if (!objEntries) objEntries = [];

      /** @type {import('..').RenderedContent[]} */
      let arr = Array.isArray(propName) ? propName : [propName];
      if (itemOutput && Array.isArray(itemOutput)) arr = arr.concat(itemOutput);
      else arr.push(itemOutput);

      objEntries.push(arr);
    }
  }

  if (!complexObjects && !ownProperties) {
    // TODO: break array into multiple lines where it is very long
    for (let i = 0; i < entries.length; i++) {
      // array in single line
      if (i) output.push({ class: 'hi-obj-array hi-punctuation', textContent: ',' });
      const arr = entries[i];
      if (Array.isArray(arr)) output = output.concat(arr);
      else output.push(/** @type {import('..').RenderedContent} */(arr));
    }
  } else {
    // TODO: insert a collapse handle

    for (let i = 0; i < entries.length; i++) {
      if (!i) output.push('\n' + indent);
      else output.push({ class: 'hi-obj-array hi-punctuation', textContent: ',\n' + indent });

      const arr = entries[i];
      if (Array.isArray(arr)) output = output.concat(arr);
      else output.push(/** @type {import('..').RenderedContent} */(arr));
    }
  }

  output.push({ class: 'hi-obj-array hi-punctuation', textContent: ']' });

  if (entries.length > 1) {
    openingSquareBracket.class += ' json-collapse-hint';

    // TODO: detect when to collapse

    if (state[path + '.expanded'] === false) {
      let combinedTextLength = 0;
      for (let i = 0; i < output.length; i++) {
        if (i === 0 || i === output.length - 1) continue;
        const e = output[i];
        if (typeof e === 'string') combinedTextLength += e.length;
        else if (e.textContent) combinedTextLength += e.textContent.length;
      }

      output = [
        output[0],
        {
          widget: () => {
            const expandButton = document.createElement('button');
            expandButton.className = 'json-toggle-expand';
            expandButton.textContent = '...' + combinedTextLength.toLocaleString();
            expandButton.onclick = () => {
              state[path + '.expanded'] = true;
              invalidate();
            };
            return expandButton;
          }
        },
        output[output.length - 1]
      ];
    } else {
      output.splice(1, 0, {
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
  }

  if (value.length > 1) {
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
