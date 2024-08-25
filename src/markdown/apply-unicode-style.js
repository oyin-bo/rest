// @ts-check

import { editorStateCtx } from '@milkdown/core';
import { Ctx } from '@milkdown/ctx'
import { getSelectionModifiersForDocument } from './get-selection-modifiers';
import { applyModifier } from '../unicode-styles/apply-modifier';
import { Fragment, Slice } from '@milkdown/prose/model';
import { ReplaceStep } from '@milkdown/prose/transform';
import { TextSelection } from '@milkdown/prose/state';

/**
 * @param {Ctx} ctx
 * @param {string} style
 */
export function applyUnicodeStyle(ctx, style) {
  const editorState = ctx.get(editorStateCtx);
  const selMods = getSelectionModifiersForDocument(editorState);

  let changeTransaction = editorState.tr;
  let anyChange = false;

  const removeModifier = selMods.modifiers.indexOf(style) >= 0;

  let leadIncrease = 0;
  let selectionIncrease = 0;

  for (const span of selMods.spans) {
    if (!span.parsed?.modifiers) continue;

    const leadToUpdate = (!span.lead || !span.affectLead ? '' : span.lead.slice(-span.affectLead));
    const trailToUpdate = (!span.trail || !span.affectTrail ? '' : span.trail.slice(0, span.affectTrail));

    const updatedLead = applyModifier(
      leadToUpdate,
      style,
      removeModifier);

    const textAndTrailToUpdate = span.text + trailToUpdate;

    const updatedTextAndTrail = applyModifier(
      textAndTrailToUpdate,
      style,
      removeModifier);

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

    if (placeSelectionStart !== placeSelectionEnd)
      changeTransaction.setSelection(
        new TextSelection(
          changeTransaction.doc.resolve(placeSelectionStart),
          changeTransaction.doc.resolve(placeSelectionEnd)
        ));

    return changeTransaction;
  }
}