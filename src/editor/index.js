// @ts-check

import { EditorView } from 'codemirror';
import { cmSetup } from './cm-setup';

/**
 * @typedef {{
 *  verb: string,
 *  address(): string | undefined,
 *  bodyText(): string,
 *  wholeText(): string,
 *  selection(): { start: number, end: number, cursor: number },
 * }} EditorLogicalState
 */

/**
 * @param {{
 *  parent: HTMLTextAreaElement,
 *  verb: string,
 *  impliedVerb?: boolean,
*   address?: string,
 *  bodyText: string,
 *  onChange?: () => void,
 *  onSelectionChange?: () => void
 * }} options
 * @returns {EditorLogicalState}
 */
export function editor({
  parent,
  verb, impliedVerb,
  address, bodyText,
  onChange, onSelectionChange
}) {

  // VERB and ADDRESS should be decorations in the editor
  // - at each edit they should be updated

  // - if the editor switched from text into VERB+ADDRESS mode,
  // and VERB or ADDRESS is deleted, editor should stick within VERB+ADDRESS mode
  // (require user toggling back explicitly into text)

  const cmView = new EditorView({
    doc: initText(),
    extensions: [
      ...cmSetup(),
      EditorView.updateListener.of((v) => {
        onChange?.();
      })
    ],
    parent
  });

  return {
    verb,
    address: () => address,
    bodyText: () => cmView.state.doc.toString(),
  };

  function initText() {
    let text = bodyText || '';
    if (address || (!impliedVerb && verb)) {
      const headerLine =
        (!verb || impliedVerb ? '' : verb + ' ') +
        (address || '');
      text = headerLine + (text ? '\n' + text : '');
    }

    return text;
  }
}