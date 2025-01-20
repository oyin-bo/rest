// @ts-check

/**
 * @typedef {{
 *  ___kind: 'readableStream',
 *  pull: import('./function-primitive').SerializedFunctionPrimitive
 * }} SerializedReadableStream
 */

/**
 * @this {{
 *  serializeFunctionPrimitive(fn: Function): import('./function-primitive').SerializedFunctionPrimitive ;
 * }}
 * @param {ReadableStream} readableStream
 * @returns {SerializedReadableStream}
 */
export function serializeReadableStreamExact(readableStream) {
  return {
    ___kind: 'readableStream',
    pull: this.serializeFunctionPrimitive(async () => {
      const reader = readableStream.getReader();
      try {
        const readerResult = await reader.read();
        return readerResult;
      } finally {
        reader.releaseLock();
      }
    })
  };
}

/**
 * @this {{
 *  deserializeFunctionPrimitive(serialized: import('./function-primitive').SerializedFunctionPrimitive): () => Promise<any>;
 * }}
 * @param {SerializedReadableStream} serialized
 * @returns {ReadableStream}
 */
export function deserializeReadableStreamExact(serialized) {
  const stream = new ReadableStream({
    start: (startController) => {
      // no need to mess about, wait to cross boundary until actual reading is needed
    },
    pull: async (pullController) => {
      try {
        const pull = this.deserializeFunctionPrimitive(serialized.pull);
        const readerResult = await pull();
        if (readerResult.value)
          pullController.enqueue(readerResult.value);
        if (readerResult.done)
          pullController.close();
      } catch (error) {
        pullController.error(error);
      }
    }
  });

  return stream;
}
