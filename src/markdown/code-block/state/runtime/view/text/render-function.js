// @ts-check

/**
 * @param {any} result
 * @param {(import('..').RenderedContent)[]} output
 */
export function renderFunction(result, output) {
  let functionName = result.name;
  if (!functionName) {
    functionName = String(result).trim().split('\n')[0];
    if (functionName.length > 60)
      functionName = functionName.slice(0, 50) + '...' + functionName.slice(-5);
  }

  output.push({ class: 'success success-function function-render hi-identifier', textContent: functionName });
  output.push({
    widget: () => {
      const btnRun = document.createElement('button');
      btnRun.className = 'function-render-invoke-button';
      btnRun.textContent = '() >';
      btnRun.onclick = async () => {
        /** @type {any} */
        let args = prompt('functionName arguments:');
        if (args === null) return;

        try {
          args = (0, eval)('[' + args + ']');
        } catch (err) {
          args = [args];
        }

        btnRun.textContent = '() >...';

        const returnValue = await result(...args);
        btnRun.textContent = '() = ' +
          (returnValue ? returnValue : typeof returnValue + ' ' + returnValue);
      };
      return btnRun;
    }
  });
}
