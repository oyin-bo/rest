// @ts-check

import { renderComposite } from './render-composite';
import { renderElement } from './render-element';
import { renderNode } from './render-node';

/**
 * @param {import('.').ValueRenderParams<any>} params
 */
export function renderObject(params) {
  let kind;
  try {
    kind = params.value.___kind;
  } catch (errProp) {
    return renderComposite(params);
  }

  switch (kind) {
    case 'Element':
      return renderElement(params);
    case 'Node':
      return renderNode(params);
    case 'DOMNode':
      if (params.value.tagName)
        return renderElement(params);
      else
        return renderNode(params);
  }

  return renderComposite(params);
}