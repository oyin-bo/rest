// @ts-check

import { initCodeMirror } from './editor';
import { version } from '../package.json';
import { showModeSwitcher } from './mode-switcher';

/** @type {import('codemirror').EditorView & { residualModifiers?: string } } */
export var cmView;

if (typeof window !== 'undefined' && typeof window?.alert === 'function') {
  const versionDIV = document.getElementById('version');
  if (versionDIV) versionDIV.textContent = 'v' + version;
  initCodeMirror();

  const moreModes = document.getElementById('moreModes');
  if (moreModes) {
    moreModes.addEventListener('click', () => {
      showModeSwitcher();
    });
  }
}
