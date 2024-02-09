// @ts-check

export function build() {
  const fs = require('fs');
  const path = require('path');

  const copyFiles = ['index.html', 'README.md'];
  const srcDir = path.resolve(__dirname, '..');
  const distDir = path.resolve(__dirname, '..', 'dist');
  process.stdout.write(`Copying files from ${srcDir} to ${distDir}...`);
  for (const fi of copyFiles) {
    process.stdout.write(`  ${fi}..`);
    fs.copyFileSync(path.join(srcDir, fi), path.join(distDir, fi));
    process.stdout.write(`.`);
  }
  fs.copyFileSync(path.join(srcDir, 'index.html'), path.join(distDir, '404.html'));
  console.log(' OK.');
}
