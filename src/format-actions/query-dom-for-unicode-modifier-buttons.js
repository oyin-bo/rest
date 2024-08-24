// @ts-check

export function queryDOMForUnicodeModifierButtons() {
  const buttonsArray = /** @type {NodeListOf<HTMLButtonElement>} */(
    document.querySelectorAll('#toolbar #unicode_tools button'));
  return Array.from(buttonsArray);
}