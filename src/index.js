// @ts-check

import { initCodeMirror } from './editor';

/** @type {import('codemirror').EditorView} */
export var cmView;

if (typeof window !== 'undefined' && typeof window?.alert === 'function') initCodeMirror();
