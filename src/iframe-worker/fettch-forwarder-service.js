// @ts-check

/**
 * @param {string} replyOrigin
 */
export function createFetchForwarderService(replyOrigin) {

  const fetchSessions = {};

  return {
    onMessage
  };

  function onMessage({ data, source }) {

    if (data.fetchForwarder.call) handleRequestMethod({ data, source });
    else handleFetch({ data, source });
  }

  function handleRequestMethod({ data, source }) {
    const fSession = fetchSessions[data.fetchForwarder.key];
    if (!fSession) {
      console.warn('Requested method invocation on nonexistent key ', data);
      return;
    }

    const result = fSession.result;
    const callResult = fSession.result[data.fetchForwarder.call.function](
      data.fetchForwarder.call.args
    );

    callResult.then(
      callResolved => {
        source.postMessage({
          fetchForwarder: {
            key: data.fetchForwarder.call.key,
            result: callResolved
          }
        }, replyOrigin);
      },
      callFailedError => {
        source.postMessage({
          fetchForwarder: {
            key: data.fetchForwarder.call.key,
            error: callFailedError
          }
        }, replyOrigin);
      });
  }

  function handleFetch({ data, source }) {
    /** @type {ReturnType<typeof fetch>} */
    const fetchPromise = /** @type {*} */(fetch)(...data.fetchForwarder.args);
    fetchPromise.then(
      result => {
        fetchSessions[data.fetchForwarder.key] = { result };

        /** @type {Record<string, any>} */
        const proxyResult = {};
        for (const k in result) {
          if (typeof result[k] === 'function') {
            proxyResult[k] = { function: 'promise' };
          } else {
            try {
              structuredClone(result[k])
              proxyResult[k] = result[k];
            } catch {
              try {
                proxyResult[k] = JSON.parse(JSON.stringify(result[k]));
              } catch {
                try {
                  proxyResult[k] = String(k);
                } catch (err) {
                  proxyResult[k] = err.stack || err.message;
                }
              }
            }
          }
        }

        source.postMessage({
          fetchForwarder: {
            key: data.fetchForwarder.key,
            result: proxyResult
          }
        }, replyOrigin);

        return proxyResult;
      },
      error => {
        const err = {
          name: error.constructor?.name,
          message: error.message
        };

        for (const k in error) {
          if (err[k] !== error[k]) err[k] = error[k];
        }

        source.postMessage({
          fetchForwarder: {
            key: data.fetchForwarder.key,
            error: err
          }
        }, replyOrigin)
      });
  }

}