// @ts-check

/**
 * @typedef {`function-${string}`} SerializedFunctionPrimitive
 */

/**
 * @param {{ sendCallMessage(msg: { key: SerializedFunctionPrimitive, args: any[] }): Promise<any>}} sender
 */
export function functionCache(sender) {

  /**
   * @typedef {{
   *  fn: WeakRef<Function>,
   *  thisObj: WeakRef<Object> | null
   * }} FunctionMemoSlot
  */
  
  /**
   * @typedef {{
   *  fn: Function,
   *  key: SerializedFunctionPrimitive
   * }} FunctionThisTypedSlot
   */

  /**
   * @type {Map<string, FunctionMemoSlot>}
   */
  const cache = new Map();

  const functionReferenceHoldSymbol = Symbol('function-reference-hold');

  return {
    serializeFunctionPrimitive,
    deserializeFunctionPrimitive,
    invokeFunctionPrimitive
  };

  /**
   * @param {Function} fn
   * @param {Object | null} thisObj
   * @param {string} methodKey
   */
  function serializeFunctionPrimitive(fn, thisObj, methodKey) {
    const globalAPI = thisObj === null;

    const methodParent = globalAPI ? fn : thisObj;

    /** @type {{ [methodKey: string]: FunctionThisTypedSlot | undefined } | undefined} */
    let byMethod = methodParent[functionReferenceHoldSymbol];
    let existingKeySlot = byMethod?.[methodKey];
    if (existingKeySlot) return existingKeySlot.key;

    const key = /** @type {SerializedFunctionPrimitive} */(
      'function-' + (fn.name ? fn.name + '-' : '') + cache.size
    );

    if (!byMethod) methodParent[functionReferenceHoldSymbol] = byMethod = {};
    byMethod[methodKey] = { fn, key };

    cache.set(
      key,
      {
        fn: new WeakRef(fn),
        thisObj: globalAPI ? null : new WeakRef(thisObj)
      });
    
    return key;
  }

  /**
   * @param {SerializedFunctionPrimitive} serialized
   */
  function deserializeFunctionPrimitive(serialized) {
    return (...args) => {
      return sender.sendCallMessage({ key: serialized, args });
    };
  }

  /**
   * @param {{
   *  key: SerializedFunctionPrimitive,
   * args: any[]
   * }} _
   */
  function invokeFunctionPrimitive({ key, args }) {
    const slot = cache.get(key);
    if (!slot) {
      console.warn('Function not found in cache ', { key, args });
      return;
    }

    const fn = slot.fn.deref();
    const thisObj =
      slot.thisObj ? slot.thisObj.deref() : globalThis;

    if (!thisObj || !fn) {
      console.warn('Target garbage collected ', { fn, thisObj, key, args });
      return;
    }

    if (thisObj === fn) thisObj === globalThis;

    const result = fn.apply(thisObj, args);
    return result;
  }
}