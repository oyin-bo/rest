// @ts-check

/**
 * @param {(updates: { [fileName: string]: string | null }) => void} update
 */
export function loadDependencies(update) {

  /**
   * @type {Map<string, string[] | Promise<string[]>>}
   */
  const cache = new Map();

  return queueLoad;

  /** @param {string} path */
  async function queueLoad(path) {
    let packageName = path.startsWith('@') ? path.split('/', 2).join('/') : path.split('/', 1)[0];
    const prefixMatch = /^([a-z\.\-]+):/i.exec(packageName);
    if (prefixMatch) packageName = packageName.slice(prefixMatch[1].length + 1);

    if (path === packageName) return;

    let packageCache;
    if (cache.has(packageName)) {
      packageCache = await cache.get(packageName);
    } else {
      const loadPackagePromise = queueLoadPackage(packageName);
      cache.set(packageName, loadPackagePromise);
      packageCache = await loadPackagePromise;
    }

    if (!packageCache) return;

    const localPath = path.slice(packageName.length);
    if (packageCache.indexOf(localPath) < 0) return;

    const fileContent = await fetch(`https://unpkg.com/${path}`, { cache: 'force-cache' }).then(
      x =>
        x.status === 200 ? x.text() : undefined);

    if (!fileContent) return;

    packageCache.splice(packageCache.indexOf(localPath), 1);

    update({ [path]: fileContent });

  }

  async function queueLoadPackage(packageName) {
    const packageDir = await fetch(`https://unpkg.com/${packageName}/?meta`, { cache: 'force-cache' }).then(
      x =>
        x.status === 200 ? x.json() : undefined);

    if (!packageDir) return [];

    /** @type {string[]} */
    const unfetchedFiles = [];
    visit(packageDir);

    cache.set(packageName, unfetchedFiles);

    return unfetchedFiles;

    /** 
     * @typedef {{ path: string, type: 'file' } | { path: string, type: 'directory', files: PackageEntry[] }} PackageEntry
     */
    /** @param {PackageEntry} entry */
    function visit(entry) {
      if (entry.type === 'file') {
        unfetchedFiles.push(entry.path);
      } else if (entry.type === 'directory') {
        entry.files.forEach(visit);
      }
    }
  }
}