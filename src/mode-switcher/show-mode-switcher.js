// @ts-check

import { runMarkdown } from "../markdown";

/**
 * 
 * @param {import('codemirror').EditorView} editor 
 */
export function showModeSwitcher(editor) {
  const { main, text_tools: unitools, contentArea, text_content: unicontent } = getHostSlots();

  main.style.opacity = '0.6';
  main.style.filter = 'blur(3px)';
  main.style.pointerEvents = 'none';

  const modeSwitcherBg = document.createElement('div');
  modeSwitcherBg.style.cssText = `
  opacity: 0;
  transition: opacity 400ms;
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
  opacity: 0;
  pointer-events: none;
  `;
  modeSwitcherDlg.innerHTML = `
  <h1 style="margin-top: 0">Mode</h1>
  <button id="plain-text-mode">Text</button> <br>
  <button id="markdown-mode">Format</button> <br>
  <button id="rest-mode">Rest</button> <br>
  <button id="files-mode">Files</button>
  `;
  modeSwitcherBg.appendChild(modeSwitcherDlg);

  setTimeout(() => {
    modeSwitcherBg.style.opacity = '1';

    const bounds = modeSwitcherDlg.getBoundingClientRect();
    const centreBounds = { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 };
    const moreModes = /** @type {HTMLElement} */(document.getElementById('moreModes'));
    const moreModesBounds = moreModes.getBoundingClientRect();
    const centreMoreModes = { x: (moreModesBounds.left + moreModesBounds.right) / 2, y: (moreModesBounds.top + moreModesBounds.bottom) / 2 };

    modeSwitcherDlg.style.transform =
      `translate(${centreMoreModes.x - centreBounds.x}px, ${centreMoreModes.y - centreBounds.y}px) ` +
      `scale(${moreModesBounds.width / bounds.width}, ${moreModesBounds.height / bounds.height})`;
    modeSwitcherDlg.style.pointerEvents = '';
    modeSwitcherDlg.style.opacity = '0.2';

    setTimeout(() => {
      modeSwitcherDlg.style.transition = 'transform 300ms, scale 300ms, opacity 400ms';
      setTimeout(() => {
        modeSwitcherDlg.style.transform = 'translate(0, 0) scale(1, 1)';
        modeSwitcherDlg.style.opacity = '1';
      }, 10);
    }, 10);
  }, 10);

  modeSwitcherBg.addEventListener('click', () => {
    hideSwitcher();
  });

  const [plainTextModeButton, markdownModeButton, restMode, filesModeButton] =
    ['plain-text-mode', 'markdown-mode', 'rest-mode', 'files-mode'].map(id => /** @type {HTMLElement} */(document.getElementById(id)));

  modeSwitcherDlg.addEventListener('click', evt => {
    evt.stopPropagation?.();
  });
  plainTextModeButton.addEventListener('click', () => {
    switchToPlainText();
  });
  markdownModeButton.addEventListener('click', () => {
    switchToMarkdown(editor?.state?.doc?.toString());
  });
  restMode.addEventListener('click', () => {
    switchToRest(editor?.state?.doc?.toString());
  });
  filesModeButton.addEventListener('click', () => {
    alert('File mode not yet implemented.');
  });

  /**
   * @param {string} [text] 
   */
  function switchToMarkdown(text) {
    const editorElement = unicontent;

    let markdownHost = /** @type {HTMLElement} */(document.querySelector('#markdownHost'));
    if (!markdownHost) {
      markdownHost = document.createElement('div');
      markdownHost.id = 'markdownHost';
      markdownHost.style.cssText = `
      position: fixed;
      left: 0; top: 0;
      width: 100%; height: 100%;
      overflow: auto;
      padding: 1em;
    `;
      contentArea.appendChild(markdownHost);
    } else {
      markdownHost.style.display = 'unset';
    }

    editorElement.style.display = 'none';
    unitools.style.display = 'none';

    hideSwitcher();

    setTimeout(() => {
      runMarkdown(markdownHost, text);
    }, 1);
  }

  function switchToRest(text) {
    alert('REST mode not yet implemented.');
  }

  function switchToPlainText() {
    const unicontent = /** @type {HTMLElement} */(document.getElementById('unicontent'));
    const markdownHost = /** @type {HTMLElement} */(document.getElementById('markdownHost'));
    if (markdownHost) markdownHost.style.display = 'none';
    unicontent.style.display = 'block';
    hideSwitcher();
  }

  function hideSwitcher() {
    main.style.opacity = '';
    main.style.filter = '';
    main.style.pointerEvents = '';
    modeSwitcherBg.style.transition = 'opacity 400ms, filter 400ms, transform 400ms';
    setTimeout(() => {
      modeSwitcherBg.style.opacity = '0.3';
      modeSwitcherBg.style.filter = 'blur(14px)';
      modeSwitcherBg.style.transform = 'scale(3)';
      setTimeout(() => {
        modeSwitcherBg.style.transition = 'opacity 100ms';
        setTimeout(() => {
          modeSwitcherBg.style.opacity = '0';
          setTimeout(() => {
            modeSwitcherBg.remove();
          }, 100);
        }, 10);
      }, 395);
    }, 10);
  }
}

export function getHostSlots() {
  const main = /** @type {HTMLElement} */(document.getElementById('main'));
  const toolbar = /** @type {HTMLElement} */(document.getElementById('toolbar'));
  const text_tools = /** @type {HTMLElement} */(document.getElementById('text_tools'));
  const contentArea = /** @type {HTMLElement} */(document.getElementById('contentHost'));
  const text_content = /** @type {HTMLElement} */(document.getElementById('text_content'));
  const text_textarea = /** @type {HTMLTextAreaElement | undefined} */(document.getElementById('text_textarea'));

  return {
    main,
    toolbar,
    text_tools,
    contentArea,
    text_content,
    text_textarea
  };
}