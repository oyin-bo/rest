// @ts-check

import { javascript, javascriptLanguage, scopeCompletionSource } from '@codemirror/lang-javascript';
import { EditorView } from 'codemirror';

import {
  keymap, highlightSpecialChars, drawSelection, highlightActiveLine, dropCursor,
  rectangularSelection, crosshairCursor,
  lineNumbers, highlightActiveLineGutter
} from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import {
  defaultHighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching,
  foldGutter, foldKeymap
} from "@codemirror/language"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search"
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete"
import { lintKeymap } from "@codemirror/lint"

export function cmSetup() {

  const setup = [
    // lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    // foldGutter(),
    EditorView.lineWrapping,
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap
    ]),

    javascript(),
    javascriptLanguage.data.of({
      autocomplete: scopeCompletionSource(globalThis)
    })
  ];

  return setup;
}