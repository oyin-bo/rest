// @ts-check

/**
 * @typedef {{
 *  ___kind: 'promise',
 *  then: import('./function-primitive').SerializedFunctionPrimitive,
 *  success?: boolean,
 *  value?: any,
 *  error?: any,
 *  check: import('./function-primitive').SerializedFunctionPrimitive
 * }} SerializedPromise
 */

/**
 * @this {{
 *  serializeFunctionPrimitive(fn: Function, thisObj: Object, methodKey: string): any,
 *  serialize: (obj: any) => any
 * }}
 * @param {Promise} prom
 */
export function serializePromise(prom) {
  const serialized = {
    ___kind: 'promise',
    then: this.serializeFunctionPrimitive(() => prom, prom, 'then'),
    current: undefined,
    check: this.serializeFunctionPrimitive(() => prom.then(
      (value) => ({ success: true, value }),
      (error) => ({ success: false, error })
    ), prom, 'check')
  };

  prom.then(
    (value) => {
      serialized.success = true;
      serialized.value = value;
    },
    (error) => {
      serialized.success = false;
      serialized.error = error;
    });

  return serialized;
}

/**
 * @this {{
 *  deserializeFunctionPrimitive: (fn: import('./function-primitive').SerializedFunctionPrimitive) => (() => Promise<any>)
 * }}
 * @param {SerializedPromise} serialized
 */
export function deserializePromise(serialized) {
  if (serialized.success === true)
    return Promise.resolve(serialized.value);
  else if (serialized.success === false)
    return Promise.reject(serialized.error);
  else return new Promise((resolve, reject) => {
    const prom = this.deserializeFunctionPrimitive(serialized.then)();
    prom.then(
      ({ success, value, error }) => {
        if (success) resolve(value);
        else reject(error);
      },
      (error) => reject(error)
    );
  });
}
