// @ts-check

export function executeInitRequest({ ackKey, globals, webSocketForwarder, /* consoleLogForwarder, */ console }) {

  const glo = /** @type {*} */(this);
  if (!glo.__knownGlobals) glo.__knownGlobals = {};
  for (const k in glo) {
    if (k.startsWith('__')) continue;
    glo.__knownGlobals[k] = true;
  }

  console.log(
    'init ACK, redirecting ',
    {
      fetch: { from: window.fetch, globals },
      WebSocket: { from: window.WebSocket, to: webSocketForwarder.WebSocket },
      // console: consoleLogForwarder.console,
    });
  for (const k in globals) {
    window[k] = globals[k];
  }
  window.WebSocket = webSocketForwarder.WebSocket;
  // window.console = consoleLogForwarder.console;

  return { init: 'ack', ackKey };
}
