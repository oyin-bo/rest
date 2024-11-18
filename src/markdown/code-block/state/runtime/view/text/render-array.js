// @ts-check

import { renderComposite } from './render-composite';

import './render-array.css';

/**
 * @param {import('.').ValueRenderParams<any[]>} params
 */
export function renderArray(params) {
  return renderComposite(params);
}
