// @ts-check

// patch for working in node.js
import './patch-document-create-element';

import { runIFRAMEWorker } from './iframe-worker';
import { runInteractiveApp } from './app';
import { buildAll } from '../build';

import './core.css';

if (typeof window !== 'undefined' && typeof window?.alert === 'function') {

  if (location.host.indexOf('-ifrwrk.') >= 0) {
    runIFRAMEWorker();
  } else {
    runInteractiveApp();
  }

} else if (typeof require === 'function' && typeof module !== 'undefined' && typeof __filename === 'string') {
  if (require?.main?.filename === __filename) {
    buildAll();
  }
}
