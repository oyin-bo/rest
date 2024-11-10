// @ts-check

export function remoteObjects() {

  /** @type {Map<any, any>} */
  var serializedGraph;

  /** @type {Map<any, any>} */
  var deserializedGraph;

  /** @type {Map<string, {resolve: (obj: any) => void, reject: (err: any) => void}>} */
  const callCache = new Map();

  const remote = {
    serialize,
    deserialize,
    receiveMessage,
    onSendMessage: (msg) => { }
  };

  return remote;

  /** @param {{ callKind: string, callKey: number, success: boolean, result: any }} msg */
  function receiveMessage(msg) {
    const key = msg.callKind + '\n' + msg.callKey;
    const callEntry = callCache.get(key);
    if (!callEntry) {
      console.warn('Unknown call message ', msg);
      return;
    }

    if (msg.success) callEntry.resolve(deserialize(msg.result));
    else callEntry.reject(msg.result);
  }

  /**
   * @param {string} callKind
   * @param {number} callKey
   * @param {unknown} args
   */
  function makeCall(callKind, callKey, args) {
    const result = new Promise((resolve, reject) => {
      callCache.set(callKind + '\n' + callKey, { resolve, reject });
    });

    remote.onSendMessage({ callKind, callKey, args });

    return result;
  }

  /** @param {unknown} obj */
  function serialize(obj) {
    switch (typeof obj) {
      case 'undefined':
      case 'string':
      case 'number':
      case 'boolean':
        return obj;

      case 'object':
        if (obj === null) return null;
        else break;

      case 'bigint':
        return { ___kind: 'bigint', value: obj.toString() };
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
    switch (typeof obj) {
      case 'object':
        if (obj === null) return null;
        if (Array.isArray(obj)) return serializeArray(obj);
        if (typeof obj[Symbol.iterator] === 'function') return serializeIterable(/** @type {Iterable} */(obj));
        if (typeof obj[Symbol.asyncIterator] === 'function') return serializeAsyncIterable(/** @type {AsyncIterable} */(obj));
        return serializeObject(obj);

      case 'bigint':
        return { ___kind: 'bigint', value: obj.toString() };

      case 'function':
        return serializeFunction(obj);

      case 'symbol':
        return serializeSymbol(obj);
    }
  }

  /** @param {any} obj */
  function deserializeCore(obj) {
    if (Array.isArray(obj)) return deserializeArray(obj);

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

      case 'custom':
        return deserializeCustomObject(obj);

      case 'symbol':
        return deserializeSymbol(obj);
    }
  }

  /** @param {Array} arr */
  function serializeArray(arr) {
    const serialized = [];
    serializedGraph.set(arr, serialized);
    for (let i = 0; i < arr.length; i++) {
      if (i in arr) serialized[i] = serialize(arr[i]);
    }
    // TODO: adorn any extra own properties
    return serialized;
  }

  /** @param {Array} arr */
  function deserializeArray(arr) {
    const deserialized = [];
    deserializedGraph.set(arr, deserialized);
    for (let i = 0; i < arr.length; i++) {
      if (i in arr) deserialized[i] = deserialize(arr[i]);
    }
    return deserialized;
  }

  /** @type {Map<Iterable, number> | undefined} */
  var iterableCallKeyCache;

  /** @param {Iterable} iter */
  function serializeIterable(iter) {
    if (!iterableCallKeyCache) iterableCallKeyCache = new Map();
    let callKey = iterableCallKeyCache.get(iter);
    if (!callKey) iterableCallKeyCache.set(iter, callKey = iterableCallKeyCache.size);

    const serialized = { ___kind: 'iterable', callKey };
    serializedGraph.set(iter, serialized);
    // TODO: iterate a few entries?
    return serialized;
  }

  /** @param {{ ___kind: 'iterable', callKey: number }} iter */
  function deserializeIterable(iter) {
    return generator();

    async function* generator() {
      while (true) {
        const next = await makeCall('iterable', iter.callKey, undefined);
        if (next.value) yield deserialize(next.value);
        if (next.done) return next.result;
      }
    }
  }

  /** @type {Map<AsyncIterable, number> | undefined} */
  var asyncIterableCallKeyCache;

  /** @param {AsyncIterable} iter */
  function serializeAsyncIterable(iter) {
    if (!asyncIterableCallKeyCache) asyncIterableCallKeyCache = new Map();
    let callKey = asyncIterableCallKeyCache.get(iter);
    if (!callKey) asyncIterableCallKeyCache.set(iter, callKey = asyncIterableCallKeyCache.size);
    const serialized = { ___kind: 'asyncIterable', callKey };
    serializedGraph.set(iter, serialized);
    // TODO: iterate a few entries?
    return serialized;
  }

  /** @param {{ ___kind: 'asyncIterable', callKey: number }} iter */
  function deserializeAsyncIterable(iter) {
    return generator();

    async function* generator() {
      while (true) {
        const next = await makeCall('asyncIterable', iter.callKey, undefined);
        if (next.value) yield deserialize(next.value);
        if (next.done) return next.result;
      }
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
    if (obj instanceof ArrayBuffer) return serializeThrough(obj);
    if (obj instanceof DataView) return serializeThrough(obj);
    if (obj instanceof Promise) return serializePromise(obj);

    if (Object.getPrototypeOf(obj) === Object.prototype) return serializePlainObject(obj);
    else return serializeCustomObject(obj);
  }

  /** @param {Date} dt */
  function serializeDate(dt) {
    const serialized = { ___kind: 'date', value: dt.getTime() };
    // TODO: adorn any extra own properties
    return serialized;
  }

  /** @param {{ ___kind: 'date', value: number }} dtObj */
  function deserializeDate(dtObj) {
    const deserialized = new Date(dtObj.value);
    // TODO: adorn any extra own properties
    return deserialized;
  }

  /** @param {RegExp} re */
  function serializeRegExp(re) {
    const serialized = { ___kind: 'regexp', source: re.source, flags: re.flags };
    // TODO: adorn any extra own properties
    return serialized;
  }

  /** @param {{ ___kind: 'regexp', source: string, flags: string }} reObj */
  function deserializeRegExp(reObj) {
    const deserialized = new RegExp(reObj.source, reObj.flags);
    // TODO: adorn any extra own properties
    return deserialized;
  }

  /** @param {URL} url */
  function serializeURL(url) {
    const serialized = { ___kind: 'url', href: url.href };
    // TODO: adorn any extra own properties
    return serialized;
  }

  /** @param {{ ___kind: 'url', href: string }} urlObj */
  function deserializeURL(urlObj) {
    const deserialized = new URL(urlObj.href);
    // TODO: adorn any extra own properties
    return deserialized;
  }

  /** @param {Error} err */
  function serializeError(err) {
    const serialized = { ___kind: 'error', name: err.name, message: err.message, stack: err.stack };
    // TODO: adorn any extra own properties
    return serialized;
  }

  /** @param {{ ___kind: 'error', name: string, message: string, stack: string }} errObj */
  function deserializeError(errObj) {
    const ctor = typeof errObj.name === 'string' &&
      errObj.name.endsWith('Error') &&
      typeof window[errObj.name] === 'function' ? window[errObj.name] : Error;

    const deserialized = new ctor(errObj.message);
    if (errObj.stack) deserialized.stack = errObj.stack;

    // TODO: adorn any extra own properties
    return deserialized;
  }

  /** @type {Map<Function, number> | undefined} */
  var functionCallKeyCache;

  /** @param {Function} fn */
  function serializeFunction(fn) {
    if (!functionCallKeyCache) functionCallKeyCache = new Map();
    let callKey = functionCallKeyCache.get(fn);
    if (!callKey) functionCallKeyCache.set(fn, callKey = functionCallKeyCache.size);

    const serialized = { ___kind: 'function', name: fn.name, source: fn.toString(), callKey };
    // TODO: adorn any extra own properties
    return serialized;
  }

  /** @param {{ ___kind: 'function', name: string, source: string, callKey: number }} fn */
  function deserializeFunction(fn) {
    const deserialized = callFunction;
    // @ts-ignore
    deserialized.name = fn.name;
    deserialized.toString = () => fn.source;
    return deserialized;

    function callFunction(...args) {
      return makeCall('function', fn.callKey, { args, 'this': this });
    }
  }

  /** @param {Map} map */
  function serializeMap(map) {
    const serialized = { ___kind: 'map', entries: /** @type {[key: unknown, value: unknown][]} */([]) };
    serializedGraph.set(map, serialized);
    for (const [key, value] of map) {
      serialized.entries.push([serialize(key), serialize(value)]);
    }
    // TODO: adorn any extra own properties
    return serialized;
  }

  /** @param {{ ___kind: 'map', entries: [key: unknown, value: unknown][]}} map */
  function deserializeMap(map) {
    const deserialized = new Map();
    deserializedGraph.set(map, deserialized);
    for (const [key, value] of map.entries) {
      deserialized.set(deserialize(key), deserialize(value));
    }
    return deserialized;
  }

  /** @param {Set} set */
  function serializeSet(set) {
    const serialized = { ___kind: 'set', values: /** @type {unknown[]} */([]) };
    serializedGraph.set(set, serialized);
    for (const value of set) {
      serialized.values.push(serialize(value));
    }
    // TODO: adorn any extra own properties
    return serialized;
  }

  /** @param {{ ___kind: 'set', values: unknown[] }} set */
  function deserializeSet(set) {
    const deserialized = new Set();
    deserializedGraph.set(set, deserialized);
    for (const value of set.values) {
      deserialized.add(deserialize(value));
    }
    return deserialized;
  }

  /** @param {ArrayBuffer | DataView} native */
  function serializeThrough(native) {
    const serialized = native;
    return serialized;
  }

  /** @type {Map<Promise, number> | undefined} */
  var promiseResolveKeyCache;

  /** @param {Promise} prom */
  function serializePromise(prom) {
    if (!promiseResolveKeyCache) promiseResolveKeyCache = new Map();
    let resolveKey = promiseResolveKeyCache.get(prom);
    if (!resolveKey) promiseResolveKeyCache.set(prom, resolveKey = promiseResolveKeyCache.size);

    const serialized = {
      ___kind: 'promise',
      resolveKey,
      success: /** @type {boolean | undefined}*/(undefined),
      result: undefined
    };
    serializedGraph.set(prom, serialized);
    prom.then(
      result => {
        serialized.success = true;
        serialized.result = serialize(result);
        makeCall('promise', resolveKey, { success: true, result });
      },
      error => {
        serialized.success = false;
        serialized.result = serialize(error);
        makeCall('promise', resolveKey, { success: false, result: error });
      });
    // TODO: adorn any extra own properties
    return serialized;
  }

  /** @param {{ ___kind: 'promise', resolveKey: number, success: boolean | undefined, result: any }} prom */
  function deserializePromise(prom) {
    let deserialized;
    if (prom.success === true) deserialized = Promise.resolve(deserialize(prom.result));
    else if (prom.success === false) deserialized = Promise.reject(deserialize(prom.result));
    else deserialized = new Promise((resolve, reject) => {
      callCache.set('promise\n' + prom.resolveKey, { resolve, reject });
    });
    return deserialized;
  }

  /** @param {Object} obj */
  function serializePlainObject(obj) {
    const serialized = {};
    serializedGraph.set(obj, serialized);
    for (const key in obj) {
      serialized[key] = serialize(obj[key]);
    }
    return serialized;
  }

  /** @param {Object} obj */
  function deserializePlainObject(obj) {
    const deserialized = {};
    deserializedGraph.set(obj, deserialized);
    for (const key in obj) {
      deserialized[key] = deserialize(obj[key]);
    }
    return deserialized;
  }

  /** @param {Object} obj */
  function serializeCustomObject(obj) {
    const serialized = { ___kind: 'custom', constructor: obj.constructor.name, props: /** @type {[key: string, value: unknown][]} */([]) };
    serializedGraph.set(obj, serialized);

    for (const key in obj) {
      serialized.props.push([key, serialize(obj[key])]);
    }
    // TODO: handle prototype chain
    return serialized;
  }

  /** @param {{ ___kind: 'custom', constructor: string, props: [key: string, value: unknown][] }} obj */
  function deserializeCustomObject(obj) {
    const ctor = typeof obj.constructor === 'string' && window[obj.constructor] ? window[obj.constructor] : Object;
    const deserialized = Object.create(ctor.prototype);
    deserializedGraph.set(obj, deserialized);

    for (const [key, value] of obj.props) {
      deserialized[key] = deserialize(value);
    }
    // TODO: handle prototype chain
    return deserialized;
  }

  /** @type {Map<Symbol, { ___kind: 'symbol', known: string, description: string | undefined }> | undefined} */
  var knownSymbolsSingletonMap;

  /** @type {Map<Symbol, { ___kind: 'symbol', known?: never, description: string | undefined }> | undefined} */
  var cachedSerializedSymbols;

  /** @param {Symbol} sym */
  function serializeSymbol(sym) {
    if (!knownSymbolsSingletonMap) knownSymbolsSingletonMap = createKnownSymbolsSingletonMap();
    const knownSym = knownSymbolsSingletonMap.get(sym);
    if (knownSym) return knownSym;

    let cachedSym = cachedSerializedSymbols?.get(sym);
    if (!cachedSym) {
      if (!cachedSerializedSymbols) cachedSerializedSymbols = new Map();
      cachedSym = { ___kind: 'symbol', description: sym.description };
      cachedSerializedSymbols.set(sym, cachedSym);
    }

    return cachedSym;
  }

  /** @param {{ ___kind: 'symbol', known?: string, description?: string }} sym */
  function deserializeSymbol(sym) {
    if (!knownSymbolsSingletonMap) knownSymbolsSingletonMap = createKnownSymbolsSingletonMap();

    if (sym.known && typeof window[sym.known] === 'function' &&
      knownSymbolsSingletonMap.has(window[sym.known])) return window[sym.known];

    const deserialized = Symbol(sym.description);
    // TODO: adorn any extra own properties
    return deserialized;
  }

  function createKnownSymbolsSingletonMap() {
    const map = new Map();
    for (const k in Symbol) {
      const sym = Symbol[k];
      if (typeof sym !== 'symbol') continue;
      map.set(sym, {
        ___kind: 'symbol',
        known: k,
        description: sym.description
      });
    }
    return map;
  }

}