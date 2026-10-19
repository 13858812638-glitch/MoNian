/** Optional standard esbuild build. NOT executed successfully in the delivery environment.
 * The reproducible delivered artifact uses `npm run build` (offline TypeScript linker).
 * Install esbuild@0.25.10 separately to evaluate this alternative; output is kept separate.
 */
import fs from 'node:fs';
let esbuild;
try { esbuild = await import('esbuild'); }
catch { console.error('esbuild is unavailable. The pinned offline build is: npm run build. This alternative is NOT a validated delivery build.'); process.exit(2); }
if(esbuild.version!=='0.25.10')throw new Error('This optional config expects esbuild 0.25.10.');
await esbuild.build({entryPoints:['src/main.js'],bundle:true,format:'cjs',platform:'browser',target:'es2021',external:['obsidian','electron'],outfile:'dist-esbuild/main.js',minify:false,keepNames:true,sourcemap:'external',treeShaking:false,footer:{js:'module.exports = module.exports.default;'},banner:{js:'/* Optional esbuild output: run all A/B tests against this target before installation. */'}});
fs.copyFileSync('src/styles/styles.css','dist-esbuild/styles.css');
