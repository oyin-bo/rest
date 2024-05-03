// @ts-check

import * as codemirror_autocomplete_import from "@codemirror/autocomplete";
import * as codemirror_commands_import from "@codemirror/commands";
import * as codemirror_lang_javascript_import from '@codemirror/lang-javascript';
import * as codemirror_language_import from '@codemirror/language';
import * as codemirror_search from "@codemirror/search";
import * as codemirror_state_import from '@codemirror/state';
import * as codemirror_view_import from '@codemirror/view';
import * as codemirror_import from 'codemirror';

import * as milkdown_core_import from '@milkdown/core';
import * as milkdown_plugin_history_import from '@milkdown/plugin-history';
import * as milkdown_plugin_indent_import from '@milkdown/plugin-indent';
import * as milkdown_plugin_trailing_import from '@milkdown/plugin-trailing';
import * as milkdown_preset_commonmark_import from '@milkdown/preset-commonmark';
import * as milkdown_preset_gfm_import from '@milkdown/preset-gfm';
import * as milkdown_theme_nord_import from '@milkdown/theme-nord';

import { dependencies, version } from '../package.json';

export const exports = {
  version,

  codemirror: codemirror_import,

  '@codemirror/autocomplete': codemirror_autocomplete_import,
  '@codemirror/commands': codemirror_commands_import,
  '@codemirror/lang-javascript': codemirror_lang_javascript_import,
  '@codemirror/language': codemirror_language_import,
  '@codemirror/search': codemirror_search,
  '@codemirror/state': codemirror_state_import,
  '@codemirror/view': codemirror_view_import,

  '@milkdown/core': milkdown_core_import,
  '@milkdown/plugin-history': milkdown_plugin_history_import,
  '@milkdown/plugin-indent': milkdown_plugin_indent_import,
  '@milkdown/plugin-trailing': milkdown_plugin_trailing_import,
  '@milkdown/preset-commonmark': milkdown_preset_commonmark_import,
  '@milkdown/preset-gfm': milkdown_preset_gfm_import,
  '@milkdown/theme-nord': milkdown_theme_nord_import
};

for (const pkg in dependencies) {
  if (exports[pkg]) {
    exports[pkg].version = dependencies[pkg];
  }
}

if (typeof globalThis !== 'undefined' && globalThis) globalThis.exports = exports;
if (typeof self !== 'undefined' && self) self.exports = exports;
if (typeof window !== 'undefined' && window) window.exports = exports;
if (typeof module !== 'undefined' && module?.exports) module.exports = exports;

export default exports;