// @ts-check

export function serializeWindow(win) {
  const deserialized = {
    ___kind: 'Window',
    globals: {}
  };
  try {
    for (const k in win) {
      try {
        const val = win[k];
        if (val == null) deserialized.globals[k] = String(val);
        else deserialized.globals[k] = typeof val;
      } catch (errFetchProp) {
        deserialized.globals[k] = errFetchProp.constructor?.name + ' ' + errFetchProp.message.split('\n')[0];
      }
    }
  } catch (errIterating) {
    deserialized.globals['iterating'] = errIterating.constructor?.name + ' ' + errIterating.message.split('\n')[0];
  }
  return deserialized;
}

export function deserializeWindow() {
  return window;
}
