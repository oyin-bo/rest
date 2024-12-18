// @ts-check

import { renderComposite } from './render-composite';

import './render-node.css';

/**
 * @param {import('.').ValueRenderParams<import('../../../../../../iframe-worker/serialize/remote-objects').SerializedDOMNode>} params
 */
export function renderNode(params) {
  if (params.value.nodeType === 'TEXT') {
    const simpleText = /\S/.test(params.value.textContent);
    return {
      class: simpleText ? 'hi-node-text' : 'hi-node-text hi-node-text-json',
      textContent:
        simpleText ? params.value.textContent :
          JSON.stringify(params.value.textContent)
    };
  }

  return renderComposite(params);
}
