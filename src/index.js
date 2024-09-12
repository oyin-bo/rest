// @ts-check

import { version } from '../package.json';
import { parseLocation } from './url-encoded/parse-location';
import { parsePathPayload } from './url-encoded/parse-path-payload';
import { runMarkdown } from './markdown';
import { makeEncodedURL } from './url-encoded/make-encoded-url';
import { runParseRanges } from './unicode-styles/run-parse-ranges';

import './core.css';

// @ts-ignore
import indexHTML from './index.html';
// @ts-ignore
import initHTML from './init.html';

if (typeof window !== 'undefined' && typeof window?.alert === 'function') {
  const versionDIV = document.getElementById('version');
  if (versionDIV) versionDIV.textContent = 'v' + version;

  const urlData = parseLocation();
  const payload = parsePathPayload(urlData.payload);
  let verbEditMode = payload.impliedVerb ? '' : payload.verb;

  let contentHost = /** @type {HTMLElement} */(document.getElementById('contentHost'));
  if (!contentHost) {
    injectDocumentHTML();
    contentHost = /** @type {HTMLElement} */(document.getElementById('contentHost'));
  }

  let format_textarea = /** @type {HTMLTextAreaElement} */(document.getElementById('format_textarea'));
  const tools = document.getElementById('tools');

  const originalText = [payload.addr, payload.body].filter(Boolean).join('\n') || format_textarea?.value || '';
  contentHost.innerHTML = '';

  runMarkdown(
    contentHost,
    originalText);

}

function injectDocumentHTML() {
  const lastScriptSrc = Array.from(document.scripts).slice(-1)[0]?.src;
  if (!document.body) {
    const body = document.createElement('body');
    document.documentElement.appendChild(body);
  }

  const ifr = document.createElement('iframe');
  ifr.src = 'about:blank';
  ifr.style.cssText = 'pointer-events: none; opacity: 0;';
  document.body.appendChild(ifr);

  ifr.contentDocument?.write(indexHTML);
  addChildren(ifr.contentDocument?.head, document.head);
  addChildren(ifr.contentDocument?.body, document.body);

  /** @type {typeof document} */(ifr.contentDocument).body.innerHTML = initHTML;

  addChildren(ifr.contentDocument?.body, document.body);

  ifr.remove();

  /**
   * @param {HTMLElement | undefined} sourceElem
   * @param {HTMLElement} targetElem
   */
  function addChildren(sourceElem, targetElem) {
    if (!sourceElem) return;
    for (const elem of Array.from(sourceElem.children || [])) {
      if (/style/i.test(elem.tagName || '') || /script/i.test(elem.tagName || '')) continue;
      const cloneElem = /** @type {HTMLElement & { src?: string, href?: string }} */(elem.cloneNode());
      cloneElem.innerHTML = elem.innerHTML;
      const src = cloneElem.getAttribute('src');
      const href = cloneElem.getAttribute('href')
      if (src) cloneElem.src = adjustSrcRoot(src);
      if (href) cloneElem.href = adjustSrcRoot(href);

      targetElem.appendChild(cloneElem);
    }
  }

  /** @param {string} src */
  function adjustSrcRoot(src) {
    if (/^http(s?)\:/i.test(src)) return src;
    const baseSrc = lastScriptSrc.replace(/\/[^\/]+$/, '/');
    const combined = baseSrc + src.replace(/^\.*\/*/, '');
    console.log('expanded ', src, ' on ', lastScriptSrc, ' to ', combined);
    return combined;
  }
}

/**
 * @param {string} text
 * @param {string} verb
 */
export function updateLocationTo(text, verb) {
  // TODO: figure out if the verb/address need to be handled
  const url = makeEncodedURL(verb, '', text);
  const urlData = parseLocation();

  const title = text.split('\n').map(str => str.trim()).filter(Boolean)[0];
  if (title) {
    const parsedTitle = runParseRanges(title);
    const normalizedTitle =
      (parsedTitle ? parsedTitle.map(entry => typeof entry === 'string' ? entry : entry.plain).join('') : title);

    document.title = '…' + normalizedTitle.replace(/^[\.…]+/, '') + ' 🍹';
  } else {
    document.title = '…type to yourself 🍹'
  }

  switch (urlData.source) {
    case 'path':

      history.replaceState(
        null,
        'unused-string',
        location.protocol + '//' + location.host + '/' + url);
      break;

    case 'hash':
    default: // update hash
      location.hash = '#' + url
      break;
  }
}