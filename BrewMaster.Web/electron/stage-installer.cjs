const fs = require('node:fs');
const path = require('node:path');

const releaseDirectory = path.join(__dirname, '..', 'release-desktop');
const downloadDirectory = path.join(__dirname, '..', 'public', 'BrewMaster.Exe');
const installerName = fs.readdirSync(releaseDirectory)
  .find((name) => /^BrewMaster-Setup-.+\.exe$/i.test(name));

if (!installerName) {
  throw new Error(`Instalador BrewMaster não encontrado em ${releaseDirectory}.`);
}

fs.mkdirSync(downloadDirectory, { recursive: true });
fs.copyFileSync(
  path.join(releaseDirectory, installerName),
  path.join(downloadDirectory, 'BrewMaster-Setup.exe'),
);

console.log(`Instalador preparado para download em ${downloadDirectory}.`);
