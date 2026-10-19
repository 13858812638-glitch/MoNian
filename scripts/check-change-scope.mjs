/** Approved maintenance deltas: frozen modular.3 bytes remain independently verifiable. */
import fs from 'node:fs';
import crypto from 'node:crypto';
export const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
export function validateMaintenanceScope(){
 const manifest=JSON.parse(fs.readFileSync('docs/APPROVED_CHANGES.json','utf8'));
 const failures=[];
 const frozen=JSON.parse(fs.readFileSync('baseline/modular.3-source-manifest.json','utf8'));
 const approved=new Map(manifest.files.map(row=>[row.file,row]));
 const retired=new Map((manifest.retiredFiles||[]).map(row=>[row.file,row]));
 const renamed=new Map((manifest.renamedFiles||[]).map(row=>[row.from,row]));
 // Added modules require an explicit path + byte hash; do not relax the scope
 // gate to permit arbitrary future source additions.
 const added=new Map((manifest.addedFiles||[]).map(row=>[row.file,row]));
 const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
 const known=new Set([...frozen.files.map(row=>row.file),...renamed.values().map(row=>row.to)]);
 for(const file of walk('src'))if(!known.has(file)&&!added.has(file))failures.push({check:'unreviewed-new-source',file});
 for(const [file,row] of added){if(!fs.existsSync(file)||sha256(fs.readFileSync(file))!==row.sha256)failures.push({check:'unapproved-added-source',file});}
 for(const [file,row] of retired){
  const original=frozen.files.find(item=>item.file===file);
  if(!original||original.sha256!==row.frozenSha256||fs.existsSync(file))
   failures.push({check:'unauthorized-source-retirement',file});
 }
 for(const row of frozen.files){
  if(retired.has(row.file)||renamed.has(row.file))continue;
  const expected=approved.get(row.file)?.after||row.sha256;
  if(!fs.existsSync(row.file)||sha256(fs.readFileSync(row.file))!==expected)
   failures.push({check:'whole-source-scope',file:row.file});
 }
 for(const [from,row] of renamed){
  const original=frozen.files.find(item=>item.file===from);
  if(!original||original.sha256!==row.frozenSha256||fs.existsSync(from)
    ||!fs.existsSync(row.to)||sha256(fs.readFileSync(row.to))!==row.after)
   failures.push({check:'unauthorized-source-rename',from,to:row.to});
 }
 for(const row of manifest.files){
  const source=fs.readFileSync(row.file);const original=fs.readFileSync(row.baseline);
  if(sha256(original)!==row.before)failures.push({check:'modular3-frozen-hash',file:row.baseline});
  if(sha256(source)!==row.after)failures.push({check:'unreviewed-maintenance-change',file:row.file});
 }
 return {manifest,failures};
}
