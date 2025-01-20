// @ts-check

import { isPromise } from 'util/types';
import { serializeArray } from './array';
import { serializeDate } from './date';
import { serializeDOMNode } from './dom-node';
import { serializeError } from './error';
import { serializeFunction } from './function';
import { functionCache } from './function-primitive';
import { serializeAsyncIterable, serializeIterable } from './iterable';
import { serializeMap } from './map';
import { serializeCustomObject } from './object-custom';
import { serializePlainObject } from './object-plain';
import { serializePromise } from './promise';
import { serializeReadableStreamExact } from './readable-stream-exact';
import { serializeRegExp } from './regexp';
import { serializeRequest } from './request';
import { serializeResponse } from './response';
import { serializeSet } from './set';
import { deserializeSymbol, serializeSymbol } from './symbol';
import { serializeURL } from './url';
import { serializeWindow } from './window';

const ThroughTypes = [
  ArrayBuffer,
  DataView,
  Uint8Array, Uint8ClampedArray, Uint16Array, Uint32Array,
  Int8Array, Int16Array, Int32Array
];

export class SerializationContext {

  /** @type {Map<Object, Object> | undefined} */
  serializeClosure;

  functionCache = functionCache(this);

  serializeFunctionPrimitive = this.functionCache.serializeFunctionPrimitive;

  /** @param {{ key: import('./function-primitive').SerializedFunctionPrimitive, args: any[] }} msg */
  async sendCallMessage(msg) {
    throw new Error('Not implemented');
  }

  /**
   * @template [T = void]
   * @param {() => T} callback
   * @returns {T}
   */
  withClosure(callback) {
    if (this.serializeClosure) return callback();

    this.serializeClosure = new Map();
    let cleanupAfter = true;
    try {
      let result = callback();
      if (isPromise(result)) {
        cleanupAfter = false;
        return /** @type {*} */(result.finally(
          () => {
            this.serializeClosure = undefined;
          }));
      } else {
        return result;
      }
    } finally {
      if (cleanupAfter)
        this.serializeClosure = undefined;
    }
  }

  serialize(obj) {
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

    return this.serializeComplex(obj);
  }

  serializeComplex(obj) {
    if (this.serializeClosure) {
      const serialized = this.serializeClosure.get(obj);
      if (serialized) return serialized;

      return this.serializeCore(obj);
    } else {
      this.serializeClosure = new Map();
      try {
        const serialized = this.serializeCore(obj);
        this.serializeClosure.set(obj, serialized);
      } finally {
        this.serializeClosure = undefined;
      }
    }
  }

  /**
   * @param {Object} obj
   * @this {SerializationContext}
   */
  serializeCore(obj) {
    let type = typeof obj;

    switch (type) {
      case 'object':
        if (obj === null) return null;
        if (Array.isArray(obj)) return this.serializeArray(obj);
        if (typeof safeGetProp(obj, Symbol.iterator) === 'function') return this.serializeIterable(/** @type {Iterable} */(obj));
        if (typeof safeGetProp(obj, Symbol.asyncIterator) === 'function') return this.serializeAsyncIterable(/** @type {AsyncIterable} */(obj));
        if (typeof safeGetProp(obj, 'then') === 'function') return this.serializePromise(/** @type {Promise} */(obj));
        return this.serializeObject(obj);
    
      case 'function':
        return this.serializeFunction(/** @type {*} */(obj), obj, '');
    
      case 'symbol':
        return this.serializeSymbol(/** @type {*} */(obj));
    }
  }

  /** @param {Object} obj */
  serializeObject(obj) {
    if (obj instanceof Date) return serializeDate(obj);
    if (obj instanceof RegExp) return serializeRegExp(obj);
    if (obj instanceof URL) return serializeURL(obj);
    if (obj instanceof Error) return serializeError(obj);
    if (obj instanceof Map) return this.serializeMap(obj);
    if (obj instanceof Set) return this.serializeSet(obj);
    // if (obj instanceof WeakMap) return serializeWeakMap(obj);
    // if (obj instanceof WeakSet) return serializeWeakSet(obj);

    if (ThroughTypes.some(Ty => obj instanceof Ty)) return obj;
    if (obj instanceof Window) return serializeWindow(obj);

    //if (obj instanceof Element) return serializeElement(obj);
    if (obj instanceof Node) return this.serializeDOMNode(/** @type {Partial<Element> & Node} */(obj));

    if (obj instanceof Response) return this.serializeResponse(obj);
    if (obj instanceof Request) return this.serializeRequest(obj);

    if (Object.getPrototypeOf(obj) === Object.prototype) return this.serializePlainObject(obj);
    else return this.serializeCustomObject(obj);
  }

  deserialize(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    return this.deserializeComplex(obj);
  }

  /** @param {Object} obj */
  deserializeComplex(obj) {
    if (this.serializeClosure) {
      const deserialized = this.serializeClosure.get(obj);
      if (deserialized) return deserialized;
      else return this.deserializeCore(obj);
    } else {
      this.serializeClosure = new Map();
      try {
        return this.deserializeCore(obj);
      } finally {
        // @ts-ignore
        this.serializeClosure = undefined;
      }
    }
  }

  /** @param {Object} obj */
  deserializeCore(obj) {
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

  serializeSymbol = serializeSymbol;
  deserializeSymbol = deserializeSymbol;
  serializeArray = serializeArray;
  serializeFunction = serializeFunction;
  serializeIterable = serializeIterable;
  serializeAsyncIterable = serializeAsyncIterable;
  serializePromise = serializePromise;
  serializeMap = serializeMap;
  serializeSet = serializeSet;
  serializeDOMNode = serializeDOMNode;
  serializeReadableStreamExact = serializeReadableStreamExact;
  serializeResponse = serializeResponse;
  serializeRequest = serializeRequest;
  serializePlainObject = serializePlainObject;
  serializeCustomObject = serializeCustomObject;
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
