// @ts-check

/**
 * @param {string} script
 * @param {Record<string, any>} globals
 * @param {any} key
 */
export async function executeEvalRequest(script, globals, key) {
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
    let resolvedResult = result;
    if (typeof result?.then === 'function')
      resolvedResult = await result;

    return { evalReply: { key, result: resolvedResult, success: true } };
  } catch (error) {
    return { evalReply: { key, success: false, error } };
  }
}