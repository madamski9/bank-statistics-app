import { mkdirSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const chrome = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const root = resolve(import.meta.dir, '..');
const panels = ['overview', 'transactions', 'spending', 'report', 'limits', 'privacy'];
const languages = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['pl', 'en'];

const servedDirectories = [join(root, 'app-store'), join(root, 'website/screenshots')];

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch(request) {
    const path = resolve(root, `.${decodeURIComponent(new URL(request.url).pathname)}`);
    if (!servedDirectories.some((directory) => path.startsWith(directory + sep))) {
      return new Response('Forbidden', { status: 403 });
    }
    const file = Bun.file(path);
    return file.size > 0 ? new Response(file) : new Response('Not found', { status: 404 });
  },
});

try {
  for (const language of languages) {
    const outputDirectory = join(root, 'app-store/screenshots', language);
    mkdirSync(outputDirectory, { recursive: true });

    for (const [index, panel] of panels.entries()) {
      const output = join(outputDirectory, `${String(index + 1).padStart(2, '0')}-${panel}.png`);
      const url = `${server.url}app-store/screenshots/index.html?panel=${index}&lang=${language}`;
      const chromeProcess = Bun.spawn([
        chrome,
        '--headless=new',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        '--enable-unsafe-swiftshader',
        '--window-size=1320,2868',
        '--virtual-time-budget=20000',
        `--screenshot=${output}`,
        url,
      ], { stdout: 'ignore', stderr: 'pipe', timeout: 120_000 });

      if ((await chromeProcess.exited) !== 0) {
        throw new Error(`Rendering ${panel} (${language}) failed: ${await new Response(chromeProcess.stderr).text()}`);
      }

      console.log(output);
    }
  }
} finally {
  server.stop(true);
}
