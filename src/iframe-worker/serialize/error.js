// @ts-check

/** @param {Error} err */
export function serializeError(err) {
  const serialized = { ___kind: 'error', name: err.name, message: err.message, stack: err.stack };
  // TODO: adorn any extra own properties

  return serialized;
}

/** @param {{ ___kind: 'error', name: string, message: string, stack: string }} errObj */
export function deserializeError(errObj) {
  const ctor = typeof errObj.name === 'string' &&
    errObj.name.endsWith('Error') &&
    typeof window[errObj.name] === 'function' ? window[errObj.name] : Error;

  const deserialized = new ctor(errObj.message);
  if (errObj.stack) deserialized.stack = errObj.stack;

  // TODO: adorn any extra own properties
  return deserialized;
}