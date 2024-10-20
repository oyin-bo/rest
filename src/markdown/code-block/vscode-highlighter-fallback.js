// @ts-check

import vsctm from 'vscode-textmate';

export function vscodeHighlighter() {
  // Create a registry that can create a grammar from a scope name.
  const registry = new vsctm.Registry({});

  return highlightCode;

  function highlightCode(code, lang) {
  
  }

}