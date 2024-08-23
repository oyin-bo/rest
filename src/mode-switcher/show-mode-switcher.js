// @ts-check

import { runMarkdown } from "../markdown";

/**
 * 
 * @param {import('codemirror').EditorView} editor 
 */
export function showModeSwitcher(editor) {
  const uniedit = document.getElementById('uniedit');
  uniedit.style.opacity = '0.6';
  uniedit.style.filter = 'blur(3px)';
  uniedit.style.pointerEvents = 'none';

  const modeSwitcherBg = document.createElement('div');
  modeSwitcherBg.style.cssText = `
  opacity: 0;
  transition: opacity 200ms;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.25);
  z-index: 9999;
  display: grid;
  grid-template-rows: 1fr;
  grid-template-columns: 1fr;
  justify-items: center;
  align-items: center;
  `;
  document.body.appendChild(modeSwitcherBg);

  const modeSwitcherDlg = document.createElement('div');
  modeSwitcherDlg.style.cssText = `
  position: absolute;
  background-color: white;
  border: solid 1px gray;
  padding: 1em;
  border-radius: 0.2em;
  box-shadow: #00000045 2px 4px 6px;
  `;
  modeSwitcherDlg.innerHTML = `
  <h1>Mode</h1>
  <button id="plain-text-mode">Text</button> <br>
  <button id="markdown-mode">Format</button> <br>
  <button id="files-mode">Files</button>
  `;
  modeSwitcherBg.appendChild(modeSwitcherDlg);

  setTimeout(() => {
    modeSwitcherBg.style.opacity = 1;
  }, 1);

  modeSwitcherBg.addEventListener('click', () => {
    hideSwitcher();
  });

  const plainTextModeButton = document.getElementById('plain-text-mode');
  const markdownModeButton = document.getElementById('markdown-mode');
  const filesModeButton = document.getElementById('files-mode');
  plainTextModeButton.addEventListener('click', () => {
    hideSwitcher();
  });
  markdownModeButton.addEventListener('click', () => {
    switchToMarkdown(editor?.state?.doc?.toString());
  });
  filesModeButton.addEventListener('click', () => {
    alert('File mode not yet implemented.');
  });

  /**
   * @param {string} [text] 
   */
  function switchToMarkdown(text) {
    uniedit.style.opacity = '0';
    uniedit.style.filter = '';
    uniedit.style.pointerEvents = '';
    modeSwitcherBg.remove();

    const markdownHost = document.createElement('div');
    markdownHost.style.cssText = `
      position: fixed;
      left: 0; top: 0;
      width: 100%; height: 100%;
      overflow: auto;
      padding: 1em;
    `;
    document.body.appendChild(markdownHost);

    setTimeout(() => {
      uniedit.style.display = 'none';
    }, 300);

    setTimeout(() => {
      runMarkdown(markdownHost, text);
    }, 1);
  }

  function hideSwitcher() {
    uniedit.style.opacity = '';
    uniedit.style.filter = '';
    uniedit.style.pointerEvents = '';
    modeSwitcherBg.remove();
  }
}