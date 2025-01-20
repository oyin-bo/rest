// @ts-check


/** @param {Date} dt */
export function serializeDate(dt) {
  const serialized = { ___kind: 'date', value: dt.getTime() };
  // TODO: adorn any extra own properties
  return serialized;
}

/** @param {{ ___kind: 'date', value: number }} dtObj */
export function deserializeDate(dtObj) {
  const deserialized = new Date(dtObj.value);
  // TODO: adorn any extra own properties
  return deserialized;
}
