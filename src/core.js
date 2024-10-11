import { parseLocation } from './url-encoded/parse-location';

import './core.css';

const bases = parseLocation(location);
if (bases.baseHref !== location.pathname) {
  document.write('<base href="' + bases.baseHref + '">');
}

if (location.hostname && location.hostname.toLowerCase() !== 'localhost') {
  document.documentElement.classList.add('loaded-site');
}

const baseHref = 
  location.hostname.indexOf('-ifrwrk') >= 0 ?
    String(location).replace(/[a-z0-9]+-ifrwrk\./, '') :
    '';

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = baseHref + 'index.css';

const script = document.createElement('script');
script.src = baseHref + 'index.js';

(document.body || document.head).appendChild(link);
(document.body || document.head).appendChild(script);

window['tty_load_basic_dom'] = function () {
};
