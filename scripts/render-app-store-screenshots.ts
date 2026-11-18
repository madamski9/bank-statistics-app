import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const chrome = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const root = resolve(import.meta.dir, '..');
const template = join(root, 'app-store/screenshots/index.html');
const shots = ['overview', 'transactions', 'spending', 'report', 'limits', 'privacy'];
const languages = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['pl', 'en'];

for (const language of languages) {
  const outputDirectory = join(root, 'app-store/screenshots', language);
  mkdirSync(outputDirectory, { recursive: true });

  for (const [index, shot] of shots.entries()) {
    const output = join(outputDirectory, `${String(index + 1).padStart(2, '0')}-${shot}.png`);
    const url = `${pathToFileURL(template).href}?shot=${shot}&lang=${language}`;
    const result = Bun.spawnSync([
      chrome,
      '--headless=new',
      '--hide-scrollbars',
      '--allow-file-access-from-files',
      '--force-device-scale-factor=1',
      '--window-size=1320,2868',
      '--virtual-time-budget=4000',
      `--screenshot=${output}`,
      url,
    ]);

    if (result.exitCode !== 0) {
      throw new Error(`Rendering ${shot} (${language}) failed: ${result.stderr.toString()}`);
    }

    console.log(output);
  }
}
