// @ts-check

import { runMarkdown } from "../markdown";

/**
 * 
 * @param {import('codemirror').EditorView} editor 
 */
export function showModeSwitcher(editor) {
  const { main, unitools, contentArea, unicontent } = getHostSlots();

  main.style.opacity = '0.6';
  main.style.filter = 'blur(3px)';
  main.style.pointerEvents = 'none';

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
  <h1 style="margin-top: 0">Mode</h1>
  <button id="plain-text-mode">Text</button> <br>
  <button id="markdown-mode">Format</button> <br>
  <button id="files-mode">Files</button>
  `;
  modeSwitcherBg.appendChild(modeSwitcherDlg);

  setTimeout(() => {
    modeSwitcherBg.style.opacity = '1';
  }, 1);

  modeSwitcherBg.addEventListener('click', () => {
    hideSwitcher();
  });

  const [plainTextModeButton, markdownModeButton, filesModeButton] =
    ['plain-text-mode', 'markdown-mode', 'files-mode'].map(id => /** @type {HTMLElement} */(document.getElementById(id)));

  modeSwitcherDlg.addEventListener('click', evt => {
    evt.stopPropagation?.();
  });
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
    const editorElement = unicontent;

    const markdownHost = document.createElement('div');
    markdownHost.style.cssText = `
      position: fixed;
      left: 0; top: 0;
      width: 100%; height: 100%;
      overflow: auto;
      padding: 1em;
    `;
    contentArea.appendChild(markdownHost);

    editorElement.style.display = 'none';
    unitools.style.display = 'none';

    hideSwitcher();

    setTimeout(() => {
      runMarkdown(markdownHost, text);
    }, 1);
  }

  function hideSwitcher() {
    main.style.opacity = '';
    main.style.filter = '';
    main.style.pointerEvents = '';
    modeSwitcherBg.remove();
  }
}

export function getHostSlots() {
  const main = /** @type {HTMLElement} */(document.getElementById('main'));
  const toolbar = /** @type {HTMLElement} */(document.getElementById('toolbar'));
  const unitools = /** @type {HTMLElement} */(document.getElementById('unitools'));
  const contentArea = /** @type {HTMLElement} */(document.getElementById('content'));
  const unicontent = /** @type {HTMLElement} */(document.getElementById('unicontent'));
  const textarea = /** @type {HTMLTextAreaElement | undefined} */(document.getElementById('textarea'));

  return {
    main,
    toolbar,
    unitools,
    contentArea,
    unicontent,
    textarea
  };
}