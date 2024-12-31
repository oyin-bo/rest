// this is necessary for a) offshoot of Markdown parser b) ProseMirror-view packages to work in Node.js

if (typeof document === 'undefined') {
  document = /** @type {*} 2024-12-31 */(
    {
      documentElement: { style: {} },
      createElement: () => {
        document = undefined;
      }
    }
  );
}
