// @ts-check

import { renderValue } from './render-value';
import { renderPropName } from './render-prop-name';
import { DEFAULT_DESIRABLE_EXPAND_HEIGHT } from '../render-succeeded';

/**
 * @param {import('.').ValueRenderParams<any>} params
 */
export function renderObject(params) {
  const { value, path, indent: originialIndent, wrap, invalidate, state } = params;
  const indent = originialIndent + '  ';

  /** @type {import('..').RenderedContent[]} */
  let output = [];
  const openingSquareBracket = { class: 'hi-obj hi-punctuation', textContent: '{' };
  output.push(openingSquareBracket);

  let complexObjects = 0;
  let ownProperties = 0;
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
  const entries = /** @type {import('..').RenderedContent[][]} */(props.map((k) => {
    // TODO: no render for collapsed content
    // if (state[path + '.expanded'] === false) return;

    ownProperties++;

    const item = value[k];
    if (typeof item === 'object' && item !== null)
      complexObjects++;
    else if (typeof item === 'string' && item.length > 50)
      complexObjects++;

    const itemPath = path + '.' + k;

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

    const propName = renderPropName(k);
    /** @type {import('..').RenderedContent[]} */
    let arr = Array.isArray(propName) ? propName : [propName];
    if (itemOutput && Array.isArray(itemOutput)) arr = arr.concat(itemOutput);
    else arr.push(itemOutput);
    return arr;
  }).filter(Boolean));

  const singleLine = !complexObjects && props.length <= 10;

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

    const defaultExpand = entries.length < wrap.availableHeight * 3;
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