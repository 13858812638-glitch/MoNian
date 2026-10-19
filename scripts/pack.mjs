/** Actual ZIP writer, with a hard gate against fabricating missing original manifest metadata. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import JSZip from 'jszip';
const mode=process.argv[2];
const outputDir='artifacts';fs.mkdirSync(outputDir,{recursive:true});
const base='GLS-Stability-1-Sidebar-NoKeyboardFollow-1';
const zip=new JSZip();const names=[];const stableDate=new Date('2026-10-15T00:00:00Z');
function add(name,file){const bytes=fs.readFileSync(file);zip.file(name,bytes,{date:stableDate});names.push({name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
let out;
if(mode==='overlay'){
 for(const file of ['main.js','styles.css']){if(!fs.existsSync('dist/'+file))throw Error('Build first: npm run build');add(file,'dist/'+file);}
 out=`${base}-双文件覆盖包.zip`;
}else if(mode==='source'){
 const skip=new Set(['node_modules','artifacts','.git','dist-esbuild','__pycache__','audit']);
 function walk(dir=''){for(const ent of fs.readdirSync(dir||'.',{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const rel=dir?dir+'/'+ent.name:ent.name;if(skip.has(ent.name)||rel==='tests/generated'||rel==='tests/subject-entry.js'||rel==='scripts/browser_smoke.py'||rel==='reports/browser-smoke.png'||rel==='reports/browser-smoke.log'||rel==='reports/browser-process.json'||rel==='reports/package-source.json')continue;if(rel.startsWith('reports/')&&/\.(png|jpe?g|webp|gif|mp4|webm)$/i.test(rel))continue;if(ent.isDirectory())walk(rel);else if(ent.isFile()){if(rel==='manifest.json')throw Error('Source baseline has no manifest: do not silently add one.');add(rel,rel);}}}
 walk();out=`${base}-Source.zip`;
}else if(mode==='install'){
 const i=process.argv.indexOf('--manifest');const file=i>=0?process.argv[i+1]:'baseline/manifest.json';
 if(!file||!fs.existsSync(file)){console.error('BLOCKED: original manifest.json was not in this upload. No complete installation ZIP was created. Supply the exact original via --manifest <path>.');process.exit(2);}
 const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
 for(const field of ['id','name','version','minAppVersion'])if(typeof manifest[field]!=='string'||!manifest[field].trim())throw Error('Invalid original manifest field: '+field);
 if(manifest.id.startsWith('fixture-')||manifest.version==='0.0.0-test')throw Error('A test fixture manifest cannot be used as release identity.');
 add('main.js','dist/main.js');add('styles.css','dist/styles.css');add('manifest.json',file);
 const safe=s=>s.replace(/[\\/:*?"<>|]/g,'_');out=`${safe(manifest.name)}-${safe(manifest.version)}-mobile-sidebar-stability.1-安装包.zip`;
}else{console.error('Usage: node scripts/pack.mjs overlay|source|install [--manifest original-manifest.json]');process.exit(2);}
if(names.some(x=>x.name==='data.json'||x.name.endsWith('/data.json')))throw Error('User data must not be packaged.');
const buffer=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:9},platform:'UNIX'});
const output=path.join(outputDir,out);fs.writeFileSync(output,buffer);
const verified=await JSZip.loadAsync(buffer,{checkCRC32:true});for(const n of names){const bytes=await verified.file(n.name).async('nodebuffer');if(crypto.createHash('sha256').update(bytes).digest('hex')!==n.sha256)throw Error('ZIP payload mismatch: '+n.name);}
const report={mode,file:output,bytes:buffer.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex'),entries:names.length,crc32:'PASS',dataJsonIncluded:false,manifestIncluded:names.some(x=>x.name==='manifest.json'),files:names};
fs.writeFileSync(`reports/package-${mode}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({mode,file:output,bytes:buffer.length,entries:names.length,crc32:'PASS',manifestIncluded:report.manifestIncluded},null,2));
