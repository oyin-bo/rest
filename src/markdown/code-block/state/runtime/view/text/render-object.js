// @ts-check

import { safeGetProp } from '../../../../../../iframe-worker/serialize/remote-objects';
import { accessLanguageService } from '../../../../../../typescript-services';
import { renderFunction } from './render-function';
import { renderIterable } from './render-iterable';
import { renderJsonWithTS } from './render-json-with-ts';

/**
 * @param {import('.').ObjectRenderParams} params
 */
export function renderObject(params) {
  const { value, path, invalidate, state } = params;
  if (typeof value === 'undefined') {
    return { class: 'success success-quiet', textContent: 'OK' };
  }

  if (typeof value === 'function') {
    return renderFunction(params);
  }

  if (!value) {
    if (typeof value === 'string') return { class: 'success success-string', textContent: '""' };
    else return { class: 'success success-value', textContent: String(value) };
  }

  if (!Array.isArray(value) && typeof value !== 'string' && (
    typeof safeGetProp(value, Symbol.iterator) === 'function' || typeof safeGetProp(value, Symbol.asyncIterator) === 'function'
  )) {
    return renderIterable(params);
  }



  try {
    const json = JSON.stringify(value, null, 2);
    if (!accessLang) {
      accessLang = accessLanguageService(invalidate);
      if (typeof accessLang.then === 'function') {
        accessLang.then(resolved => {
          accessLang = resolved;
          invalidate();
        });
      }
    }

    if (typeof accessLang.then === 'function') {
      return { class: 'success success-json', textContent: json.length > 20 ? json.slice(0, 13) + '...' + json.slice(-4) : json };
    } else {
      return renderJsonWithTS({ value: json, path, invalidate, state }, accessLang);
    }
  } catch {
    try {
      return { class: 'success success-tostring', textContent: String(value) };
    } catch (toStringError) {
      return { class: 'success success-tostring-error', textContent: toStringError.message.split('\n')[0] };
    }
  }
}

/** @type {ReturnType<typeof accessLanguageService> | undefined} */
var accessLang;
