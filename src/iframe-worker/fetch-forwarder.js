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
        args: args.map(arg => {
          if (arg && arg instanceof URL)
            return arg.toString();
          else
            return arg;
        })
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
      let result;
      if (fetchForwarder.for !== 'fetch') {
        result = fetchForwarder.result;
      } else {
        result = new Response();
        for (const k in fetchForwarder.result) {
          var val = fetchForwarder.result[k];
          if (val && typeof val === 'object') {
            if (val.function) {
              if (val.function === 'promise') {
                result[k] = async (...args) => {
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

                  const res = await promise;
                  console.log('fetch.' + k + '() -> ', res);
                  return res;
                };
              } else {
                return val.function;
              }
            }
          } else {
            try {
              result[k] = fetchForwarder.result[k];
            } catch (error) {
              console.log('onFetchReply>> [' + k + '] = ', fetchForwarder.result[k], error);
            }
          }
        }
      }

      console.log('onFetchReply>> ', fetchForwarder);

      fSession.resolve(result);
    }
  }
}
