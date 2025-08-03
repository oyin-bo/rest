// @ts-check

/**
 * @this {{
 *  serialize: (obj: any) => any,
 *  serializeFunction: (fn: Function, thisObj: any, methodKey: string) => import('./function').SerializedFunction,
 *  serializeClosure?: Map<any, any>
 * }}
 * @param {Object} obj
 */
export function serializePlainObject(obj) {
  const serialized = {};
  this.serializeClosure?.set(obj, serialized);
  for (const key in obj) {
    try {
      const value = obj[key];
      const serializedValue =
        typeof value === 'function' ? this.serializeFunction(value, obj, key) :
          this.serialize(value);
      serialized[key] = serializedValue;
    } catch (getterErr) {
      console.error('Error iterating properties of ', obj, getterErr);
    }
  }
  return serialized;
}

/**
 * @this {{
 *  deserialize: (obj: any) => any;
 * }}
 * @param {Object} obj
 */
export function deserializePlainObject(obj) {
  const deserialized = {};
  for (const key in obj) {
    deserialized[key] = this.deserialize(obj[key]);
  }
  return deserialized;
}
