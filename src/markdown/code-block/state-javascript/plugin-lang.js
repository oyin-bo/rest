// @ts-check

import { pluginDependency } from '../../plugin-dependency';
import { makeLanguageService } from '../lang-service';

const { plugin, getValue } = pluginDependency({
  name: 'TYPESCRIPT_LANGUAGE_SERVICE',
  update: 'never',
  /** @type {import('../../plugin-dependency').DeriveDependency<ReturnType<typeof makeLanguageService>>} */
  derive: ({ update }) => {
    const promiseOrLS = makeLanguageService();
    if (typeof promiseOrLS.then === 'function') {
      promiseOrLS.then(ls => {
        update(ls);
      });
    }
    return promiseOrLS;
  }
});

export {
  plugin as typescriptLanguageServicePlugin,
  getValue as getTypescriptLanguageService
};
