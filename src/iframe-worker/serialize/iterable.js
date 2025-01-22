// @ts-check

/**
 * @typedef {{
 *  ___kind: 'iterable' | 'asyncIterable',
 *  start: import('./function-primitive').SerializedFunctionPrimitive
 * }} SerializedIterable
 */

/**
 * @this {{
 *  serializeFunctionPrimitive: (fn: Function, thisObj: Object, methodKey: string) => import('./function-primitive').SerializedFunctionPrimitive
 * }}
 * @param {Iterable} iter
 */
export function serializeIterable(iter) {
  return serializeIterableKind(this, 'iterable', iter);
}

/**
 * @this {{
 *  serializeFunctionPrimitive: (fn: Function, thisObj: Object, methodKey: string) => import('./function-primitive').SerializedFunctionPrimitive
 * }}
 * @param {AsyncIterable} iter
 */
export function serializeAsyncIterable(iter) {
  return serializeIterableKind(this, 'asyncIterable', iter);
}

var ITERABLE_CYCLE_GRACE = 180;

const iterableRetainRef = Symbol('iterableRetainRef');

/**
 * @param {{
 *  serializeFunctionPrimitive: (fn: Function, thisObj: Object, methodKey: string) => import('./function-primitive').SerializedFunctionPrimitive
 * }} self
 * @param {'iterable' | 'asyncIterable'} kind
 * @param {Iterable | AsyncIterable} iter
 */
function serializeIterableKind(self, kind, iter) {
  /** @type {SerializedIterable} */
  const serialized = { ___kind: kind, start: self.serializeFunctionPrimitive(start, iter, kind) };
  if (self) {
    self[iterableRetainRef] = serialized;
  }

  return serialized;

  async function start() {
    let buf = [];
    let error;
    let done = false;

    let resume;
    let pausePromise;

    let next, nextPromise = new Promise(resolve => next = resolve);

    run();

    return {
      ...(await pull()),
      pull,
      cancel
    };

    async function pull() {
      if (done) {
        const currentBuf = buf;
        if (buf.length) buf = [];
        return { buf: currentBuf, error, done };
      }

      resume?.();
      resume = undefined;
      pausePromise = undefined;

      if (!buf.length) {
        await Promise.race([
          nextPromise,
          new Promise((resolve) => setTimeout(resolve, ITERABLE_CYCLE_GRACE))
        ]);
        nextPromise = new Promise(resolve => next = resolve);
      }

      {
        const currentBuf = buf;
        if (buf.length) buf = [];
        if (!done)
          pausePromise = new Promise(resolve => resume = resolve);

        return { buf: currentBuf, error, done };
      }
    }

    async function cancel() {
      done = true;
    }

    async function run() {
      let nextWait = Date.now() + 200;
      try {
        for await (const item of iter) {
          if (done) return;
          buf.push(item);
          next();

          if (Date.now() >= nextWait) {
            await new Promise(resolve => setTimeout(resolve, 1));
            nextWait = Date.now() + 200; 
          }

          if (pausePromise) {
            await pausePromise;
            resume = undefined;
            pausePromise = undefined;
          }
        }
      } catch (runError) {
        error = runError;
        done = true;
      } finally {
        done = true;
      }
    }
  }

}

/**
 * @this {{
 *  deserializeFunctionPrimitive: (fn: import('./function-primitive').SerializedFunctionPrimitive) =>
 *  () => Promise<{
 *    buf: any[],
 *    error: any,
 *    done: boolean,
 *    pull: () => Promise<{ buf: any[], error: any, done: boolean }>,
 *    cancel: () => Promise<void>
 *  }>
 * }}
 * @param {SerializedIterable} serialized
 */
export function deserializeIterable(serialized) {
  const self = this;
  return {
    __DEBUG_ITERABLE_KIND__: serialized.___kind, // carry this one for debugging

    [Symbol.asyncIterator]: async function* () {
      const startFn = self.deserializeFunctionPrimitive(serialized.start);
      let { buf, error, done, pull, cancel } = await startFn();
      while (buf?.length) {
        yield buf.shift();
      }
      if (done) {
        if (error) throw error;
        else return;
      }

      try {

        while (true) {
          const { buf, error, done } = await pull();
          while (buf?.length) {
            yield buf.shift();
          }

          if (done) {
            if (error) throw error;
            else return;
          }
        }

      } finally {
        cancel();
      }
    }
  }
}
