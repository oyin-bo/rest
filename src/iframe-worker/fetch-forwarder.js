// @ts-check

/**
 * @param {string} replyOrigin
 */
export function createFetchForwarder(replyOrigin) {

  const fetchSessions = {};

  return { fetch, onFetchReply };

  function fetch(...args) {
    return fetchProxy(...args);
  }

  function fetchProxy(...args) {
    const key = String(Date.now() + Math.random());

    let promise = new Promise((resolve, reject) => {
      fetchSessions[key] = {
        key,
        resolve,
        reject
      };
    });

    window.parent.postMessage({
      fetchForwarder: {
        key,
        args
      }
    }, replyOrigin);

    return promise;
  }

  function onFetchReply({ fetchForwarder }, replyTo) {
    const fSession = fetchSessions[fetchForwarder.key];
    if (!fSession) return;
    delete fetchSessions[fSession.key];

    const { error, result } = fetchForwarder;

    if (error) {
      /** @type {*} */
      const ErrorFn = window[error.name] || Error;
      const err = new ErrorFn(error.message);
      for (const k in error) {
        if (err[k] !== error[k]) err[k] = error[k];
      }

      fSession.reject(err);
    } else {
      const result = fetchForwarder.result;
      console.log('onFetchReply>> ', fetchForwarder);

      for (const k in result) {
        var val = result[k];
        if (val && typeof val === 'object') {
          if (val.function) {
            if (val.function === 'promise') {
              result[k] = (...args) => {
                const key = String(Date.now() + Math.random());
                const promise = new Promise((resolve, reject) => {
                  fetchSessions[key] = {
                    resolve,
                    reject
                  };
                });

                replyTo.postMessage({
                  fetchForwarder: {
                    key: fSession.key,
                    call: { function: k, key, args }
                  }
                }, replyOrigin);

                return promise;
              };
            } else {
              return val.function;
            }
          }
        }
      }

      fSession.resolve(result);
    }
  }
}
