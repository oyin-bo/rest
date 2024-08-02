// @ts-check


const SWITCHER_MODES = /** @type {const} */(['text', 'format', 'rest', 'file']);

/**
 * @typedef {SWITCHER_MODES[number]} SwitcherMode
 */

export function initSwitcher() {

  const [
    main,
    contentHost, text_content, format_content, rest_content, file_content,
    toolbar, text_tools, format_tools, rest_tools, file_tools
  ] = [
      'main',
      'contentHost', 'unicontent', 'fmtcontent', 'filecontent',
      'toolbar', 'unitools', 'fmttools', 'filetools'
    ].map(id => /** @type {HTMLElement} */(document.getElementById(id)));

  const [text_textarea, format_textarea, rest_textarea] = ['text', 'format', 'rest'].map(mode => /** @type {HTMLTextAreaElement} */(document.getElementById(mode + '_textarea')));

  const moreModes = /** @type {HTMLElement} */(document.getElementById('moreModes'));

  const modeSlots = /** @type {const} */({
    text: { content: text_content, tools: text_tools, textarea: text_textarea },
    format: { content: format_content, tools: format_tools, textarea: format_textarea },
    rest: { content: rest_content, tools: rest_tools, textarea: rest_textarea },
    file: { content: file_content, tools: file_tools }
  });

  const switcher = {
    /** @type {SwitcherMode} */
    mode: 'text',
    modeSlots,
    switchToMode,
    /** @type {undefined | ((newMode: SwitcherMode, oldMode: SwitcherMode) => void)} */
    onModeSwitched: undefined
  };

  moreModes.addEventListener('click', (evt) => {
    evt?.preventDefault?.();
    evt?.stopPropagation?.();
    showSwitcherPopup();
  })

  return switcher;

  /**
   * @param {SwitcherMode} mode 
   */
  function switchToMode(mode) {
    if (mode === switcher.mode) return;
    if (SWITCHER_MODES.indexOf(mode) < 0) throw new Error('Uknown mode ' + mode);

    const oldMode = switcher.mode;
    const oldModeSlots = modeSlots[oldMode];
    [oldModeSlots.content, oldModeSlots.tools].map(elem => {
      elem.style.pointerEvents = 'none';
      elem.style.opacity = '0';
      elem.style.zIndex = '0';
    });

    switcher.mode = mode;

    const newModeSlots = modeSlots[switcher.mode];
    [newModeSlots.content, newModeSlots.tools].map(elem => {
      elem.style.pointerEvents = 'unset';
      elem.style.opacity = '1';
      elem.style.zIndex = '1';
    });

    if (typeof switcher.onModeSwitched === 'function')
      switcher.onModeSwitched(mode, oldMode);
  }

  function showSwitcherPopup() {
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
  <button id="text-mode">Text</button> <br>
  <button id="format-mode">Format</button> <br>
  <button id="rest-mode">Rest</button> <br>
  <button id="files-mode">Files</button>
  `;
    modeSwitcherBg.appendChild(modeSwitcherDlg);

    (async () => {
      await new Promise(resolve => setTimeout(resolve, 10));

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

      await new Promise(resolve => setTimeout(resolve, 10));

      modeSwitcherDlg.style.transition = 'transform 300ms, scale 300ms, opacity 400ms';

      await new Promise(resolve => setTimeout(resolve, 10));

      modeSwitcherDlg.style.transform = 'translate(0, 0) scale(1, 1)';
      modeSwitcherDlg.style.opacity = '1';
    })();

    modeSwitcherBg.addEventListener('click', () => {
      hideSwitcher();
    });

    const switchButtons = SWITCHER_MODES.map(mode =>
      /** @type {const} */(
      [mode, /** @type {HTMLElement} */(document.getElementById(mode))]));

    switchButtons.map(([mode, btn]) => btn.addEventListener('click', () => {
      switchToMode(mode);
    }));

    modeSwitcherDlg.addEventListener('click', evt => {
      evt.stopPropagation?.();
    });

    async function hideSwitcher() {
      main.style.opacity = '';
      main.style.filter = '';
      main.style.pointerEvents = '';
      modeSwitcherBg.style.transition = 'opacity 400ms, filter 400ms, transform 400ms';

      await new Promise(resolve => setTimeout(resolve, 10));

      modeSwitcherBg.style.opacity = '0.3';
      modeSwitcherBg.style.filter = 'blur(14px)';
      modeSwitcherBg.style.transform = 'scale(3)';

      await new Promise(resolve => setTimeout(resolve, 10));

      modeSwitcherBg.style.transition = 'opacity 100ms';

      await new Promise(resolve => setTimeout(resolve, 10));

      modeSwitcherBg.style.opacity = '0';

      await new Promise(resolve => setTimeout(resolve, 10));

      modeSwitcherBg.remove();
    }
  }
}