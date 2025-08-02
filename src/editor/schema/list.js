// @ts-check
import { schema } from "./schema-gen.js";

export const listSchema = {
  group: "block",
  content: "list-item+",
  attrs: { ordered: { default: false }, start: { default: 1 } },
  parseDOM: [
    { tag: "ol", attrs: { ordered: true } },
    { tag: "ul", attrs: { ordered: false } }
  ],
  /**
   * @param {import('prosemirror-model').Node} node
   * @returns {import('prosemirror-model').DOMOutputSpec}
   */
  toDOM(node) {
    return [node.attrs.ordered ? "ol" : "ul", node.attrs.ordered ? { start: node.attrs.start } : {}, 0];
  }
};

/**
 * @param {import('micromark-util-types').Token} token
 * @param {object} state
 * @returns {import('prosemirror-model').Node}
 */
export function parseMarkdownList(token, state) {
  const ordered = token.type === "listOrdered";
  const start = token.start || 1;
  return schema.nodes.list.create({ ordered, start }, state.parseBlock(token.children));
}

/**
 * @param {import('prosemirror-model').Node} node
 * @param {object} state
 */
export function toMarkdownList(node, state) {
  state.write(node.attrs.ordered ? "1. " : "- ");
  state.renderBlock(node);
  state.write("\n");
}
