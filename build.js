// @ts-check
/// <reference types="node" />

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

let updateHTMLTimeout;

/** @type {Parameters<typeof esbuild.build>[0]} */
const baseOptions = {
  //entryPoints: ['lib/index.js'],
  bundle: true,
  sourcemap: true,
  target: 'es6',
  loader: { '.js': 'jsx' },
  format: 'iife',
  //minify: true,
  //logLevel: 'info',
  external: [
    'fs', 'path', 'os',
    'crypto', 'tty', 'tls',
    'events', 'stream',
    'zlib',
    'assert',
    'net', 'http', 'https', 'http2',
    'child_process',
    'module', 'url', 'worker_threads', 'util',
    'node:constants', 'node:buffer', 'node:querystring', 'node:events', 'node:fs', 'node:path', 'node:os',
    'node:crypto', 'node:util', 'node:stream', 'node:assert', 'node:tty', 'node:net', 'node:tls', 'node:http',
    'node:https', 'node:zlib', 'node:http2', 'node:perf_hooks', 'node:child_process', 'node:worker_threads',

    'ws'
  ],
  //outfile: 'libs.js'
};

let lastPrinted = 0;
function printBanner(text) {
  const dt = new Date();
  let bannerText =
    dt.getHours() + ':' + (100 + dt.getMinutes()).toString().slice(1) + ':' + (100 + dt.getSeconds()).toString().slice(1) + ' ' +
    text + ' ';
  while (bannerText.length < 30)
    bannerText += '=';

  if (Date.now() - lastPrinted > 3000) bannerText = '\n' + bannerText;
  if (Date.now() - lastPrinted > 10000) bannerText = '\n' + bannerText;

  console.log(bannerText);
  lastPrinted = dt.getTime();
}

/** @param {{ js: string, css: string, extras: import('esbuild').OutputFile[] }} jsAndCSS */
let coreBuiltResolve = (jsAndCSS) => { };
let coreBuiltPromise = new Promise(resolve => coreBuiltResolve = resolve);

async function updateHTML() {
  clearTimeout(updateHTMLTimeout);
  updateHTMLTimeout = undefined;

  const coreBuilt = await coreBuiltPromise;
  await mainBuiltPromise;

  updateIndexHTML({ core: coreBuilt });
}

const mainIndexHTMLPath = 'src/index.html';
const initHTMLPath = 'src/mode-switcher/init.html';

/**
 * @param {{
 *  core: { js: string, css: string, extras: import('esbuild').OutputFile[] }
 * }} _
 */
function updateIndexHTML({ core }) {
  const srcIndexHTML = fs.readFileSync(path.resolve(__dirname, mainIndexHTMLPath), 'utf8');

  const substitutedIndexHTML = srcIndexHTML.replace(
    /(<link rel="icon"[^>]*>)|(<style[^>]*>\s*\/\*+\s*core\s*styles\s*\*+\/<\/style>)|(<script[^>]*>\s*\/\*+\s*core\s*scripts\s*\*+\/<\/script>)|(<\!--\s*init\s*html\s*--\>)/g,
    (fullMatch, linkMatch, styleMatch, scriptMatch, initHtmlMatch) => {
      // if (linkMatch) return linkMatch.replace(/favicon\.png/, () =>
      //   'data:image/png;base64,' + fs.readFileSync(path.resolve('src/favicon.png'), 'base64'));
      if (styleMatch) return '<' + 'style>' + core.css + '</' + 'style>';
      if (scriptMatch) return '<' + 'script>' + core.js + '</' + 'script>';
      if (initHtmlMatch) return fs.readFileSync(path.resolve(__dirname, initHTMLPath), 'utf8');
      return fullMatch;
    });
  
  fs.writeFileSync(path.resolve(__dirname, 'index.html'), substitutedIndexHTML);

  for (const fi of core.extras) {
    fs.writeFileSync(path.resolve(__dirname, fi.path), fi.contents);
  }

  printBanner(
    'CORE HTML EMBED built:' +
    core.extras.map(fi => '\n   ' + path.relative(__dirname, fi.path) + '[' + fi.contents.length.toLocaleString() + ']').join('') +
    '\n   index.html[' + substitutedIndexHTML.length.toLocaleString() +']');
}

function watchTemplateHTMLs() {
  fs.watchFile(path.resolve(__dirname, mainIndexHTMLPath), () => {
    queueHTMLUpdate();
  });
  fs.watchFile(path.resolve(__dirname, initHTMLPath), () => {
    queueHTMLUpdate();
  });
}

async function buildCoreEmbedLayout(mode) {

  const options = /** @type {typeof baseOptions} */({
    ...baseOptions,
    write: false,
    format: 'iife',
    entryPoints: ['src/core.js'],
    plugins: [
      {
        name: 'post-export',
        /** @param {esbuild.PluginBuild} build */
        setup(build) {
          var longBuildTimeout;
          build.onStart(() => {
            coreBuiltPromise = new Promise(resolve => coreBuiltResolve = resolve);
            clearTimeout(longBuildTimeout);
            longBuildTimeout = setTimeout(() => {
              printBanner('CORE HTML EMBED...');
            }, 1000);
          });
          build.onEnd(result => {
            clearTimeout(longBuildTimeout);
            const coreJSIndex = result.outputFiles?.findIndex(file => file.path.endsWith('core.js')) ?? -1;
            const coreCSSIndex = result.outputFiles?.findIndex(file => file.path.endsWith('core.css')) ?? -1;
            const coreJSEntry = coreJSIndex >= 0 ? result.outputFiles?.[coreJSIndex] : null;
            const coreCSSEntry = coreCSSIndex >= 0 ? result.outputFiles?.[coreCSSIndex] : null;
            if (!coreJSEntry || !coreCSSEntry) {
              printBanner('CORE HTML: EMPTY OUTPUT');
              return;
            }

            queueHTMLUpdate();
            coreBuiltResolve({
              js: coreJSEntry?.text,
              css: coreCSSEntry?.text,
              extras: result.outputFiles?.filter((_x, index) => index !== coreJSIndex && index !== coreCSSIndex) || []
            });
          });
        }
      }
    ],
    outfile: 'core.js'
  });

  if (mode === 'serve' || mode === 'watch') {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    printBanner('WATCHING LIB...');
  } else {
    await esbuild.build(options);
  }
}

let mainBuiltResolve = () => { };
/** @type {Promise<void>} */
let mainBuiltPromise = new Promise(resolve => mainBuiltResolve = resolve);

async function buildMain(mode) {

  const options = {
    ...baseOptions,
    entryPoints: ['src/index.js'],
    outfile: 'index.js',
    plugins: [
      {
        name: 'post-export',
        /** @param {esbuild.PluginBuild} build */
        setup(build) {
          var longBuildTimeout;
          build.onStart(() => {
            mainBuiltPromise = new Promise(resolve => mainBuiltResolve = resolve);
            clearTimeout(longBuildTimeout);
            longBuildTimeout = setTimeout(() => {
              printBanner('SITE...');
            }, 1000);
          });
          build.onEnd(result => {
            clearTimeout(longBuildTimeout);

            mainBuiltResolve();
            printBanner('SITE REBUILD COMPLETE.');
          });
        }
      }]
  };

  if (mode === 'serve') {
    const ctx = await esbuild.context(options);
    const server = await ctx.serve({
      servedir: __dirname,
      fallback: 'index.html'
    });
    await ctx.watch();
    printBanner('SERVING SITE http://' + (server.host === '0.0.0.0' ? 'localhost' : server.host) + ':' + server.port + '/');
  } else if (mode === 'watch') {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    printBanner('WATCHING SITE...');
  } else {
    await esbuild.build(options);
  }
}

function queueHTMLUpdate() {
  clearTimeout(updateHTMLTimeout);
  updateHTMLTimeout = setTimeout(updateHTML, 300);
}

const mode = process.argv.some(arg => /^\-*serve$/i.test(arg)) ? 'serve' :
  process.argv.some(arg => /^\-*watch$/i.test(arg)) ? 'watch' :
    undefined;

buildMain(mode);
buildCoreEmbedLayout(mode);
watchTemplateHTMLs();
