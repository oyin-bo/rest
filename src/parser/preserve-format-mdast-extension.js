// @ts-check

/**
 * @returns {import('mdast-util-from-markdown').Extension}
 */
export function preserveFormatMdast() {
  return {
    enter: {
      atxHeadingSequence: function (token) {
        const parent = this.stack[this.stack.length - 1];
        if (parent && parent.type === 'heading') {
          parent.data = parent.data || {};
          parent.data.marker = this.sliceSerialize(token);
        }
      },
      emphasisSequence: function (token) {
        const parent = this.stack[this.stack.length - 1];
        if (parent.type === 'emphasis') {
          parent.data = parent.data || {};
          parent.data.marker = this.sliceSerialize(token);
        }
      },
      strongSequence: function (token) {
        const parent = this.stack[this.stack.length - 1];
        if (parent.type === 'strong') {
          parent.data = parent.data || {};
          parent.data.marker = this.sliceSerialize(token);
        }
      },
      listItemMarker: function (token) {
        const parent = this.stack[this.stack.length - 1];
        if (parent.type === 'listItem') {
          parent.data = parent.data || {};
          parent.data.marker = this.sliceSerialize(token);
        }
      },
      whitespace: function (token) {
        const parent = this.stack[this.stack.length - 1];
        if (parent.type === 'heading') {
          parent.data = parent.data || {};
          parent.data.whitespace = this.sliceSerialize(token);
        }
      }
    },
    transforms: [
      function (tree) {
        // @ts-ignore
        for (const node of tree.children) {
          if (node.type === 'paragraph') {
            const newChildren = [];
            // @ts-ignore
            for (const child of node.children) {
              if (child.type === 'text' && child.value.includes('\n')) {
                const parts = child.value.split('\n');
                for (let i = 0; i < parts.length; i++) {
                  if (parts[i]) {
                    newChildren.push({ type: 'text', value: parts[i] });
                  }
                  if (i < parts.length - 1) {
                    // @ts-ignore
                    newChildren.push({ type: 'break' });
                  }
                }
              } else {
                newChildren.push(child);
              }
            }
            // @ts-ignore
            node.children = newChildren;
          }
        }
      }
    ]
  };
}

