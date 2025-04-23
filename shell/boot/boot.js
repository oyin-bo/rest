// @ts-check

import { bootInteractiveApp } from '../interactive-app/boot-interactive-app';
import { bootIFRAMEWorker } from '../iframe-worker/boot-iframe-worker';
import { bootServiceWorker } from '../service-worker/boot-service-worker';

export function boot() {

  const environmentFlags = detectEnvironmentClues();

  if (environmentFlags.isNode) {
    console.error('Starting from Node.js is not yet supported.');
    return;
  }

  if (environmentFlags.isWScript) {
    WScript.Echo('Starting from WScript is not yet supported.');
    return;
  }

  if (environmentFlags.isServiceWorker) {
    bootServiceWorker();
    return;
  }

  if (environmentFlags.isBrowser) {
    if (environmentFlags.isIFRAMEWorker) {
      bootIFRAMEWorker();
    } else {
      bootInteractiveApp();
    }
  } else if (environmentFlags.isWebWorker) {
    console.error('Starting from WebWorker is not yet supported.');
    return;
  }

}

function detectEnvironmentClues() {
  const isNode = typeof process !== 'undefined' && process?.versions?.node;
  const isBrowser = typeof window !== 'undefined' && window?.document && typeof window.document.createElement === 'function';
  const isIframeWorker = typeof location !== 'undefined' && location?.host?.indexOf('-ifrwrk.') >= 0;
  const isElectron = typeof window !== 'undefined' && window?.process?.['type'] === 'renderer';
  const isWebWorker = typeof self !== 'undefined' && typeof self?.postMessage === 'function' && self.constructor.name === 'DedicatedWorkerGlobalScope';
  const isServiceWorker = typeof self !== 'undefined' && typeof self?.postMessage === 'function' && self.constructor.name === 'ServiceWorkerGlobalScope';

  const isWScript = typeof WScript !== 'undefined' && WScript?.FullName === 'WScript.Shell';

  const isVSCodeAddonFull = typeof process !== 'undefined' && process?.versions?.vscode;
  const isVSCodeAddonWeb =
    isBrowser &&
    // @ts-ignore
    typeof acquireVsCodeApi === 'function';

  return {
    isNode,
    isBrowser,
    isElectron,
    isWebWorker,
    isServiceWorker,
    isWScript,
    isVSCodeAddonFull,
    isVSCodeAddonWeb,
    isIFRAMEWorker: isIframeWorker
  };

}