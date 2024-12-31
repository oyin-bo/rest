import { version } from '../package.json';
import { localise } from './localise';
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
    location.protocol + '//' + location.host.replace(/[a-z0-9]+-ifrwrk\./, '') + '/' :
    '';

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = baseHref + 'index.css';

const script = document.createElement('script');
script.src = baseHref + 'index.js';

(document.body || document.head).appendChild(link);
(document.body || document.head).appendChild(script);

console.log(
  'CORE: ',
  document.title = localise('𝗺𝗼𝗰𝗸𝘂𝗺𝗲𝗻𝘁', { ua: '𝗠𝗢𝗞𝗬𝗠𝗘𝗛𝗧' }),
  { crossOriginIsolated: crossOriginIsolated, baseHref, version }
);
