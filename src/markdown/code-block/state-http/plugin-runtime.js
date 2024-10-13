// @ts-check

import { Plugin, PluginKey } from '@milkdown/prose/state';

import { registerRuntime } from '../state/runtime/plugin-runtime-service';
import { execIsolation } from '../state/exec-isolation';
import { parseHttpText } from './plugin-highlights';

class HTTPRuntime {

  constructor() {
    /** @type {Map<string, Promise<string>>} */
    this.cachedRequests = new Map();
  }

  /**
   * @param {{ code: string, language: string | null | undefined }[]} codeBlockRegions
   * @param {import('@milkdown/prose/state').EditorState} editorState
   */
  parse(codeBlockRegions, editorState) {
    this.codeBlockRegions = codeBlockRegions;
    this.editorState = editorState;

    const results = [];
    const newCachedRequests = new Map();
    for (let iBlock = 0; iBlock < codeBlockRegions.length; iBlock++) {
      const block = codeBlockRegions[iBlock];
      if (block.language !== 'HTTP') continue;

      results[iBlock] = { variables: undefined };
      const existingReq = this.cachedRequests.get(block.code);
      if (existingReq) newCachedRequests.set(block.code, existingReq);
    }

    return results;
  }

  /** @param {number} iBlock */
  async runCodeBlock(iBlock) {

    const block = this.codeBlockRegions?.[iBlock];
    if (block?.language !== 'HTTP') return;

    const req = this.cachedRequests.get(block.code);
    if (req) return req;

    const parsed = parseHttpText(block.code);
    if (!parsed) throw new Error('HTTP request is invalid.');

    const newReq = fetch(
      parsed.firstLine.url,
      {
        headers: parsed.headers.reduce((acc, h) => {
        if (h?.name) acc[h.name] = h.value;
        return acc;
      }, {}),
      }).then(res => res.text()).then(txt => {
        try {
          const json = JSON.parse(txt);
          return json;
        } catch (err) {
          return txt;
        }
      });

    this.cachedRequests.set(block.code, newReq);

    return newReq;
  }
}

const key = new PluginKey('HTTP_RUNTIME');
export const httpRuntimePlugin = new Plugin({
  key,
  state: {
    init: (config, editorState) => {
      registerRuntime(
        editorState,
        new HTTPRuntime());
    },
    apply: (tr, pluginState, oldState, newState) => undefined
  },
});
