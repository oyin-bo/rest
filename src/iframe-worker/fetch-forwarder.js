// @ts-check

/** @param {ReturnType<import('./serialize/remote-objects').remoteObjects>} remote */
export function createFetchForwarder(remote) {
  
  const fetchProxy = 
    remote.deserialize({ ___kind: 'Function', key: 'function-fetch' });

  return fetch;

  function fetch(...args) {
    return fetchProxy(...args);
  }
}
