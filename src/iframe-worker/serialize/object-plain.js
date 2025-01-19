// @ts-check

/**
 * @this {{
 *  serialize: (obj: any) => any;
 * }}
 * @param {Object} obj
 */
export function serializePlainObject(obj) {
  const serialized = {};
  for (const key in obj) {
    try {
      serialized[key] = this.serialize(obj[key]);
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
