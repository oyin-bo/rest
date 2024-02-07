import { basicSetup, EditorView } from 'codemirror';
import { javascript, javascriptLanguage, scopeCompletionSource } from '@codemirror/lang-javascript';

initCodeMirror();

function initCodeMirror() {
  const existingTextarea = document.querySelector('textarea');
  const text = existingTextarea.value ||
    `function hello(who = "world") {
  console.log(\`Hello, \${who}!\`)
}`;
  const parent = existingTextarea.parentElement;
  existingTextarea.remove();

  const view = new EditorView({
    doc: text,
    extensions: [basicSetup, javascript(), javascriptLanguage.data.of({
      autocomplete: scopeCompletionSource(globalThis)
    })],
    parent
  });

  view.focus();
}