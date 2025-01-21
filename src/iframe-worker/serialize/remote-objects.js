// @ts-check

import { SerializationContext } from './serialization-context';

const ThroughTypes = [
  ArrayBuffer,
  DataView,
  Uint8Array, Uint8ClampedArray, Uint16Array, Uint32Array,
  Int8Array, Int16Array, Int32Array
];



/**
 * @typedef {{
 *  ___kind: 'Node',
 *  domAccessKey?: string,
 *  origin: string,
 *  nodeName: string,
 *  nodeType: string,
 *  contextMarker: string,
 *  textContent: string,
 *  childCount: number
 * }} SerializedDOMNode
 */

/** @param {Window} [win] */
export function storedElements(win) {
  const useWin = win || window;
  const WEAKMAP_WINDOW_TAG = '__weakmap_window_tag__';

  /** @type {Map<string, WeakRef<Node>>} */
  const storedElementSet = useWin[WEAKMAP_WINDOW_TAG] || (
    useWin[WEAKMAP_WINDOW_TAG] = new Map());

  return storedElementSet;
}

export function remoteObjects() {

  /** @type {Map<string, {resolve: (obj: any) => void, reject: (err: any) => void}>} */
  const callCache = new Map();
  let callCacheTag = 10;

  const remote = {
    serialize,
    deserialize,
    onSendMessage: (msg) => { },
    onReceiveMessage
  };

  const context = new SerializationContext();
  context.sendCallMessage = (msg) => {
    const callKey = 'call-' + msg.key + ':' + (callCacheTag++);

    const result = new Promise((resolve, reject) => {
      callCache.set(callKey, { resolve, reject });
    });

    remote.onSendMessage({
      callKind: 'call',
      callKey,
      msgKey: msg.key,
      args: context.serialize(msg.args)
    });

    return result;
  };

  return remote;

  async function onReceiveMessage(msg) {
    switch (msg.callKind) {
      case 'call': handleCallMessage(msg); break;
      case 'return': handleReturnMessage(msg);  break;
    }
  }

  async function handleCallMessage(msg) {
    let result;
    try {
      result = await context.functionCache.invokeFunctionPrimitive({
        key: msg.msgKey,
        args: context.deserialize(msg.args)
      });
    } catch (error) {
      remote.onSendMessage({
        callKind: 'return',
        callKey: msg.callKey,
        success: false,
        result: serialize(error)
      });
      return;
    }

    remote.onSendMessage({
      callKind: 'return',
      callKey: msg.callKey,
      success: true,
      result: serialize(result)
    });
  }

  function handleReturnMessage(msg) {
    const callEntry = callCache.get(msg.callKey);
    if (!callEntry) {
      console.warn('Unknown call message ', msg);
      return;
    }

    callCache.delete(msg.callKey);

    if (msg.success) callEntry.resolve(deserialize(msg.result));
    else callEntry.reject(msg.result);
  }

  /** @param {unknown} obj */
  function serialize(obj) {
    return context.serialize(obj);
  }

  /** @param {unknown} obj */
  function deserialize(obj) {
    return context.deserialize(obj);
  }
}
