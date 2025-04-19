// @ts-check

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
    console.error('ServiceWorkers are not yet supported, suspicious invocation.');
    return;
  }

  if (environmentFlags.isBrowser) {

  } else if (environmentFlags.isWebWorker) {
    return;
  }

}

function detectEnvironmentClues() {
  const isNode = typeof process !== 'undefined' && process?.versions?.node;
  const isBrowser = typeof window !== 'undefined' && window?.document && typeof window.document.createElement === 'function',
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
    isVSCodeAddonWeb
  };

}