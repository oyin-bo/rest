// @ts-check

import { EditorState, Transaction } from '@milkdown/prose/state';
import { getSelectionModifiersForDocument } from './get-selection-modifiers';
import { applyUnicodeModifiers } from './apply-unicode-modifiers';

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

    if (tr.getMeta('history$')) return;
    if (tr.getMeta('unicode-modifiers')) return;

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

  const oldSelMod = getSelectionModifiersForDocument(oldState);

  const oldModifiers = oldSelMod.modifiers;

  const adjustTransaction = applyUnicodeModifiers(
    newState,
    () => {
      return { add: oldModifiers };
    }
  );

  if (adjustTransaction) return adjustTransaction;
}
