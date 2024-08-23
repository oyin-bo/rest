// @ts-check

import { basicSetup, minimalSetup, EditorView } from 'codemirror';
import { build } from './build';
import { cmSetup } from './cm-setup';

if (typeof process !== 'undefined' && process && process.argv) build();
else initCodeMirror();

function initCodeMirror() {
  const existingTextarea = /** @type {HTMLTextAreaElement} */(document.querySelector('#content textarea'));
  const text = existingTextarea.value ||
    `function hello(who = "world") {
  console.log(\`Hello, \${who}!\`)
}`;
  const parent = /** @type {HTMLTextAreaElement} */(existingTextarea.parentElement);
  existingTextarea.remove();

  const view = new EditorView({
    doc: text,
    extensions: cmSetup(),
    parent
  });

  view.focus();
}