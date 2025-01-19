// @ts-check

/**
 * @typedef {{
 *  ___kind: 'symbol',
 *  known: string,
 *  description: string | undefined
 * }} SerializedSymbol
 */

/**
 * @this {{
 *  knownSymbolsSingletonMap?: Map<Symbol, { ___kind: 'symbol', known: string, description: string | undefined }>,
 *  cachedSerializedSymbols?: Map<Symbol, { ___kind: 'symbol', known?: never, description: string | undefined }>
 * }}
 * @param {Symbol} sym
 */
export function serializeSymbol(sym) {
  if (!this.knownSymbolsSingletonMap) this.knownSymbolsSingletonMap = createKnownSymbolsSingletonMap();
  const knownSym = this.knownSymbolsSingletonMap.get(sym);
  if (knownSym) return knownSym;

  let cachedSym = this.cachedSerializedSymbols?.get(sym);
  if (!cachedSym) {
    if (!this.cachedSerializedSymbols) this.cachedSerializedSymbols = new Map();
    cachedSym = { ___kind: 'symbol', description: sym.description };
    this.cachedSerializedSymbols.set(sym, cachedSym);
  }

  return cachedSym;
}

/** @param {{ ___kind: 'symbol', known?: string, description?: string }} sym */
export function deserializeSymbol(sym) {
  if (!this.knownSymbolsSingletonMap) this.knownSymbolsSingletonMap = createKnownSymbolsSingletonMap();

  if (sym.known && typeof window[sym.known] === 'function' &&
    this.knownSymbolsSingletonMap.has(window[sym.known])) return window[sym.known];

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
