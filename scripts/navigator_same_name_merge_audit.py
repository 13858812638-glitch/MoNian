"""End-to-end same-name rename/merge on simulated Obsidian vault; no real user files.
Verifies target data preserved and source not silently discarded.
"""
import json,os,shutil,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent;os.chdir(root)
results=[]
steps={
'folder':r'''async()=>{
 const rows=[];const ck=(ok,name,value)=>{rows.push({name,ok:!!ok,value});if(!ok)throw Error(name+':'+JSON.stringify(value))};
 await H.app.vault.create('资料/周报.md','# 目标中的同名文件');
 const original=H.store.get('资料/周报.md').content;
 const started=C.facets.runSidebarMaintenance('folder','rename',{path:'项目',mergeExisting:true});
 ck(!!C._confirmSession,'folder rename opens original confirmation',!!C._confirmSession);
 const input=document.querySelector('.local-search-dialog-input');ck(!!input,'rename input exists');
 input.value='资料';input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 await waitFixture(600);await P._flushIndexQueueNow();
 ck(!H.store.has('项目'),'source folder removed only after children moved');
 ck(H.store.has('资料/周报.md')&&H.store.get('资料/周报.md').content.includes(original),'existing target content preserved',{existing:H.store.get('资料/周报.md')?.content, paths:[...H.store.keys()],events:H.trace.filter(x=>['rename','delete','notice'].includes(x.type)).slice(-16)});
 ck(H.store.has('资料/周报-文件重名.md'),'name collision kept via unique file name');
 ck(H.store.has('资料/排期.md'),'nonconflicting child moved');
 ck(!H.store.has('项目/周报.md')&&!H.store.has('项目/排期.md'),'no source file lost or left behind');
 ck(!H.trace.some(x=>x.type==='notice'&&String(x.value).includes('目标路径已被占用')),'no collision failure');
 return rows;
}''',
'property':r'''async()=>{
 const rows=[];const ck=(ok,name,value)=>{rows.push({name,ok:!!ok,value});if(!ok)throw Error(name+':'+JSON.stringify(value))};
 const file=H.store.get('资料/鞋垫方案.md');
 const before=H.metadata.get(file.path).frontmatter;
 ck(before['所属项目']==='卫康'&&JSON.stringify(before['项目负责人'])==='["张"]','two original properties present',before);
 await P.renameVaultPropertyKey('项目负责人','所属项目',{}, {mergeExisting:true});
 const after=H.metadata.get(file.path).frontmatter;
 ck(!Object.hasOwn(after,'项目负责人'),'old key removed after merge',after);
 ck(Array.isArray(after['所属项目'])&&after['所属项目'].includes('卫康')&&after['所属项目'].includes('张'),'both existing and incoming values preserved',after);
 ck(!H.trace.some(x=>x.type==='notice'&&String(x.value).includes('已存在')),'no collision failure');
 return rows;
}''',
'value':r'''async()=>{
 const rows=[];const ck=(ok,name,value)=>{rows.push({name,ok:!!ok,value});if(!ok)throw Error(name+':'+JSON.stringify(value))};
 const file=H.store.get('资料/鞋垫方案.md');
 await H.app.fileManager.processFrontMatter(file,fm=>fm['项目负责人']=['张','李','张']);
 await P._flushIndexQueueNow();
 await P.renameVaultPropertyValue('项目负责人','张','李','multitext');
 const after=H.metadata.get(file.path).frontmatter['项目负责人'];
 ck(Array.isArray(after)&&after.length===1&&after[0]==='李','same-name property values deduplicate without loss',after);
 return rows;
}''',
'tag':r'''async()=>{
 const rows=[];const ck=(ok,name,value)=>{rows.push({name,ok:!!ok,value});if(!ok)throw Error(name+':'+JSON.stringify(value))};
 const file=H.store.get('资料/鞋垫方案.md');
 await H.app.fileManager.processFrontMatter(file,fm=>fm.tags=['运动','图片','运动/子标签']);
 await P._flushIndexQueueNow();
 const pre=H.metadata.get(file.path).frontmatter.tags;
 ck(pre.includes('运动')&&pre.includes('图片'),'source and destination tags present',pre);
 await P.migrateVaultTagTreePrefix('运动','图片',{mergeExisting:true});
 const after=H.metadata.get(file.path).frontmatter.tags;
 ck(after.includes('图片')&&after.includes('图片/子标签'),'target hierarchy absorbs source and child',after);
 ck(!after.includes('运动')&&!after.includes('运动/子标签'),'source labels removed',after);
 ck(after.filter(x=>x==='图片').length===1,'shared target label deduplicated',after);
 return rows;
}'''
}
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-sandbox'])
 for key,js in steps.items():
  ctx=b.new_context(viewport={'width':1080,'height':800},locale='zh-CN');page=ctx.new_page();errs=[]
  page.on('pageerror',lambda e:errs.append(str(e)))
  try:
   page.set_content('<html><body class="theme-dark"><div id="host"></div></body></html>')
   for fn in ['tests/browser-fixture.css','src/styles/styles.css']:page.add_style_tag(content=(root/fn).read_text())
   for fn in ['tests/host.js','tests/browser-scenarios.js']:page.add_script_tag(content=(root/fn).read_text())
   page.evaluate('m=>bootFixture(m)',False);page.add_script_tag(content=(root/'tests/generated/subject.cjs').read_text())
   page.evaluate('startFixture()')
   checks=page.evaluate(js);results.append({'scenario':key,'checks':checks,'pageErrors':errs});print(key,len(checks),'PASS',flush=True)
  except Exception as e:results.append({'scenario':key,'error':str(e),'pageErrors':errs});print(key,'FAIL',str(e)[:900],flush=True)
  finally:ctx.close()
 b.close()
out=root/'reports/current/navigator-unified-actions';out.mkdir(parents=True,exist_ok=True);(out/'merge-integration.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print('TOTAL',sum(len(x.get('checks',[])) for x in results),'FAIL',sum(bool(x.get('error') or x.get('pageErrors')) for x in results))
sys.exit(1 if any(x.get('error') or x.get('pageErrors') for x in results) else 0)
