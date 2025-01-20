// @ts-check

/** @param {RegExp} re */
export function serializeRegExp(re) {
  const serialized = { ___kind: 'regexp', source: re.source, flags: re.flags };
  // TODO: adorn any extra own properties
  return serialized;
}

/** @param {{ ___kind: 'regexp', source: string, flags: string }} reObj */
export function deserializeRegExp(reObj) {
  const deserialized = new RegExp(reObj.source, reObj.flags);
  // TODO: adorn any extra own properties
  return deserialized;
}
