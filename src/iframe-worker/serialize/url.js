// @ts-check

/** @param {URL} url */
export function serializeURL(url) {
  const serialized = { ___kind: 'url', href: url.href };
  // TODO: adorn any extra own properties
  return serialized;
}

/** @param {{ ___kind: 'url', href: string }} urlObj */
export function deserializeURL(urlObj) {
  const deserialized = new URL(urlObj.href);
  // TODO: adorn any extra own properties
  return deserialized;
}
