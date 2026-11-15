/**
 * Localize the five NASA photo URLs on the optional SMP-NormalPics branch.
 * Use: node scripts/cache-normal-pics.mjs
 * Source & usage notes: public/art/NORMAL-PICS-SOURCES.md
 * No external packages, API keys, or NASA credentials required.
 */
import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const cssPath = join(root, 'src/ui/v4/normal-pics.css');
const dest = join(root, 'public/art/normal-pics');
const photos = [
  ['earth-globe.jpg', 'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/1000/1133/AS17-148-22727_lrg.jpg?crop=faces%2Cfocalpoint&fit=clip&h=1881&w=1881'],
  ['mars-globe.jpg', 'https://assets.science.nasa.gov/dynamicimage/assets/science/psd/mars/downloadable_items/3/7/37983_mars-globe-valles-marineris-enhanced.jpg?crop=faces%2Cfocalpoint&fit=clip&h=4798&w=4798'],
  ['saturn.jpg', 'https://science.nasa.gov/wp-content/uploads/2023/05/pia05380-saturn-with-rings-16x9-1.jpg'],
  ['moon-panorama.jpg', 'https://svs.gsfc.nasa.gov/vis/a000000/a004300/a004302/panorama_print.jpg'],
  ['mars-panorama.jpg', 'https://assets.science.nasa.gov/dynamicimage/assets/science/psd/mars/resources/detail_files/2/6/26064_PIA24744-web.jpg?crop=faces%2Cfocalpoint&fit=clip&h=636&w=1600'],
];
const maxBytes = 10_000_000;
async function main() {
  const original = await readFile(cssPath, 'utf8');
  let next = original;
  await mkdir(dest, { recursive: true });
  const stage = [];
  try {
    for (const [file,url] of photos) {
      if (!url.startsWith('https://') || !new URL(url).hostname.match(/(^|\.)(nasa\.gov)$/)) throw new Error('Non-NASA source: '+url);
      if (!original.includes(url) && !original.includes('/art/normal-pics/'+file)) throw new Error('CSS missing source '+file);
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect:'follow' });
      if (!res.ok) throw new Error(file+': HTTP '+res.status);
      const type = (res.headers.get('content-type') || '').toLowerCase();
      if (!type.startsWith('image/jpeg') && !type.startsWith('image/jpg') && !type.startsWith('image/png')) throw new Error(file+': non-image content '+type);
      const data = Buffer.from(await res.arrayBuffer());
      if (data.length < 2_000 || data.length > maxBytes) throw new Error(file+': invalid size '+data.length);
      const isJpeg = data[0]===0xff && data[1]===0xd8 && data[2]===0xff;
      if (!isJpeg) throw new Error(file+': expected JPEG bytes');
      const temp = join(dest, file+'.part');
      await writeFile(temp,data);
      stage.push([temp, join(dest,file)]);
      next = next.replaceAll(url, '/art/normal-pics/'+file);
      process.stdout.write(`Downloaded ${file}: ${(data.length/1024).toFixed(0)} KB\n`);
    }
    for(const [temp,file] of stage) await rename(temp,file);
    await writeFile(cssPath,next);
    process.stdout.write('All 5 images cached; CSS now references local files. Review rights ledger before committing.\n');
  } catch(err) {
    await Promise.all(stage.map(([temp])=>rm(temp,{force:true})));
    throw err;
  }
}
main().catch(err=>{ console.error('Photo cache failed:',err.message);process.exitCode=1; });
