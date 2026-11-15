/** Optional offline asset acquisition — run in a network-enabled developer checkout.
 * This downloads already-source-credited photos only, no scraping or generation.
 * `node scripts/prefetch-discovery-photos.mjs --fetch`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import catalog from '../src/data/discoveries.js';
const enabled = process.argv.includes('--fetch');
const directory = new URL('../public/art/discoveries/', import.meta.url);
if (!enabled) {
  process.stdout.write('DRY RUN: would fetch six credited real photographs into public/art/discoveries/. No network requests were made.\n');
} else {
  await mkdir(directory, { recursive: true });
  const results = [];
  for (const entry of catalog) {
    const { url, filename } = entry.image;
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`${entry.id}: photo HTTP ${response.status}`);
    const type = response.headers.get('content-type') || '';
    if (!/^image\/(jpeg|png|webp)(;|$)/i.test(type)) throw new Error(`${entry.id}: unexpected content-type ${type}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 2_000 || bytes.length > 10_000_000) throw new Error(`${entry.id}: unexpected image size ${bytes.length}`);
    await writeFile(new URL(filename, directory), bytes);
    results.push(`${filename} (${Math.round(bytes.length/1024)} KB)`);
  }
  process.stdout.write(`Downloaded ${results.length} photographic assets:\n${results.join('\n')}\n`);
}
