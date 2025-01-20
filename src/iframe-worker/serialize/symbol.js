// @ts-check

/**
 * @typedef {{
 *  ___kind: 'symbol',
 *  known: string,
 *  description: string | undefined
 * }} SerializedSymbol
 */

/**
 * @type {Map<Symbol, { ___kind: 'symbol', known: string, description: string | undefined }>}
 */
var knownSymbolsSingletonMap;

/**
 * @type {Map<Symbol, { ___kind: 'symbol', known?: never, description: string | undefined }>}
 */
var cachedSerializedSymbols;

/**
 * @param {Symbol} sym
 */
export function serializeSymbol(sym) {
  if (!knownSymbolsSingletonMap) knownSymbolsSingletonMap = createKnownSymbolsSingletonMap();
  const knownSym = knownSymbolsSingletonMap.get(sym);
  if (knownSym) return knownSym;

  let cachedSym = cachedSerializedSymbols?.get(sym);
  if (!cachedSym) {
    if (!cachedSerializedSymbols) cachedSerializedSymbols = new Map();
    cachedSym = { ___kind: 'symbol', description: sym.description };
    cachedSerializedSymbols.set(sym, cachedSym);
  }

  return cachedSym;
}

/** @param {{ ___kind: 'symbol', known?: string, description?: string }} sym */
export function deserializeSymbol(sym) {
  if (!knownSymbolsSingletonMap) knownSymbolsSingletonMap = createKnownSymbolsSingletonMap();

  if (sym.known && typeof window[sym.known] === 'function' &&
    knownSymbolsSingletonMap.has(window[sym.known])) return window[sym.known];

  const deserialized = Symbol(sym.description);
  // TODO: adorn any extra own properties
  return deserialized;
}

function createKnownSymbolsSingletonMap() {
  const map = new Map();
  for (const k in Symbol) {
    const sym = Symbol[k];
    if (typeof sym !== 'symbol') continue;
    map.set(sym, {
      ___kind: 'symbol',
      known: k,
      description: sym.description
    });
  }
  return map;
}
