// @ts-check

export function showModeSwitcher() {
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
  modeSwitcherDlg.textContent = 'Switch to: A, B, C';
  modeSwitcherBg.appendChild(modeSwitcherDlg);

  setTimeout(() => {
    modeSwitcherBg.style.opacity = 1;
  }, 1);

  modeSwitcherBg.addEventListener('click', () => {
    uniedit.style.opacity = '';
    uniedit.style.filter = '';
    uniedit.style.pointerEvents = '';
    document.body.removeChild(modeSwitcherBg);
  });
}