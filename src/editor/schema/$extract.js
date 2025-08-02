// @ts-check
// Node.js script to extract all keys and structure from the fully-augmented TokenTypeMap type
// using the TypeScript compiler API. This will include all micromark extensions.

const fs = require('fs');
const path = require('path');
const os = require('os');
const ts = require('typescript');

/** List of micromark extension typings to import for augmentation */
const extensionTypings = [
  // Add or remove extensions as needed for your project
  'micromark-extension-gfm',
  'micromark-extension-gfm-autolink-literal',
  'micromark-extension-gfm-footnote',
  'micromark-extension-gfm-strikethrough',
  'micromark-extension-gfm-table',
  'micromark-extension-gfm-task-list-item',
  'micromark-extension-math',
  'micromark-extension-frontmatter',
  'micromark-extension-directive',
  // Add more as needed
];

/**
 * Generate a temporary TypeScript file that imports all typings and exports TokenTypeMap
 */
function generateTempTsFile() {
  const lines = [];
  lines.push("import type { TokenTypeMap } from 'micromark-util-types';");
  for (const ext of extensionTypings) {
    lines.push(`import '${ext}';`);
  }
  lines.push('type __Extracted = TokenTypeMap;');
  lines.push('export type { __Extracted };');
  return lines.join('\n');
}

/**
 * @param {string} tsFilePath
 */
function extractTokenTypeMapKeys(tsFilePath) {
  // Create a TypeScript program
  const program = ts.createProgram([tsFilePath], {
    allowJs: false,
    declaration: false,
    emitDeclarationOnly: false,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    esModuleInterop: true,
    skipLibCheck: true,
    types: [],
    jsx: ts.JsxEmit.Preserve,
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(tsFilePath);
  if (!source) throw new Error('Failed to load temp TypeScript file');

  // Find the exported __Extracted type
  let extractedType = null;
  ts.forEachChild(source, node => {
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const spec of node.exportClause.elements) {
        if (spec.name.text === '__Extracted') {
          // Find the type alias declaration
          for (const stmt of source.statements) {
            if (ts.isTypeAliasDeclaration(stmt) && stmt.name.text === '__Extracted') {
              extractedType = checker.getTypeFromTypeNode(stmt.type);
            }
          }
        }
      }
    }
  });
  if (!extractedType) {
    // Fallback: try to find the type alias directly
    for (const stmt of source.statements) {
      if (ts.isTypeAliasDeclaration(stmt) && stmt.name.text === '__Extracted') {
        extractedType = checker.getTypeFromTypeNode(stmt.type);
      }
    }
  }
  if (!extractedType) throw new Error('Could not find __Extracted type');

  /**
   * Recursively extract the structure of the type
   * @param {ts.Type} type
   */

  /**
   * @param {ts.Type} type
   * @param {ts.Node} nodeForLocation
   */
  function extractType(type, nodeForLocation) {
    if (type.isUnion()) {
      return type.types.map(t => extractType(t, nodeForLocation));
    }
    if (type.isIntersection()) {
      return type.types.map(t => extractType(t, nodeForLocation));
    }
    if (type.isClassOrInterface() || (type.flags & ts.TypeFlags.Object)) {
      const props = {};
      for (const prop of type.getProperties()) {
        const propType = checker.getTypeOfSymbolAtLocation(prop, nodeForLocation);
        props[prop.getName()] = extractType(propType, nodeForLocation);
      }
      return props;
    }
    if ((type.flags & ts.TypeFlags.String) !== 0) return 'string';
    if ((type.flags & ts.TypeFlags.Number) !== 0) return 'number';
    if ((type.flags & ts.TypeFlags.Boolean) !== 0) return 'boolean';
    if ((type.flags & ts.TypeFlags.StringLiteral) !== 0) return /** @type {import('typescript').LiteralType} */ (type).value;
    if ((type.flags & ts.TypeFlags.NumberLiteral) !== 0) return /** @type {import('typescript').LiteralType} */ (type).value;
    if ((type.flags & ts.TypeFlags.BooleanLiteral) !== 0) return /** @type {import('typescript').LiteralType} */ (type).value;
    if ((type.flags & ts.TypeFlags.Any) !== 0) return 'any';
    if ((type.flags & ts.TypeFlags.Unknown) !== 0) return 'unknown';
    if ((type.flags & ts.TypeFlags.Void) !== 0) return 'void';
    if ((type.flags & ts.TypeFlags.Null) !== 0) return 'null';
    if ((type.flags & ts.TypeFlags.Undefined) !== 0) return 'undefined';
    if (type.symbol && type.symbol.name && type.symbol.name !== '__type') return type.symbol.name;
    return 'unknown';
  }

  // Find a valid node for location: use the type alias node
  let typeAliasNode = null;
  for (const stmt of source.statements) {
    if (ts.isTypeAliasDeclaration(stmt) && stmt.name.text === '__Extracted') {
      typeAliasNode = stmt;
      break;
    }
  }
  if (!typeAliasNode) throw new Error('Could not find type alias node for __Extracted');
  return extractType(extractedType, typeAliasNode);
}

function main() {
  // Write the temp TypeScript file
  const tempFile = path.join(__dirname, '$refs.ts');
  fs.writeFileSync(tempFile, generateTempTsFile(), 'utf8');

  const result = extractTokenTypeMapKeys(tempFile);
  // Output as JSON
  console.log(
    tempFile + ' ', result
  );
}

function toProseMirrorNodeSpec(name, def) {
  // Heuristic: block nodes if they have children, otherwise inline
  const isBlock = def && typeof def === 'object' && Object.keys(def).length > 0;
  return `  "${name}": {
    group: "${isBlock ? 'block' : 'inline'}",
    content: ${isBlock ? '"inline*"' : 'null'},
    toDOM() { return ["${name}", 0]; },
    parseDOM: [{ tag: "${name}" }]
  }`;
}

function main() {
  // Write the temp TypeScript file
  const tempFile = path.join(__dirname, '$refs.ts');
  fs.writeFileSync(tempFile, generateTempTsFile(), 'utf8');

  const result = extractTokenTypeMapKeys(tempFile);

  // Generate nodeSpecs
  let nodeSpecsStr = Object.entries(result)
    .map(([name, def]) => toProseMirrorNodeSpec(name, def))
    .join(',\n');

  const schemaFile = path.join(__dirname, 'schema-gen.js');
  const fileContent =
    `
// @ts-check
// This file is auto-generated from $extract.js.
// To regenerate, run $extract.js
const { Schema } = require('prosemirror-model');
const nodeSpecs = {
  ${nodeSpecsStr}
};

const schema = new Schema({
  nodes: nodeSpecs,
  marks: { }
});

module.exports = { schema, nodeSpecs };
`;
  fs.writeFileSync(schemaFile, fileContent, 'utf8');
  console.log(`Wrote ProseMirror schema to ${schemaFile}`);
}

if (require.main === module) {
  main();
}