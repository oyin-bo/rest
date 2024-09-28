// @ts-check

/**
 * @template TPromised
 * @template T
 * @param {Promise<TPromised> | TPromised} promiseOrSync
 * @param {(sync: TPromised) => T} callback
 * @returns {T | Promise<T>}
 */
export function withPromiseOrSync(promiseOrSync, callback) {
  if (typeof /** @type {Promise<TPromised>} */(promiseOrSync).then === 'function') {
    return /** @type {Promise<TPromised>} */(promiseOrSync).then(callback);
  } else {
    return callback(/** @type {TPromised} */(promiseOrSync));
  }
}