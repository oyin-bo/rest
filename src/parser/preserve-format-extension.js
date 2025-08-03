// @ts-check

/**
 * Micromark extension to preserve formatting details.
 * This extension is currently a no-op, as the logic is handled
 * in the mdast-util-from-markdown extension.
 * @returns {import('micromark-util-types').Extension}
 */
export function preserveFormat() {
  return {
    // This can be extended later if needed for token-level manipulation.
  };
}
