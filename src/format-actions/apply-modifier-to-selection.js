// @ts-check

import { applyModifier } from '../unicode-styles/apply-modifier';

/**
 * @param {import('codemirror').EditorView} cmView
 * @param {string} modifier
 * @param {boolean} [remove]
 */
export function applyModifierToSelection(cmView, modifier, remove) {
  let { from, to } = cmView.state.selection.main;
  let selection = cmView.state.sliceDoc(from, to);
  let expandedToWord = false;

  let hintLead = 0;
  if (!selection) {
    // expand selection
    let leadText = cmView.state.sliceDoc(0, from);
    let trailText = cmView.state.sliceDoc(to);

    let lastWordMatch = /[^\s\r\n]*$/i.exec(leadText);
    let lastWordIndex = lastWordMatch ? lastWordMatch.index : 0;
    let leadForWord = leadText.slice(lastWordIndex);
    if (leadForWord.length && leadForWord.length < 100) {
      selection = leadForWord;
      from -= leadForWord.length;
      hintLead = leadForWord.length;
      leadText = leadText.slice(0, lastWordIndex);
      expandedToWord = true;
    }

    var firstWordMatch = /^[^\s\r\n]*/i.exec(trailText);
    var trailForWord = firstWordMatch ? firstWordMatch[0] : '';
    if (trailForWord.length && trailForWord.length < 100) {
      selection += trailForWord;
      to += trailForWord.length;
      trailText = trailText.slice(trailForWord.length);
      expandedToWord = true;
    }
  }

  if (!selection) return false;

  const modifiedSelection = applyModifier(selection, modifier, remove);
  if (modifiedSelection === selection) return;

  const maintainCursor = !hintLead ? 0 :
    from + applyModifier(selection.slice(0, hintLead), modifier, remove).length;
  cmView.dispatch(
    {
      changes: { from, to, insert: modifiedSelection },
      selection: !maintainCursor ? undefined : {
        anchor: maintainCursor,
        head: maintainCursor
      }
    }
  );

  return true;
}
