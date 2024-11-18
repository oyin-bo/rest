// @ts-check

/**
 * Firstly, check if this composite is single-line or multi-line.
 * Single-line contains only primitive values and Date instances, strings are short.
 * Single-line that's too long is not allowed.
 * 
 * Multi-line composites will be either:
 *  a) fully collapsed, and displayed as single line with abbreviated content
 *  b) partially expanded, the expansion size is preserved in state
 *  c) fully expanded
 *
 * If state contains a selection for expand-collapse state, use that.
 *
 * If the budget availableSize is 1 or below, the composite is collapsed.
 *
 * If the number of entries is within the budget availableSize, the composite is fully expanded.
 *
 * Otherwise, we have a partial expanded state.
 *  1) Pass over primitive values and see if they can fit within the budget availableSize. If it's too much, we collapse the rest.
 *  2) If there's spare space after primitive values, we start rendering non-primitive values providing them the rest of the budget.
 *
 * @param {import('.').ValueRenderParams<any[]>} params
 */
export function renderComposite(params) {
  const { value, path, indent: originialIndent, wrap, invalidate, state } = params;


}
