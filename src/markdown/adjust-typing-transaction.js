// @ts-check

import { EditorState, Transaction } from '@milkdown/prose/state';
import { getModifiersTextSection } from '../unicode-styles/get-modifiers-text-selection';
import { applyModifier } from '../unicode-styles/apply-modifier';

/**
 * @param {readonly Transaction[]} transactions
 * @param {EditorState} oldState 
 * @param {EditorState} newState 
 */
export function adjustTypingTransaction(transactions, oldState, newState) {
  /** @type {undefined | { oldStart: number, oldEnd: number, newStart: number, newEnd: number }} */
  let single;
  let multiple;
  for (const tr of transactions) {
    if (!tr.docChanged) continue;
    if (tr.getMeta('history$')) continue;

    if (tr.steps.length !== 1) continue;
    const step = tr.steps[0];
    const stepMap = step.getMap();

    stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
      if (multiple) return;
      if (single) {
        single = undefined;
        multiple = true;
      } else {
        single = { oldStart, oldEnd, newStart, newEnd };
      }
    });
    if (multiple) break;

    if (single?.newStart === single?.newEnd) {
      single = undefined;
    }
  }

  if (!single) return null;

  const textOld = oldState.doc.textContent;
  const oldParsed = getModifiersTextSection(
    textOld,
    single.oldStart - 1,
    single.oldEnd - 1);
  const oldFullModifiers = oldParsed?.parsed?.fullModifiers;

  const textNew = newState.doc.textContent;
  const newParsed = getModifiersTextSection(
    textNew,
    single.newStart - 1,
    single.newEnd - 1
  );

  if (newParsed?.text && !newParsed?.parsed?.fullModifiers && oldFullModifiers) {
    const autoFormatText = applyModifier(newParsed.text, oldFullModifiers);
    if (autoFormatText === newParsed.text) return null;

    console.log(
      'typing inside formatted area, should auto-format  ',
      newParsed.text.trim() !== newParsed.text ? newParsed.text : JSON.stringify(newParsed.text),
      ' to ',
      autoFormatText.trim() !== autoFormatText ? autoFormatText : JSON.stringify(autoFormatText),
      [single.newStart, single.newEnd]
    );

    const applyNextTransaction = newState.tr.replaceRangeWith(
      single.newStart,
      single.newEnd,
      newState.schema.text(autoFormatText));

    //return applyNextTransaction;
  }

}