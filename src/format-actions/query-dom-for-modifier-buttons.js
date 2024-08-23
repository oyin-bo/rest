// @ts-check

export function queryDOMForModifierButtons() {
  const buttonsArray = /** @type {NodeListOf<HTMLButtonElement>} */(
    document.querySelectorAll('#toolbar button'));
  return Array.from(buttonsArray);
}