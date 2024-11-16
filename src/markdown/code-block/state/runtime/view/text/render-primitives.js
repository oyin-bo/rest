// @ts-check

import { parseDate } from '../table/parse-date';

/**
 * @param {import('.').ValueRenderParams<number | bigint>} params
 */
export function renderNumber({ value }) {
  if (Number.isNaN(value)) return { class: 'hi-number hi-nan', textContent: 'NaN' };
  if (!Number.isFinite(value)) return { class: 'hi-number hi-infinity', textContent: String(value) };

  const str = String(value);
  const posE = str.indexOf('e');
  const posDot = str.indexOf('.');

  if (posE >= 0) return { class: 'hi-number', textContent: str };
  if (posDot >= 0) return { class: 'hi-number', textContent: str };

  const dt = typeof value !== 'number' ? undefined : parseDate(value);
  if (dt) {
    return [
      { class: 'hi-number', textContent: value.toString() },
      {
        widget: () => {
          const span = document.createElement('span');
          span.className = 'hi-comment hi-date-tip';
          const now = new Date();
          span.textContent = ' /*' + dt.toISOString() + '*/';
          if (dt.getFullYear() === now.getFullYear() &&
            dt.getMonth() === now.getMonth() &&
            dt.getDate() === now.getDate())
            span.textContent = ' /*' + span.textContent.split('T')[1];
          return span;
        }
      }
    ];
  }

  return { class: 'hi-number', textContent: value.toString() };
}

/**
 * @param {import('.').ValueRenderParams<boolean>} params
 */
export function renderBoolean({ value }) {
  return { class: 'hi-boolean', textContent: value.toString() };
}

/**
 * @param {import('.').ValueRenderParams<Symbol>} params
 */
export function renderSymbol({ value }) {
  return { class: 'hi-symbol', textContent: 'Symbol(' + (value.description || '') + ')' };
}
