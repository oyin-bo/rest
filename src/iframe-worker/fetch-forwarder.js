// @ts-check

const captureConsole = console;

/**
 * @param {ReturnType<import('./serialize/remote-objects').remoteObjects>} remote
 */
export function createFetchForwarder(remote) {

  const console = captureConsole;

  const fetchSessions = {};

  const forwarder = {
    fetch,
    onFetchReply
  };

  return forwarder;

  function fetch(...args) {
    return fetchProxy(...args);
  }

  async function fetchProxy(...args) {
    const callKey = String(Date.now() + Math.random());

    let promise = new Promise((resolve, reject) => {
      fetchSessions[callKey] = {
        callKey,
        resolve,
        reject
      };
    });

    const serializedArgs = remote.serialize(args);

    remote.onSendMessage({
      callKind: 'fetch',
      callKey,
      args: serializedArgs
    });

    const result = await promise;
    // console.log('fetchProxy::fetch(', args, ') --> ', result);

    return result;
  }

  function onFetchReply({ fetchForwarder }, replyTo) {
    const fSession = fetchSessions[fetchForwarder.key];
    if (!fSession) return;
    delete fetchSessions[fSession.callKey];

    const { error } = fetchForwarder;

    if (error) fSession.reject(remote.deserialize(error));
    else fSession.resolve(remote.deserialize(fetchForwarder.result));
  }
}
