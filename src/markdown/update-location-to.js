// @ts-check

import { runParseRanges } from '../unicode-formatting/run-parse-ranges';
import { makeEncodedURL } from '../url-encoded/make-encoded-url';
import { parseLocation } from '../url-encoded/parse-location';

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
