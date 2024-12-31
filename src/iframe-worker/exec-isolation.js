// @ts-check

import { thisScriptURL } from '../url-encoded/parse-location';
import { remoteObjects } from './serialize/remote-objects';
import { createWebSocketForwarderService } from './websocket-forwarder-service';
import { loadCorsIframe } from './load-cors-iframe';

export var USE_SERIALIZATION = true;

export function execIsolation() {

  let remote = remoteObjects();
  let iframe, iframeOrigin;

  remote.onSendMessage = (msg) => {
    if (!iframe) {
      console.warn('No iframe to send message to');
      return;
    }

    if (!iframeOrigin) {
      console.warn('No iframe origin to send message to');
      return;
    }

    iframe.contentWindow?.postMessage(msg, iframeOrigin);
  };

  // TODO: unsubscribe if iframe crashes and reloaded
  window.addEventListener('message', handleMessage);

  return {
    execScriptIsolated
  };

  /**
   * @type {{
   *  [key: string]: {
   *    promise: Promise,
   *    resolve: (value: any) => void,
   *    reject: (value: any) => void
   *  }
   * }}
   */
  var scriptRequests;

  /** @type {Parameters<typeof execScriptIsolated>[3]} */
  var loggerInstance;

  var keepFetchBodyAliveSymbol = Symbol('keepFetchBodyAlive');
  async function fetchProxy(...args) {
    console.log('fetch request ', ...args);

    // browsers may hiccup on readable stream body
    const reqBody = args[0]?.body || args[1]?.body;
    if (reqBody instanceof ReadableStream) {
      const chunks = [];
      let byteLength = 0;
      const reader = reqBody.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (value) {
            chunks.push(value);
            byteLength += value.byteLength;
          }

          if (done) break;
        }
      } finally {
        reader.releaseLock();
      }

      const combined = new Uint8Array(byteLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      if (args[0]?.body === reqBody) {
        // need to recreate the whole request
        const serialized = remote.serialize(args[0]);
        serialized.body = combined;
        args[0] = remote.deserialize(serialized);
      } else {
        args[1].body = combined;
      }
    }

    const resp = await /** @type {*} */(fetch)(...args);
    resp[keepFetchBodyAliveSymbol] = { body: resp.body, pull: resp.body.pull };
    return resp;
  }

  /**
   * @param {string} scriptText
   * @param {Record<string, any>} globals
   * @param {number} [index]
   * @param {(level: string, args: any[]) => void} [logger]
   */
  async function execScriptIsolated(scriptText, globals, index, logger) {

    loggerInstance = logger;
    const ifrCreated = await (
      _workerIframePromise ||
      (_workerIframePromise = loadCorsIframe({
        serializedGlobals: {
          fetch: remote.serialize(fetchProxy)
        }
      }))
    );

    iframe = ifrCreated.iframe;
    iframeOrigin = ifrCreated.origin;

    iframe['__fetchProxy'] = fetchProxy;

    if (!scriptRequests) scriptRequests = {};

    /** @type {*} */
    let resolve;
    /** @type {*} */
    let reject;
    let promise = new Promise((xResolve, xReject) => {
      resolve = xResolve;
      reject = xReject;
    });

    const key = Date.now() + ' ' + Math.random();

    scriptRequests[key] = { promise, resolve, reject };

    iframe.contentWindow?.postMessage({
      eval: {
        key,
        script: scriptText,
        globals: USE_SERIALIZATION ? remote.serialize(globals) : globals,
        globalIndex: index
      }
    }, iframeOrigin);

    return promise;

  }

  var webSocketForwardService;

  /**
 * @param {MessageEvent} _
 */
  function handleMessage({ data, origin, source }) {
    if (iframeOrigin !== '*' && origin !== iframeOrigin) return;
    if (source !== iframe.contentWindow) return;

    if (data.evalReply) {
      const { key, success, result, error } = data.evalReply;

      const entry = scriptRequests[key];
      if (entry) {
        delete scriptRequests[key];
        if (success) entry.resolve(USE_SERIALIZATION ? remote.deserialize(result) : result);
        else entry.reject(USE_SERIALIZATION ? remote.deserialize(error) : error);
      }
    } else if (data.webSocketForwarder) {
      if (!webSocketForwardService)
        webSocketForwardService = createWebSocketForwarderService(origin);

      webSocketForwardService.onMessage({ data, source });
    } else if (data.console) {
      if (loggerInstance) {
        if (data.console.log) loggerInstance('log', remote.deserialize(data.console.log));
        if (data.console.debug) loggerInstance('debug', remote.deserialize(data.console.debug));
        if (data.console.warn) loggerInstance('warn', remote.deserialize(data.console.warn));
      }
    } else {
      remote.onReceiveMessage(data);
    }
  }

  /** @type {Promise<{ iframe: HTMLIFrameElement, origin: string }> | undefined} */
  var _workerIframePromise;
}
