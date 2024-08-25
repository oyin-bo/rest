// @ts-check

import { Node, NodeRange, Slice } from '@milkdown/prose/model';
import { AllSelection, EditorState, NodeSelection, TextSelection } from '@milkdown/prose/state';
import { getModifiersTextSection } from '../unicode-styles/get-modifiers-text-selection';

/**
 * @typedef {{
 *  node: Node,
 *  nodePos: number,
 *  text: string,
 *  lead?: string,
 *  trail?: string,
 *  parsed?: import('../unicode-styles/create-unicode-formatter-parser').ParsedList,
 *  affectLead?: number,
 *  affectTrail?: number
 * }} NodeModifierState
 */

/**
 * @param {EditorState} editorState 
 */
export function getSelectionModifiersForDocument(editorState) {

  /**
   * @type {NodeModifierState[]}
   */
  const nodesWithText = [];
  let wholeText = '';
  const allModifiers = [];

  editorState.doc.nodesBetween(
    editorState.selection.from,
    editorState.selection.to,
    (node, pos, parent, index) => {
      if (!node.isLeaf) {
        if (node.isBlock && nodesWithText.length && nodesWithText[nodesWithText.length - 1]?.text !== '\n') nodesWithText.push({ node, nodePos: pos, text: '\n' });
        return;
      }

      const lead = pos >= editorState.selection.from ? undefined :
        node.textBetween(0, editorState.selection.from - pos);

      const trail = pos + node.nodeSize <= editorState.selection.to ? undefined :
        node.textBetween(editorState.selection.to - pos, node.nodeSize);

      const text = node.textBetween(
        pos >= editorState.selection.from ? 0 : editorState.selection.from - pos,
        pos + node.nodeSize <= editorState.selection.to ? node.nodeSize : editorState.selection.to - pos);

      wholeText += (lead || '') + text + (trail || '');
      const nodeModifiers = getModifiersTextSection(wholeText, lead?.length || 0, (lead?.length || 0) + text.length);
      if (nodeModifiers?.parsed) {
        for (const entry of nodeModifiers.parsed) {
          if (entry && typeof entry !== 'string') {
            for (const mod of entry.modifiers) {
              if (allModifiers.indexOf(mod) < 0) {
                allModifiers.push(mod);
              }
            }
          }
        }

      }

      const affectLead = !nodeModifiers || !lead ? undefined :
        lead.length - nodeModifiers.start;

      const affectTrail = !nodeModifiers || !trail ? undefined :
        nodeModifiers.end - ((lead?.length || 0) + text.length);

      nodesWithText.push({
        node,
        nodePos: pos,
        text,
        lead,
        trail,
        parsed: nodeModifiers?.parsed,
        affectLead: affectLead && affectLead > 0 ? affectLead : undefined,
        affectTrail: affectTrail && affectTrail > 0 ? affectTrail : undefined
      });
    });

  return {
    spans: nodesWithText,
    modifiers: allModifiers
  };

}