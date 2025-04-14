// @ts-check

/**
 * @typedef {{
 *  ___kind: 'custom',
 *  constructor: string,
 *  props: [key: string, value: unknown][]
 * }} SerializedCustomObject
 */

/**
 * @this {{
 *  serialize: (obj: any) => any,
 *  serializePlainObject: (obj: any) => any,
 *  serializeFunction: (fn: Function, thisObj: any, methodKey: string) => import('./function').SerializedFunction
 * }}
 * @param {Object} obj
 */
export function serializeCustomObject(obj) {
  let ctorName;
  try { ctorName = obj.constructor?.name; } catch (errCtor) {
    return this.serializePlainObject(obj);
  }

  /** @type {SerializedCustomObject} */
  const serialized = {
    ___kind: 'custom',
    constructor: ctorName,
    props: /** @type {[key: string, value: unknown][]} */([])
  };

  try {
    for (const key in obj) {
      try {
        const value = obj[key];
        const serializedValue =
          typeof value === 'function' ? this.serializeFunction(value, obj, key) :
            this.serialize(value);
        serialized.props.push([key, serializedValue]);
      } catch (getterErr) {
        console.error('SERIALIZE: Error getting property value of ', obj, '[' + key + ']', getterErr);
      }
    }
  } catch (iterationErr) {
    console.error('SERIALIZE: Error iterating properties of ', obj, iterationErr);
  }
  // TODO: handle prototype chain
  return serialized;
}

/**
 * @this {{
 *  deserialize: (obj: any) => any;
 *  deserializePlainObject: (obj: any) => any;
 * }}
 * @param {SerializedCustomObject} obj
 */
export function deserializeCustomObject(obj) {
  try {
    const ctor =
      typeof obj.constructor === 'string' &&
        typeof window[obj.constructor] === 'function' ?
        window[obj.constructor] : undefined;
    if (ctor === AbortSignal) return undefined;

    const deserialized = ctor?.prototype ? Object.create(ctor.prototype) : {};

    for (const [key, value] of obj.props) {
      try {
        deserialized[key] = this.deserialize(value);
      } catch (error) {
        console.log('DESERIALIZE: Error setting property value of ', deserialized, '[' + key + ']', error);
      }
    }
    // TODO: handle prototype chain
    return deserialized;
  } catch (errCtor) {
    console.error('DESERIALIZE: Error creating object of ', obj, errCtor);
    return this.deserializePlainObject(obj);
  }
}
