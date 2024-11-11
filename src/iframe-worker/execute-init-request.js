// @ts-check

export function executeInitRequest(fetchForwarder, webSocketForwarder) {
  console.log(
    'init ACK, redirecting ',
    {
      fetch: { from: window.fetch, to: fetchForwarder.fetch },
      WebSocket: { from: window.WebSocket, to: webSocketForwarder.WebSocket }
    });
  window.fetch = fetchForwarder.fetch;
  window.WebSocket = webSocketForwarder.WebSocket;

  return { init: 'ack' };
}
