// @ts-check

import { renderValue } from './render-value';
import { renderPropName } from './render-prop-name';

/**
 * @param {import('.').ValueRenderParams<any>} params
 */
export function renderObject(params) {
  const { value, path, indent: originialIndent, invalidate, state } = params;
  const indent = originialIndent + '  ';

  /** @type {import('..').RenderedContent[]} */
  let output = [];
  const openingSquareBracket = { class: 'hi-obj hi-punctuation', textContent: '{' };
  output.push(openingSquareBracket);

  let complexObjects = 0;
  let ownProperties = 0;
  const entries = /** @type {import('..').RenderedContent[][]} */(Object.getOwnPropertyNames(value).map((k) => {
    if (k === 'length') return;

    ownProperties++;

    const item = value[k];
    if (typeof item === 'object' && item !== null)
      complexObjects++;

    const itemPath = path + '.' + k;

    let itemOutput = renderValue({ value: item, path: itemPath, indent: indent + ' ', invalidate, state });
    const propName = renderPropName({ value: k, path: itemPath, indent: indent + ' ', invalidate, state });
    /** @type {import('..').RenderedContent[]} */
    let arr = Array.isArray(propName) ? propName : [propName];
    if (itemOutput && Array.isArray(itemOutput)) arr = arr.concat(itemOutput);
    else arr.push(itemOutput);
    return arr;
  }).filter(Boolean));

  const singleLine = !complexObjects;

  if (singleLine) {
    // TODO: break array into multiple lines where it is very long
    for (let i = 0; i < entries.length; i++) {
      // object in single line
      if (i) output.push({ class: 'hi-obj-array hi-punctuation', textContent: ',' });
      const arr = entries[i];
      if (Array.isArray(arr)) output = output.concat(arr);
      else output.push(/** @type {import('..').RenderedContent} */(arr));
    }
  } else {
    for (let i = 0; i < entries.length; i++) {
      if (!i) output.push('\n' + indent);
      else output.push({ class: 'hi-obj-array hi-punctuation', textContent: ',\n' + indent });

      const arr = entries[i];
      if (Array.isArray(arr)) output = output.concat(arr);
      else output.push(/** @type {import('..').RenderedContent} */(arr));
    }
    output.push('\n' + originialIndent);
  }

  output.push({ class: 'hi-obj hi-punctuation', textContent: '}' });

  if (entries.length > 2 && !singleLine) {
    openingSquareBracket.class += ' json-collapse-hint';

    const defaultExpand = entries.length < 11;
    const expanded = state[path + '.expanded'] ?? defaultExpand;

    if (!expanded) {
      // let combinedTextLength = 0;
      // for (let i = 0; i < output.length; i++) {
      //   if (i === 0 || i === output.length - 1) continue;
      //   const e = output[i];
      //   if (typeof e === 'string') combinedTextLength += e.length;
      //   else if (e.textContent) combinedTextLength += e.textContent.length;
      // }

      output = [
        output[0],
        {
          widget: () => {
            const expandButton = document.createElement('button');
            expandButton.className = 'json-toggle-expand';
            expandButton.textContent = '...' + entries.length.toLocaleString();
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

  return output;
}