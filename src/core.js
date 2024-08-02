import { parseLocation } from './url-encoded/parse-location';

import './core.css';

const bases = parseLocation(location);
if (bases.baseHref !== location.pathname) {
  document.write('<base href="' + bases.baseHref + '">');
}

window['tty_load_basic_dom'] = function () {
};
