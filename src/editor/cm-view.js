// @ts-check

import { EditorView } from 'codemirror';
import { EditorState } from '@codemirror/state';

import { cmExtensions } from './cm-extensions';

/**
 * @param {{
 *  initial?: {
 *    text?: string,
 *    selection?: { start: number, end: number, cursor: number }
 *  },
 *  host: HTMLElement,
 *  keymap: import('@codemirror/view').KeyBinding[],
 *  transactionFilter?: Parameters<typeof EditorState.transactionFilter.of>[0],
 *  updateListener?: Parameters<typeof EditorView.updateListener.of>[0]
 * }} _
 */
export function cmEditorView({
  initial,
  host,
  keymap,
  transactionFilter,
  updateListener
}) {

  let state = {
    text: initial?.text || '',
    selection: {
      start: typeof initial?.selection?.start === 'number' && initial?.selection?.start >= 0 ?
        initial.selection.start :
        0,
      end: typeof initial?.selection?.end === 'number' && initial?.selection?.end >= 0 ?
        initial.selection.end :
        0,
      cursor: typeof initial?.selection?.cursor === 'number' && initial?.selection?.cursor >= 0 ?
        initial.selection.cursor :
        0
    }
  };

  const extensions = cmExtensions({ keymap });
  if (transactionFilter) extensions.push(EditorState.transactionFilter.of(transactionFilter));
  if (updateListener) extensions.push(EditorView.updateListener.of(updateListener))

  const editorView = new EditorView({
    doc: state.text,
    extensions,
    parent: host,
  });

  return editorView;
}
