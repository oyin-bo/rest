// @ts-check

export function executeInitRequest(fetchForwarder) {
  console.log('init ACK, setting window fetch: ', window.fetch, ' => ', fetchForwarder.fetch);
  window.fetch = fetchForwarder.fetch;

  return { init: 'ack' };
}
