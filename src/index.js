// @ts-check

import { version } from '../package.json';
import { parseLocation } from './url-encoded/parse-location';
import { parsePathPayload } from './url-encoded/parse-path-payload';
import { runMarkdown } from './markdown';
import { makeEncodedURL } from './url-encoded/make-encoded-url';
import { runParseRanges } from './unicode-styles/run-parse-ranges';

if (typeof window !== 'undefined' && typeof window?.alert === 'function') {
  const versionDIV = document.getElementById('version');
  if (versionDIV) versionDIV.textContent = 'v' + version;

  const urlData = parseLocation();
  const payload = parsePathPayload(urlData.payload);
  let verbEditMode = payload.impliedVerb ? '' : payload.verb;

  const contentHost = /** @type {HTMLElement} */(document.getElementById('contentHost'));
  let format_textarea = /** @type {HTMLTextAreaElement} */(document.getElementById('format_textarea'));
  const tools = document.getElementById('tools');

  const originalText = [payload.addr, payload.body].filter(Boolean).join('\n') || format_textarea?.value || '';
  contentHost.innerHTML = '';

  runMarkdown(
    contentHost,
    originalText);

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