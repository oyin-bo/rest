// @ts-check

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

  /** @type {Map<any, any>} */
  var serializedGraph;

  /** @type {Map<any, any>} */
  var deserializedGraph;

  /** @type {Map<string, {resolve: (obj: any) => void, reject: (err: any) => void}>} */
  const callCache = new Map();
  let callCacheTag = 10;

  const storedElementsPrivateSymbol = Symbol('storedElementsPrivateSymbol');

  const remote = {
    serialize,
    deserialize,
    onSendMessage: (msg) => { },
    onReceiveMessage
  };

  return remote;

  function onReceiveMessage(msg) {
    switch (msg.callKind) {
      case 'function':
        handleFunctionMessage(msg);
        return;

      case 'iterable':
      case 'asyncIterable':
        handleIterableMessage(msg);
        return;

      case 'readableStream':
        handleReadableStreamMessage(msg);

      case 'return':
        const callEntry = callCache.get(msg.tag);
        if (!callEntry) {
          console.warn('Unknown call message ', msg);
          return;
        }

        if (msg.success) callEntry.resolve(deserialize(msg.result));
        else callEntry.reject(msg.result);
        break;

      case 'element:children':
        handleElementChildrenRequestMessage(msg);
        break;

      case 'element:children:result':
        handleElementChildrenReturnMessage(msg);
        break;
    }
  }

  /**
   * @param {string} callKind
   * @param {number} callKey
   * @param {any} [thisArg]
   * @param {unknown} [args]
   */
  function makeCall(callKind, callKey, thisArg, args) {
    callCacheTag++;
    const taggedCallKey = callCacheTag + ':' + callKind + ':' + callKey;

    const result = new Promise((resolve, reject) => {
      callCache.set(taggedCallKey, { resolve, reject });
    });

    remote.onSendMessage({ callKind, callKey, tag: taggedCallKey, this: thisArg, args });

    return result;
  }

  /** @param {unknown} obj */
  function serialize(obj) {
    let type = typeof obj;
    if (type === 'undefined' && obj !== undefined) type = 'object';

    switch (type) {
      case 'undefined':
      case 'string':
      case 'number':
      case 'boolean':
        return obj;

      case 'object':
        if (obj === null) return null;
        else break;

      case 'bigint':
        return {
          ___kind: 'bigint', value: /** @type {*} */(obj).toString()
        };
    }

    return serializeComplex(obj);
  }

  /** @param {unknown} obj */
  function deserialize(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    return deserializeComplex(obj);
  }

  /** @param {unknown} obj */
  function serializeComplex(obj) {
    if (!serializedGraph) {
      serializedGraph = new Map();
      try {
        return serializeCore(obj);
      } finally {
        // @ts-ignore
        serializedGraph = undefined;
      }
    } else {
      if (serializedGraph.has(obj)) return serializedGraph.get(obj);
      const serialized = serializeCore(obj);
      serializedGraph.set(obj, serialized);
      return serialized;
    }
  }

  /** @param {unknown} obj */
  function deserializeComplex(obj) {
    if (!deserializedGraph) {
      deserializedGraph = new Map();
      try {
        return deserializeCore(obj);
      } finally {
        // @ts-ignore
        deserializedGraph = undefined;
      }
    } else {
      if (deserializedGraph.has(obj)) return deserializedGraph.get(obj);
      const deserialized = deserializeCore(obj);
      deserializedGraph.set(obj, deserialized);
      return deserialized;
    }
  }

  /** @param {unknown} obj */
  function serializeCore(obj) {
    let type = typeof obj;
    if (type === 'undefined' && obj !== undefined) type = 'object';

    switch (type) {
      case 'object':
        if (obj === null) return null;
        if (Array.isArray(obj)) return serializeArray(obj);
        if (typeof safeGetProp(obj, Symbol.iterator) === 'function') return serializeIterable(/** @type {Iterable} */(obj));
        if (typeof safeGetProp(obj, Symbol.asyncIterator) === 'function') return serializeAsyncIterable(/** @type {AsyncIterable} */(obj));
        if (typeof safeGetProp(obj, 'then') === 'function') return serializePromise(/** @type {Promise} */(obj));
        return serializeObject(obj);

      case 'bigint':
        return { ___kind: 'bigint', value: /** @type {*} */(obj).toString() };

      case 'function':
        return serializeFunction(/** @type {*} */(obj));

      case 'symbol':
        return serializeSymbol(/** @type {*} */(obj));
    }
  }

  /** @param {any} obj */
  function deserializeCore(obj) {
    if (Array.isArray(obj)) return deserializeArray(obj);

    if (obj && typeof obj === 'object' && ThroughTypes.some(Ty => obj instanceof Ty))
      return obj;

    switch (obj.___kind) {
      case undefined:
        return deserializePlainObject(obj);

      case 'bigint':
        return BigInt(obj.value);

      case 'iterable':
        return deserializeIterable(obj);

      case 'asyncIterable':
        return deserializeAsyncIterable(obj);

      case 'date':
        return deserializeDate(obj);

      case 'regexp':
        return deserializeRegExp(obj);

      case 'url':
        return deserializeURL(obj);

      case 'error':
        return deserializeError(obj);

      case 'function':
        return deserializeFunction(obj);

      case 'map':
        return deserializeMap(obj);

      case 'set':
        return deserializeSet(obj);

      case 'promise':
        return deserializePromise(obj);

      case 'Window':
        return deserializeWindow();

      case 'custom':
        return deserializeCustomObject(obj);

      case 'symbol':
        return deserializeSymbol(obj);

      case 'Element':
        return deserializeElement(obj);

      case 'Node':
        return deserializeDOMNode(obj);

      default:
        return deserializePlainObject(obj);
    }
  }

  /** @param {Object} obj */
  function serializeObject(obj) {
    if (obj instanceof Date) return serializeDate(obj);
    if (obj instanceof RegExp) return serializeRegExp(obj);
    if (obj instanceof URL) return serializeURL(obj);
    if (obj instanceof Error) return serializeError(obj);
    if (obj instanceof Map) return serializeMap(obj);
    if (obj instanceof Set) return serializeSet(obj);
    // if (obj instanceof WeakMap) return serializeWeakMap(obj);
    // if (obj instanceof WeakSet) return serializeWeakSet(obj);
    if (ThroughTypes.some(Ty => obj instanceof Ty)) return serializeThrough(obj);
    if (obj instanceof Window) return serializeWindow(obj);
    if (obj instanceof Element) return serializeElement(obj);
    if (obj instanceof Node) return serializeDOMNode(obj);
    if (obj instanceof Response) return serializeResponse(obj);
    if (obj instanceof Request) return serializeRequest(obj);

    if (Object.getPrototypeOf(obj) === Object.prototype) return serializePlainObject(obj);
    else return serializeCustomObject(obj);
  }








  /** @type {Map<Function, string> | undefined} */
  var functionCallKeyCache;

  /** @param {Function} fn */
  function serializeFunction(fn) {
    if (!functionCallKeyCache) functionCallKeyCache = new Map();
    let callKey = functionCallKeyCache.get(fn);
    if (!callKey) functionCallKeyCache.set(fn, callKey = 'fn-' + functionCallKeyCache.size);

    const serialized = { ___kind: 'function', name: fn.name, source: fn.toString(), callKey };
    // TODO: adorn any extra own properties
    return serialized;
  }

  /** @param {{ ___kind: 'function', name: string, source: string, callKey: number }} fn */
  function deserializeFunction(fn) {
    const deserialized = ({
      [fn.name]: (...args) => {
        const pass = serialize(
          {
            args,
            'this': this
          });

        return makeCall(
          'function',
          fn.callKey,
          pass.this,
          pass.args
        );
      }
    })[fn.name];

    deserialized.toString = () => fn.source;

    return deserialized;
  }

  async function handleFunctionMessage(msg) {
    // callback to nowhere, nothing was serialized yet
    if (!functionCallKeyCache) return;

    const fn = [...functionCallKeyCache.entries()].find(([fn, key]) => key === msg.callKey)?.[0];
    if (typeof fn === 'function') {
      let result;
      let success = false;
      try {
        const passed = deserialize(msg);
        result = await fn.apply(passed['this'], passed.args);
        success = true;
      } catch (err) {
        result = err;
      }

      remote.onSendMessage({
        callKind: 'return',
        tag: msg.tag,
        success,
        result: serialize(result)
      });
    }
  }



  /** @param {ArrayBuffer | DataView} native */
  function serializeThrough(native) {
    const serialized = native;
    return serialized;
  }

  /** @param {Response} response */
  function serializeResponse(response) {
    // 
    return response;
  }

  /** @param {Request} req */
  function serializeRequest(req) {
    let body;
    if (req.body && req.method && ['GET', 'HEAD', 'DELETE'].indexOf(req.method.toUpperCase()) < 0) {
      const arr = [];
      for await (const chunk of req.body) {
        arr.push(chunk);
      }
      const buf = new Uint8Array(arr.reduce((acc, chunk) => acc + chunk.length, 0));
      let pos = 0;
      for (const chunk of arr) {
        buf.set(chunk, pos);
        pos += chunk.length;
      }
      body = buf;
    }
  }





}

/**
 * @param {any} obj
 * @param {string | number | Symbol} prop
 */
export function safeGetProp(obj, prop) {
  try {
    return obj[/** @type {*} */(prop)];
  } catch (errCheck) {
  }
}
