// @ts-check

/**
 * @param {ReturnType<import('./serialize/remote-objects').remoteObjects>} remote
 */
export function createFetchForwarderService(remote) {

  return {
    onMessage
  };

  function onMessage({ data, source }) {
    const { callKind, callKey, args } = data.fetchForwarder;
    const deserializedArgs = remote.deserialize(args);
    /** @type {ReturnType<typeof fetch>} */
    const fetchPromise = /** @type {*} */(fetch)(...deserializedArgs);

    fetchPromise.then(
      result => {
        remote.onSendMessage({
          callKind: 'fetch',
          callKey,
          result: remote.serialize(result)
        });
      },
      error => {
        source.postMessage({
          callKind: 'fetch',
          callKey,
          error: remote.serialize(error)
        });
      });
  }

}