// @ts-check

/**
 * @typedef {{
 *  ___kind: 'promise',
 *  then: () => Promise<any>,
 *  success?: boolean,
 *  value?: any,
 *  error?: any,
 *  check: () => Promise<undefined | { success: true, value: any } | { success: false, error: any }>
 * }} SerializedPromise
 */

/**
 * @this {{
 *  serializeFunctionPrimitive(fn: Function): any,
 *  serialize: (obj: any) => any
 * }}
 * @param {Promise} prom
 */
export function serializePromise(prom) {
  const serialized = {
    ___kind: 'promise',
    then: this.serializeFunctionPrimitive(() => prom),
    current: undefined,
    check: this.serializeFunctionPrimitive(() => prom.then(
      (value) => ({ success: true, value }),
      (error) => ({ success: false, error })
    ))
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
