// @ts-check

/**
 * @param {{
 *  script: string,
 *  globals: Record<string, any>,
 *  key: any,
 *  remote: ReturnType<import('./serialize/remote-objects').remoteObjects>,
 *  console: { log: (...any) => void },
 * globalIndex?: number
 * }} _
 */
export async function executeEvalRequest({ script, globals, key, remote, console, globalIndex }) {
  if (typeof script !== 'string') return;
  if (key == null) return;

  try {
    for (const key in window) {
      if (key.length === 2 && /\$[0-9]/.test(key)) {
        if (key in globals)
          window[key] = globals[key];
        else
          delete window[key];
      }
    }

    for (const key in globals) {
      window[key] = globals[key];
    }

    const result = (0, eval)(script);
    let resolvedResult = await result;
    if (typeof globalIndex === 'number')
      window['$' + globalIndex] = resolvedResult;

    const remoteResolvedResult = remote.serialize(resolvedResult);

    return { evalReply: { key, result: remoteResolvedResult, success: true } };
  } catch (error) {
    if (typeof globalIndex === 'number')
      window['$' + globalIndex] = undefined;

    console.log('Eval error: ', error, 'for:\n', script);
    const remoteError = remote.serialize(error);
    return { evalReply: { key, success: false, error: remoteError } };
  }
}