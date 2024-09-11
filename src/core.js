import { parseLocation } from './url-encoded/parse-location';

import './core.css';

const bases = parseLocation(location);
if (bases.baseHref !== location.pathname) {
  document.write('<base href="' + bases.baseHref + '">');
}

if (location.hostname && location.hostname.toLowerCase() !== 'localhost') {
  document.documentElement.classList.add('loaded-site');
}

window['tty_load_basic_dom'] = function () {
};
