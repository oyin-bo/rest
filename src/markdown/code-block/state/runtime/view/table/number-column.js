// @ts-check

import './number-column.css';

const decimalDot = String(1.5).charAt(1);
const nonNumRegExp = /[^\d]+/g;

/**
 * @param {import('ag-grid-community').ICellRendererParams} props
 */
export function numberCellRenderer(props) {
  /** @type {{min: number, max: number, count: number } | undefined} */
  const stats = props.colDef?.cellRendererParams?.col?.types?.number;

  if (typeof props.value !== 'number')
    return props.value;

  const container = document.createElement('div');
  container.className = 'cell-number';
  if (props.value === 0) container.classList.add('zero');
  if (props.value > 0) container.classList.add('positive');
  if (props.value < 0) container.classList.add('negative');
  if (Number.isNaN(props.value)) container.classList.add('NaN');
  else if (!Number.isFinite(props.value)) container.classList.add('infinity');

  const str = String(props.value);

  const posE = str.indexOf('e');
  if (posE >= 0) {
    // TODO: format exponential
    container.textContent = str;
  } else {
    const posDot = str.indexOf(decimalDot);
    const wholeStrEnd = posDot < 0 ? str.length : posDot;

    if (wholeStrEnd >=0) {
      const wholeNum = Number(str.slice(0, wholeStrEnd));
      const wholeNumStr = wholeNum.toLocaleString();

      let pos = nonNumRegExp.lastIndex = 0;
      while (pos < wholeNumStr.length) {
        const matchNonNum = nonNumRegExp.exec(wholeNumStr);
        const numChunkUntil = !matchNonNum ? wholeNumStr.length : matchNonNum.index;
        if (numChunkUntil > pos) {
          const numChunk = document.createElement('span');
          numChunk.className = 'num-chunk';
          numChunk.textContent = wholeNumStr.slice(pos, numChunkUntil);
          container.appendChild(numChunk);
          pos = numChunkUntil;
        }

        if (matchNonNum) {
          const chunkClassName = 
            matchNonNum[0] === '+' ? 'sign-chunk positive-sign-chunk' :
              matchNonNum[0] === '-' ? 'sign-chunk negative-sign-chunk' :
                'separator-chunk';
            const chunk = document.createElement('span');
            chunk.className = chunkClassName;
            chunk.textContent = matchNonNum[0];
          container.appendChild(chunk);
          pos = matchNonNum.index + matchNonNum[0].length;
        }
      }
    }

    if (posDot >= 0) {
      const dotChunk = document.createElement('span');
      dotChunk.className = 'decimal-point-chunk';
      dotChunk.textContent = str.charAt(posDot);
      container.appendChild(dotChunk);

      if (posDot + 1 < str.length) {
        const fracChunk = document.createElement('span');
        fracChunk.className = 'fraction-chunk';
        fracChunk.textContent = str.slice(posDot + 1);
        container.appendChild(fracChunk);
      }
    }
  }

  if (props.value && // no point drawing chart for zero value
    typeof stats?.max === 'number' && typeof stats?.min === 'number' &&
    stats.min !== stats.max &&
    (stats?.count || 0) > 2) { // no point drawing charts for 3 numbers
    if (stats.min < 0) {
      const max = Math.max(0, stats.max);
      // negative signs present in the data set
      if (props.value > 0) {
        const bar = document.createElement('div');
        bar.className = 'cell-number-minibar cell-number-minibar-positive cell-number-minibar-signed';
        bar.style.left = (100 * Math.abs(stats.min) / (max - stats.min)).toFixed(3) + '%';
        bar.style.width = (100 * props.value / (max - stats.min)).toFixed(3) + '%';
        container.appendChild(bar);
      } else {
        const bar = document.createElement('div');
        bar.className = 'cell-number-minibar cell-number-minibar-negative cell-number-minibar-signed';
        bar.style.left = (100 * (props.value - stats.min) / (max - stats.min)).toFixed(3) + '%';
        bar.style.width = (100 * Math.abs(props.value) / (max - stats.min)).toFixed(3) + '%';
        container.appendChild(bar);
      }
    } else {
      const bar = document.createElement('div');
      bar.className = 'cell-number-minibar cell-number-minibar-neutral cell-number-minibar-unsigned';
      bar.style.left = '0';
      bar.style.width = (100 * props.value / stats.max).toFixed(3) + '%';
      container.appendChild(bar);
    }
  }

  return container;
}