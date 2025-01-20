// @ts-check

import { isPromise } from 'util/types';
import { deserializeArray, serializeArray } from './array';
import { deserializeDate, serializeDate } from './date';
import { deserializeDOMNode, serializeDOMNode } from './dom-node';
import { deserializeError, serializeError } from './error';
import { deserializeFunction, serializeFunction } from './function';
import { functionCache } from './function-primitive';
import { deserializeIterable, serializeAsyncIterable, serializeIterable } from './iterable';
import { deserializeMap, serializeMap } from './map';
import { deserializeCustomObject, serializeCustomObject } from './object-custom';
import { deserializePlainObject, serializePlainObject } from './object-plain';
import { deserializePromise, serializePromise } from './promise';
import { deserializeReadableStreamExact, serializeReadableStreamExact } from './readable-stream-exact';
import { deserializeRegExp, serializeRegExp } from './regexp';
import { deserializeRequest, serializeRequest } from './request';
import { deserializeResponse, serializeResponse } from './response';
import { deserializeSet, serializeSet } from './set';
import { deserializeSymbol, serializeSymbol } from './symbol';
import { deserializeURL, serializeURL } from './url';
import { deserializeWindow, serializeWindow } from './window';

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
  deserializeFunctionPrimitive = this.functionCache.deserializeFunctionPrimitive;

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
        return serializeSymbol(/** @type {*} */(obj));
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
    if (Array.isArray(obj)) return this.deserializeArray(obj);

    if (obj && typeof obj === 'object' && ThroughTypes.some(Ty => obj instanceof Ty))
      return obj;

    switch (obj.___kind) {
      case undefined:
        return this.deserializePlainObject(obj);

      case 'bigint':
        return BigInt(obj.value);

      case 'iterable':
        return this.deserializeIterable(obj);

      case 'asyncIterable':
        return this.deserializeIterable(obj);

      case 'date':
        return deserializeDate(obj);

      case 'regexp':
        return deserializeRegExp(obj);

      case 'url':
        return deserializeURL(obj);

      case 'error':
        return deserializeError(obj);

      case 'function':
        return this.deserializeFunction(obj);

      case 'map':
        return this.deserializeMap(obj);

      case 'set':
        return this.deserializeSet(obj);

      case 'promise':
        return this.deserializePromise(obj);

      case 'Window':
        return deserializeWindow();

      case 'custom':
        return this.deserializeCustomObject(obj);

      case 'symbol':
        return deserializeSymbol(obj);

      case 'DOMNode':
        return this.deserializeDOMNode(obj);

      case 'Node':
        return this.deserializeDOMNode(obj);

      default:
        return this.deserializePlainObject(obj);
    }
  }

  serializeArray = serializeArray;
  deserializeArray = deserializeArray;
  serializeFunction = serializeFunction;
  deserializeFunction = deserializeFunction;
  serializeIterable = serializeIterable;
  deserializeIterable = deserializeIterable;
  serializeAsyncIterable = serializeAsyncIterable;
  serializePromise = serializePromise;
  deserializePromise = deserializePromise;
  serializeMap = serializeMap;
  deserializeMap = deserializeMap;
  serializeSet = serializeSet;
  deserializeSet = deserializeSet;
  serializeDOMNode = serializeDOMNode;
  deserializeDOMNode = deserializeDOMNode;
  serializeReadableStreamExact = serializeReadableStreamExact;
  deserializeReadableStreamExact = deserializeReadableStreamExact;
  serializeResponse = serializeResponse;
  deserializeResponse = deserializeResponse;
  serializeRequest = serializeRequest;
  deserializeRequest = deserializeRequest;
  serializePlainObject = serializePlainObject;
  deserializePlainObject = deserializePlainObject;
  serializeCustomObject = serializeCustomObject;
  deserializeCustomObject = deserializeCustomObject;
  serializeWindow = serializeWindow;
  deserializeWindow = deserializeWindow;
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
