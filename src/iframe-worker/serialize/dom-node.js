// @ts-check

import { storedElements } from './remote-objects';

/**
 * @typedef {{
 *  ___kind: 'DOMNode',
 *  domAccessKey: string,
 *  origin: string,
 *  nodeName: string,
 *  nodeType: string,
 *  tagName?: string,
 *  openingLine?: string,
 *  textContent?: string | null,
 *  childCount: number,
 *  getChildren: import('./function-primitive').SerializedFunctionPrimitive
 * }} SerializedDOMNode
 */

/**
 * @typedef {Omit<SerializedDOMNode, 'getChildren'> & {
 *  getChildren: () => Promise<DeserializedElement[]>
 * }} DeserializedElement
 */

const storedElementsPrivateSymbol = Symbol('storedElementsPrivateSymbol');
let privateKeyCounter = 0;

/**
 * @this {{
 *  serializeFunctionPrimitive(fn: Function, thisObj: any, methodKey: string): import('./function-primitive').SerializedFunctionPrimitive
 * }}
 * @param {Partial<Element> & Node} elem
 */
export function serializeDOMNode(elem) {
  ensureNodeTypes();

  let domAccessKey = elem[storedElementsPrivateSymbol];
  if (!domAccessKey) {
    domAccessKey =
      elem[storedElementsPrivateSymbol] =
      'DOM_ACCESS_KEY:' + String(privateKeyCounter ? (privateKeyCounter = privateKeyCounter + 1) : (privateKeyCounter = 1));
    const storedElementsSet = storedElements();
    storedElementsSet.set(domAccessKey, new WeakRef(elem));
  }

  const outerHTML = elem.outerHTML;
  const innerHTML = elem.innerHTML;

  const openingLine = innerHTML ?
    outerHTML?.slice(0, outerHTML.indexOf(innerHTML)) :
    outerHTML?.split('\n')[0];

  const childCount = elem.childNodes.length;

  /** @type {SerializedDOMNode} */
  const serialized = {
    ___kind: 'DOMNode',
    domAccessKey,
    origin: window.origin,
    nodeName: elem.nodeName,
    nodeType: nodeTypeLookup[elem.nodeType],
    tagName: elem.tagName,
    openingLine,
    childCount,
    getChildren: this.serializeFunctionPrimitive(() => {
      return [...elem.childNodes];
    }, elem, 'childNodes')
  };

  if (serialized.childCount) {
    try {
      serialized.textContent = elem.textContent
    } catch (e) {
    }
  }

  return serialized;
}

var nodeTypeLookup;

function ensureNodeTypes() {
  if (!nodeTypeLookup) {
    nodeTypeLookup = {};
    for (const k in Node) {
      if (k.endsWith('_NODE')) {
        const val = Node[k];
        if (Number.isFinite(val)) nodeTypeLookup[val] = k.replace(/_NODE$/, '');
      }
    }
  }
}

/**
 * @this {{
 *  deserializeFunctionPrimitive(fn: import('./function-primitive').SerializedFunctionPrimitive): () => Promise<any>
 * }}
 * @param {SerializedDOMNode} serialized
 */
export function deserializeDOMNode(serialized) {
  if (!serialized.domAccessKey) return serialized;

  return {
    ...serialized,
    getChildren: () => {
      const fn = this.deserializeFunctionPrimitive(serialized.getChildren);
      return fn();
    }
  };
}
