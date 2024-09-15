// @ts-check

import { Fragment, Slice } from '@milkdown/prose/model';
import { EditorState, Selection, TextSelection } from '@milkdown/prose/state';
import { applyModifier } from '../../unicode-formatting/apply-modifier';
import { getSelectionModifiersForDocument } from './get-selection-modifiers';

/**
 * @param {EditorState} editorState
 * @param {string | ((modifiers: string[]) => { add?: string[], remove?: string[] })} modifiers
 * @param {Pick<Selection, 'from' | 'to'>} [selection]
 */
export function applyUnicodeModifiers(editorState, modifiers, selection) {
  const selMods = getSelectionModifiersForDocument(editorState, selection);

  let addModifiers;
  let removeModifiers;
  if (typeof modifiers === 'string') {
    if (selMods.modifiers.indexOf(modifiers) >= 0) removeModifiers = [modifiers];
    else addModifiers = [modifiers];
  } else {
    const mods = modifiers(selMods.modifiers);
    addModifiers = mods.add;
    removeModifiers = mods.remove;
  }

  let changeTransaction = editorState.tr;
  let anyChange = false;

  let leadIncrease = 0;
  let selectionIncrease = 0;

  for (const span of selMods.spans) {
    if (!span.parsed?.modifiers) continue;

    const leadToUpdate = (!span.lead || !span.affectLead ? '' : span.lead.slice(-span.affectLead));
    const trailToUpdate = (!span.trail || !span.affectTrail ? '' : span.trail.slice(0, span.affectTrail));

    let updatedLead = leadToUpdate;
    if (addModifiers) {
      for (let add of addModifiers) {
        updatedLead = applyModifier(leadToUpdate, add);
      }
    }
    if (removeModifiers) {
      for (let remove of removeModifiers) {
        updatedLead = applyModifier(leadToUpdate, remove, true);
      }
    }

    const textAndTrailToUpdate = span.text + trailToUpdate;

    let updatedTextAndTrail = textAndTrailToUpdate;
    if (addModifiers) {
      for (let add of addModifiers) {
        updatedTextAndTrail = applyModifier(textAndTrailToUpdate, add);
      }
    }
    if (removeModifiers) {
      for (let remove of removeModifiers) {
        updatedTextAndTrail = applyModifier(textAndTrailToUpdate, remove, true);
      }
    }

    if (leadToUpdate === updatedLead && updatedTextAndTrail === textAndTrailToUpdate) continue;

    const wholeUpdatedText =
      (!span.lead ? '' : span.lead.slice(0, span.lead.length - (span.affectLead || 0))) +
      updatedLead +
      updatedTextAndTrail +
      (!span.trail ? '' : span.trail.slice(span.affectTrail || 0));

    leadIncrease += updatedLead.length - leadToUpdate.length;
    selectionIncrease += updatedTextAndTrail.length - textAndTrailToUpdate.length;

    // changeTransaction = changeTransaction.step(
    //   new ReplaceStep()
    // )

    changeTransaction.replace(
      changeTransaction.mapping.map(span.nodePos),
      changeTransaction.mapping.map(span.nodePos + span.node.nodeSize),
      new Slice(
        Fragment.from(editorState.schema.text(wholeUpdatedText, span.node.marks)),
        0,
        0));
    anyChange = true;
  }

  if (anyChange) {
    const placeSelectionStart = editorState.selection.from + leadIncrease;
    const placeSelectionEnd = editorState.selection.to + leadIncrease +
      (editorState.selection.to === editorState.selection.from ? 0 : selectionIncrease);

    changeTransaction.setSelection(
      new TextSelection(
        changeTransaction.doc.resolve(placeSelectionStart),
        changeTransaction.doc.resolve(placeSelectionEnd)
      ));
    
    changeTransaction.setMeta('unicode-modifiers', true);

    return changeTransaction;
  }
}