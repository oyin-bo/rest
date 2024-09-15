// @ts-check

import { version } from '../package.json';
import { parseLocation } from './url-encoded/parse-location';
import { parsePathPayload } from './url-encoded/parse-path-payload';
import { runMarkdown } from './markdown';
import { makeEncodedURL } from './url-encoded/make-encoded-url';
import { runParseRanges } from './unicode-formatting/run-parse-ranges';

import './core.css';

// @ts-ignore
import indexHTML from './index.html';
// @ts-ignore
import initHTML from './init.html';

if (typeof window !== 'undefined' && typeof window?.alert === 'function') {

  const urlData = parseLocation();
  const payload = parsePathPayload(urlData.payload);
  let verbEditMode = payload.impliedVerb ? '' : payload.verb;

  let contentHost = /** @type {HTMLElement} */(document.getElementById('contentHost'));
  if (!contentHost) {
    const bookmarkletScriptSrc = likelyBookmarkletGetScriptSrc();
    if (bookmarkletScriptSrc) {
      injectIframeAndExit(bookmarkletScriptSrc);
    }
    injectDocumentHTML();
    contentHost = /** @type {HTMLElement} */(document.getElementById('contentHost'));
  }

  const versionDIV = document.getElementById('version');
  if (versionDIV) versionDIV.textContent = 'v' + version;

  let format_textarea = /** @type {HTMLTextAreaElement} */(document.getElementById('format_textarea'));
  const tools = document.getElementById('tools');

  const originalText = [payload.addr, payload.body].filter(Boolean).join('\n') || format_textarea?.value || '';
  contentHost.innerHTML = '';

  runMarkdown(
    contentHost,
    originalText);

}

function likelyBookmarkletGetScriptSrc() {
  const thisScriptSrc = document.scripts[document.scripts.length - 1]?.src;
  const thisScriptHost = thisScriptSrc && new URL(thisScriptSrc).host;

  // script hosted in subdomain? looks like genuine app not bookmarklet
  if (location.host.indexOf(thisScriptHost || 'EMPTY::') >= 0 ||
    (thisScriptHost || '').indexOf(location.host || 'EMPTY::') >=0) return false;

  const headElementCount = document.head.childElementCount;
  const bodyElementCount = document.body?.querySelectorAll('*')?.length || 0;

  // complex content
  return headElementCount > 4 && bodyElementCount > 10 ? thisScriptSrc : undefined;
}

function injectIframeAndExit(scriptSrc) {
  if (window['ifr']) return;
  const ifr = window['ifr'] = document.createElement('iframe');
  ifr.src = 'about:blank';
  ifr.style.cssText = 'position:fixed;right:5vw;top:5vh;height:90vh;width:40vw;z-index:10000;border:solid 1px grey;border-radius: 0.4em;box-shadow:5px 5px 17px #00000052; background: white;';
  document.body.appendChild(ifr);
  var scr = document.createElement('script');
  scr.src = scriptSrc;
  ifr.contentDocument?.head.appendChild(scr);
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