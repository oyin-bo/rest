// @ts-check

import { Transaction } from '@milkdown/prose/state';

/**
 * @typedef {{
 *  language: 'JavaScript' | 'TypeScript' | 'JSON' | 'HTTP' | 'SQL' | 'Python' | null,
 *  langSpecified?: string,
 *  code: string,
 *  block: { node: import("prosemirror-model").Node, pos: number },
 *  backtick: { node: import("prosemirror-model").Node, pos: number },
 *  script: { node: import("prosemirror-model").Node, pos: number },
 *  executionState?: { node: import("prosemirror-model").Node, pos: number }
 * }} CodeBlockNodeset
 */

const JS_LANG_REGEX = /^\s*(javascript|js|jsx|jscript|(.*\.(js|mjs|jsx)))\s*$/i;
const TS_LANG_REGEX = /^\s*(typescript|ts|tsx|(.*\.(ts|mts|tsx)))\s*$/i;
const JSON_LANG_REGEX = /^\s*(json|(.*\.(json)))\s*$/i;
const SQL_LANG_REGEX = /^\s*(sql|alasql|(.*\.(sql)))\s*$/i;
const PYTHON_LANG_REGEX = /^\s*(python|(.*\.(py)))\s*$/i;
const HTTP_LANG_REGEX = /^\s*(http|https|rest|url|request)\s*$/i;

/**
 * @param {import("prosemirror-model").Node} doc
 */
export function findCodeBlocks(doc) {
  /** @type {CodeBlockNodeset[]} */
  let codeBlocks = [];

  /** @type {Partial<CodeBlockNodeset> & { block: CodeBlockNodeset['block'] } | undefined} */
  let lastCodeBlock;

  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (node.type.name === 'code_block') {
      if (lastCodeBlock?.backtick && lastCodeBlock?.script) {
        lastCodeBlock.language = deriveLanguage(lastCodeBlock.langSpecified);
        codeBlocks.push(/** @type {CodeBlockNodeset} */(lastCodeBlock));
      }
      lastCodeBlock = { block: { node, pos } };
    } else {
      if (node.isBlock) {
        if (lastCodeBlock &&
          pos > lastCodeBlock.block.pos &&
          pos <= lastCodeBlock.block.pos + lastCodeBlock.block.node.nodeSize) {
          switch (node.type.name) {
            case 'code_block_backtick_language':
              lastCodeBlock.backtick = { node, pos };
              lastCodeBlock.langSpecified = node.textContent;
              break;
            case 'code_block_script':
              lastCodeBlock.script = { node, pos };
              lastCodeBlock.code = node.textContent;
              break;
            case 'code_block_execution_state':
              lastCodeBlock.executionState = { node, pos };
              break;
          }
        }
      }
    }
  });

  if (lastCodeBlock?.backtick && lastCodeBlock?.script) {
    lastCodeBlock.language = deriveLanguage(lastCodeBlock.langSpecified);
    codeBlocks.push(/** @type {CodeBlockNodeset} */(lastCodeBlock));
  }

  return codeBlocks;
}

function deriveLanguage(langSpecified) {
  if (!langSpecified || JS_LANG_REGEX.test(langSpecified))
    return 'JavaScript';
  else if (TS_LANG_REGEX.test(langSpecified))
    return 'TypeScript';
  else if (JSON_LANG_REGEX.test(langSpecified))
    return 'JSON';
  else if (HTTP_LANG_REGEX.test(langSpecified))
    return 'HTTP';
  else if (SQL_LANG_REGEX.test(langSpecified))
    return 'SQL';
  else if (PYTHON_LANG_REGEX.test(langSpecified))
    return 'Python';
  else
    return null;
}

/**
 * @param {{ from: number, to: number }} step
 * @param {ReturnType<typeof findCodeBlocks>} codeBlockNodes
 */
export function findOverlappingCodeBlocks(step, codeBlockNodes) {
  let leading;
  let whollyContained = [];
  let trailing;

  for (let i = 0; i < codeBlockNodes.length; i++) {
    const entry = codeBlockNodes[i];
    if (entry.block.pos > step.to) break; // entry is after the change area

    const entryEnd = entry.block.pos + entry.block.node.nodeSize;

    if (step.from > entryEnd) continue; // entry is before the change area

    if (step.from > entry.block.pos) {
      // code block is leading

      if (step.to < entryEnd) {
        // code block is leading and trailing
        return {
          only: overlap(entry, step),
          leading: undefined,
          trailing: undefined,
          whollyContained: undefined
        };
      } else {
        // code block is only leading
        leading = overlap(entry, step);
      }
    } else {
      // overlap starts from the beginning of the code block
      if (step.to >= entryEnd) {
        // code block is wholly contained
        whollyContained.push(entry);
      } else {
        // code block is trailing
        trailing = overlap(entry, step);
      }
    }

  }

  if (leading || !trailing || whollyContained.length) {
    return {
      only: undefined,
      leading,
      trailing,
      whollyContained
    };
  }

}

/**
 * @param {ReturnType<typeof findCodeBlocks>[0]} entry
 * @param {{ from: number, to: number }} step
 */
function overlap(entry, step) {
  return {
    block: {
      ...entry.block,
      overlap: spanOverlap(step, entry.block.pos, entry.block.node.nodeSize)
    },
    backtick: !entry.backtick ? undefined : {
      ...entry.backtick,
      overlap: spanOverlap(step, entry.backtick.pos, entry.backtick.node.nodeSize)
    },
    script: !entry.script ? undefined : {
      ...entry.script,
      overlap: spanOverlap(step, entry.script.pos, entry.script.node.nodeSize)
    },
    executionState: !entry.executionState ? undefined : {
      ...entry.executionState,
      overlap: spanOverlap(step, entry.executionState.pos, entry.executionState.node.nodeSize)
    }
  };
}

/**
 * @param {{ from: number, to: number }} span
 * @param {number} pos
 * @param {number} size
 */
function spanOverlap(span, pos, size) {
  const commonPos = Math.max(span.from, pos);
  const commonEnd = Math.min(span.to, pos + size);
  if (commonEnd > commonPos ||
    (commonEnd === span.to && span.from >= pos && span.to <= pos + size)) {
    const commonSize = commonEnd - commonPos;
    return {
      pos: commonPos,
      size: commonSize,
      isSignificant: commonSize > size * 0.66 || commonSize >= 3
    };
  }
}

const codeBlocksKey = 'OVERLAPPING_CODE_BLOCKS';

/**
 * @param {Transaction} tr
 * @returns {ReturnType<typeof findCodeBlocks>}
 */
export function getTransactionCodeBlocks(tr) {
  let cached = tr.getMeta(codeBlocksKey);
  if (!cached) {
    cached = findCodeBlocks(tr.docs[0] || tr.doc);
    tr.setMeta(codeBlocksKey, cached);
  }
  return cached;
}
