// @ts-check

import { Node, NodeRange, Slice } from '@milkdown/prose/model';
import { AllSelection, EditorState, NodeSelection, Selection, TextSelection } from '@milkdown/prose/state';
import { getModifiersTextSection } from '../../unicode-formatting/get-modifiers-text-selection';

/**
 * @typedef {{
 *  node: Node,
 *  nodePos: number,
 *  text: string,
 *  lead?: string,
 *  trail?: string,
 *  parsed?: import('../../unicode-formatting/create-unicode-formatter-parser').ParsedList,
 *  affectLead?: number,
 *  affectTrail?: number
 * }} NodeModifierState
 */

/**
 * @param {EditorState} editorState
 * @param {Pick<Selection, 'from' | 'to'>} [selection]
 */
export function getSelectionModifiersForDocument(editorState, selection) {

  /**
   * @type {NodeModifierState[]}
   */
  const nodesWithText = [];
  // let wholeText = '';

  if (!selection) selection = editorState.selection;
  let discardTrailFormattableNodes = false;

  editorState.doc.nodesBetween(
    selection.from,
    selection.to,
    (node, pos) => {
      if (!node.isLeaf) {
        if (node.isBlock && nodesWithText.length && nodesWithText[nodesWithText.length - 1]?.text !== '\n')
          nodesWithText.push({ node, nodePos: pos, text: '\n' });

        // for block nodes, always walk all children regardless
        // (the spurious leafs will be removed after full iteration)
        node.nodesBetween(0, node.content.size, (childNode, childPos) => {
          const adjustEntry = Math.floor((node.nodeSize - node.content.size) / 2);
          if (childNode.isLeaf)
            includeLeafNode(selection, childNode, pos + adjustEntry + childPos);
        });

        return false;
      }

      includeLeafNode(selection, node, pos);
      if (discardTrailFormattableNodes) return false;
    });
  
  // removing spurious leaf nodes and collecrting modifiers
  const allModifiers = [];
  let firstPartial = nodesWithText.findIndex((n, i) => n.affectLead && i + 1 < nodesWithText.length && nodesWithText[i + 1].text);
  if (firstPartial > 0) nodesWithText.splice(0, firstPartial);
  let lastPartial = nodesWithText.findIndex((n, i) => n.affectTrail && i - 1 > 0 && nodesWithText[i - 1].text);
  if (lastPartial > 0) nodesWithText.length = lastPartial + 1;

  for (const nodeData of nodesWithText) {
    if (!nodeData.parsed) continue;
    for (const entry of nodeData.parsed) {
      if (entry && typeof entry !== 'string') {
        for (const mod of entry.modifiers) {
          if (allModifiers.indexOf(mod) < 0) {
            allModifiers.push(mod);
          }
        }
      }
    }
  }

  return {
    spans: nodesWithText,
    modifiers: allModifiers
  };

  /**
   * @param {Pick<Selection, 'from' | 'to'>} selection
   * @param {Node} node
   * @param {number} nodePos
   */
  function includeLeafNode(selection, node, nodePos) {
    if (discardTrailFormattableNodes) return;

    const lead = nodePos >= selection.from ? undefined :
      node.textBetween(0, selection.from - nodePos);

    const trail = nodePos + node.nodeSize <= selection.to ? undefined :
      node.textBetween(selection.to - nodePos, node.nodeSize);

    let text;
    try {
      text = node.textBetween(
        nodePos >= selection.from ? 0 : selection.from - nodePos,
        nodePos + node.nodeSize <= selection.to ? node.nodeSize : selection.to - nodePos);
    } catch (e) {
      text = '';
    }

    const wholeText = (lead || '') + text + (trail || '');
    const nodeModifiers = getModifiersTextSection(wholeText, lead?.length || 0, (lead?.length || 0) + text.length);

    const affectLead = !nodeModifiers || !lead ? undefined :
      lead.length - nodeModifiers.start;

    const affectTrail = !nodeModifiers || !trail ? undefined :
      nodeModifiers.end - ((lead?.length || 0) + text.length);
    
    const hasFormattableContent = nodeModifiers && nodeModifiers.end > nodeModifiers.start;
    const startsBeforeSelectionStart = selection.from > nodePos;
    if (hasFormattableContent && startsBeforeSelectionStart) {
      // all previous spans are too speculative and should be discarded
      nodesWithText.length = 0;
    }

    nodesWithText.push({
      node,
      nodePos: nodePos,
      text,
      lead,
      trail,
      parsed: nodeModifiers?.parsed,
      affectLead: affectLead && affectLead > 0 ? affectLead : undefined,
      affectTrail: affectTrail && affectTrail > 0 ? affectTrail : undefined
    });

    const endsAfterSelectionEnd = selection.to < nodePos + node.nodeSize;
    if (hasFormattableContent && endsAfterSelectionEnd) {
      // all following spans are too speculative and should be discarded
      discardTrailFormattableNodes = true;
    }

  }

}