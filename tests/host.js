/* Test-only Obsidian host. No production runtime imports this file.
 * Files, YAML, workspace events and host classes are controlled fixtures, not Obsidian itself.
 */
(function(global) {
 const clone = x => x == null ? x : JSON.parse(JSON.stringify(x));
 function installDom(doc) {
  if (!doc || doc.defaultView.Element.prototype.createEl) return;
  const win=doc.defaultView,P=win.Element.prototype;
  function options(el,o={}) {
   if(typeof o==='string')o={cls:o};
   if(o.cls)el.className=Array.isArray(o.cls)?o.cls.join(' '):o.cls;
   if(o.text!=null)el.textContent=String(o.text);
   if(o.type)el.setAttribute('type',o.type);
   if(o.attr)for(const [k,v]of Object.entries(o.attr))if(v!=null)el.setAttribute(k,String(v));
   return el;
  }
  P.createEl=function(tag,o={},cb){const el=options(this.ownerDocument.createElement(tag),o);if(o?.prepend)this.prepend(el);else this.append(el);cb?.(el);return el;};
  P.createDiv=function(o,cb){return this.createEl('div',o,cb);};P.createSpan=function(o,cb){return this.createEl('span',o,cb);};
  P.empty=function(){this.replaceChildren();return this;};P.setText=function(v){this.textContent=String(v??'');return this;};
  P.addClass=function(...c){this.classList.add(...c.flatMap(x=>String(x).split(/\s+/)).filter(Boolean));return this;};
  P.removeClass=function(...c){this.classList.remove(...c.flatMap(x=>String(x).split(/\s+/)).filter(Boolean));return this;};
  P.addClasses=P.addClass;P.removeClasses=P.removeClass;P.hasClass=function(c){return this.classList.contains(c);};
  P.toggleClass=function(c,on){this.classList.toggle(c,!!on);return this;};
  P.setAttr=function(k,v){if(v==null)this.removeAttribute(k);else this.setAttribute(k,String(v));return this;};
  P.getAttr=function(k){return this.getAttribute(k);};P.setAttrs=function(o){for(const [k,v]of Object.entries(o))this.setAttr(k,v);return this;};
  P.setCssProps=function(o){for(const [k,v]of Object.entries(o))this.style.setProperty(k,String(v));return this;};
  P.setCssStyles=function(o){Object.assign(this.style,o);return this;};
  P.detach=function(){this.remove();};P.show=function(){this.hidden=false;this.style.display='';};P.hide=function(){this.hidden=true;this.style.display='none';};
  P.isShown=function(){return !this.hidden&&this.style.display!=='none';};P.find=function(s){return this.querySelector(s);};P.findAll=function(s){return [...this.querySelectorAll(s)];};
  P.matchParent=function(s){return this.closest(s);};P.on=function(type,selector,fn){this.addEventListener(type,e=>{const t=e.target.closest(selector);if(t&&this.contains(t))fn(e,t);});};
  Object.defineProperty(win.Node.prototype,'win',{get(){return this.ownerDocument?.defaultView||win;},configurable:true});
  Object.defineProperty(win.Node.prototype,'doc',{get(){return this.ownerDocument||doc;},configurable:true});
  global.createDiv=(o)=>options(doc.createElement('div'),o);global.createSpan=(o)=>options(doc.createElement('span'),o);
 }
 function parseScalar(text){const s=text.trim();try{return JSON.parse(s);}catch{}if(s==='true')return true;if(s==='false')return false;if(s==='null'||s==='~')return null;if(/^-?\d+(\.\d+)?$/.test(s))return Number(s);return s.replace(/^['"]|['"]$/g,'');}
 function parseYaml(text){const s=String(text||'').trim();if(!s)return {};try{return JSON.parse(s);}catch{}const out={};for(const line of s.split(/\r?\n/)){const m=line.match(/^([^:#][^:]*):\s*(.*)$/);if(m)out[m[1].trim()]=parseScalar(m[2]);}return out;}
 function frontmatter(text){const m=String(text||'').match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);return m?parseYaml(m[1]):{};}
 function makeHost(config={}) {
  const doc=global.document||null;installDom(doc);const trace=[],resources=[],events=[];const store=new Map(),metadata=new Map(),adapterFiles=new Map();let activeFile=null;
  function traceEvent(type,data){trace.push({type,data:clone(data)});}
  class TFolder {constructor(path=''){this.path=path;this.name=path.split('/').pop()||'';this.children=[];this.parent=null;}}
  class TFile {constructor(path,content='',properties={}){if(Object.keys(properties).length){const body=String(content).replace(/^---\s*\r?\n[\s\S]*?\r?\n---(?:\r?\n)?/,'');content='---\n'+JSON.stringify({...frontmatter(content),...clone(properties)},null,2)+'\n---\n'+body;}this.path=path;this.name=path.split('/').pop();this.extension=this.name.includes('.')?this.name.split('.').pop():'';this.basename=this.extension?this.name.slice(0,-this.extension.length-1):this.name;this.stat={ctime:1000,mtime:2000,size:String(content).length};this.parent=null;this.content=content;metadata.set(path,{frontmatter:{...frontmatter(content),...clone(properties)},tags:[]});}}
  const rootFolder=new TFolder('');store.set('',rootFolder);
  adapterFiles.set('.obsidian/plugins/fixture-only/main.js','TEST FIXTURE ONLY');
  function ensureFolder(p){if(!p||p==='/')return rootFolder;if(store.has(p))return store.get(p);const folder=new TFolder(p);folder.parent=ensureFolder(p.includes('/')?p.slice(0,p.lastIndexOf('/')):'');folder.parent.children.push(folder);store.set(p,folder);return folder;}
  function addFile(p,text='',props={}){const f=new TFile(p,text,props);f.parent=ensureFolder(p.includes('/')?p.slice(0,p.lastIndexOf('/')):'');f.parent.children.push(f);store.set(p,f);return f;}
  for(const f of config.files||[])addFile(f.path,f.content||'',f.properties||{});
  const emitter=label=>{const map=new Map();return {on(name,cb){const ref={label,name,cb};if(!map.has(name))map.set(name,new Set());map.get(name).add(ref);events.push(ref);traceEvent('listen',{label,name});return ref;},offref(ref){map.get(ref.name)?.delete(ref);traceEvent('unlisten',{label,name:ref.name});},trigger(name,...args){traceEvent('event',{label,name,paths:args.filter(a=>a?.path).map(a=>a.path)});for(const r of [...(map.get(name)||[])])r.cb(...args);},listeners(){return [...map.values()].reduce((s,x)=>s+x.size,0);}};};
  const vEvents=emitter('vault'),mEvents=emitter('metadata'),wEvents=emitter('workspace');let layout=[];
  const vault={...vEvents,configDir:'.obsidian',getName:()=> 'FixtureVault',getRoot:()=>rootFolder,getFiles:()=>[...store.values()].filter(f=>f instanceof TFile),getMarkdownFiles:()=>vault.getFiles().filter(f=>f.extension==='md'),getAllLoadedFiles:()=>[...store.values()],getAbstractFileByPath:p=>store.get(p==='/'?'':p)||null,getFolderByPath:p=>store.get(p)||null,
   read:async f=>{traceEvent('read',f.path);return f.content;},cachedRead:async f=>{traceEvent('cachedRead',f.path);return f.content;},readBinary:async f=>new TextEncoder().encode(f.content).buffer,
   async modify(f,text){f.content=text;f.stat.mtime++;f.stat.size=text.length;metadata.set(f.path,{frontmatter:frontmatter(text),tags:[]});traceEvent('modify',{path:f.path,text});vEvents.trigger('modify',f);},
   async modifyBinary(f,b){await vault.modify(f,new TextDecoder().decode(b));},
   async process(f,fn){const next=fn(f.content);await vault.modify(f,next);return next;},
   async create(p,text){if(store.has(p))throw Error('File already exists');const f=addFile(p,text);traceEvent('create',{path:p,text});vEvents.trigger('create',f);return f;},
   async createBinary(p,b){return vault.create(p,new TextDecoder().decode(b));},
   async createFolder(p){traceEvent('mkdir',p);return ensureFolder(p);},
   async rename(f,p){if(store.has(p)&&store.get(p)!==f)throw Error('Destination exists');const old=f.path;store.delete(old);f.parent.children=f.parent.children.filter(x=>x!==f);f.path=p;f.name=p.split('/').pop();f.extension=f.name.split('.').pop();f.basename=f.name.slice(0,-f.extension.length-1);f.parent=ensureFolder(p.includes('/')?p.slice(0,p.lastIndexOf('/')):'');f.parent.children.push(f);store.set(p,f);metadata.set(p,metadata.get(old)||{});metadata.delete(old);traceEvent('rename',{from:old,to:p});vEvents.trigger('rename',f,old);},
   async delete(f){store.delete(f.path);f.parent.children=f.parent.children.filter(x=>x!==f);traceEvent('delete',f.path);vEvents.trigger('delete',f);},async trash(f){return vault.delete(f);},
   adapter:{async exists(p){return adapterFiles.has(p)||store.has(p);},async read(p){if(adapterFiles.has(p))return adapterFiles.get(p);const f=store.get(p);if(f instanceof TFile)return f.content;throw Error('ENOENT '+p);},async write(p,t){adapterFiles.set(p,t);traceEvent('adapter.write',{path:p,text:t});},async mkdir(p){adapterFiles.set(p,null);},async list(p){return {files:[...adapterFiles.keys()].filter(x=>x.startsWith(p+'/')&&adapterFiles.get(x)!==null),folders:[]};},async remove(p){adapterFiles.delete(p);},async rename(a,b){adapterFiles.set(b,adapterFiles.get(a));adapterFiles.delete(a);},async stat(p){return adapterFiles.has(p)?{type:adapterFiles.get(p)===null?'folder':'file',mtime:2000,ctime:1000,size:String(adapterFiles.get(p)||'').length}:null;}}
  };
  const workspace={...wEvents,containerEl:doc?.body,getActiveFile:()=>activeFile,getActiveViewOfType:()=>null,getLeavesOfType:()=>[],iterateAllLeaves:()=>{},onLayoutReady:fn=>layout.push(fn),getLeaf:()=>({openFile:async f=>{activeFile=f;traceEvent('openFile',f.path);},setViewState:async state=>traceEvent('viewState',state),detach:()=>traceEvent('detachLeaf',null)}),getMostRecentLeaf:()=>null,revealLeaf:async()=>{},activeLeaf:null,leftSplit:{collapsed:false,collapse(){this.collapsed=true;}},rightSplit:{collapsed:true,collapse(){this.collapsed=true;}}};
  const app={appId:'FIXTURE-DEVICE',vault,workspace,metadataCache:{...mEvents,getFileCache:f=>metadata.get(f.path)||{frontmatter:{},tags:[]},getCache:p=>metadata.get(p),getFirstLinkpathDest:(p)=>store.get(p)||null},metadataTypeManager:{properties:{},getType:k=>config.propertyTypes?.[k]||'text',setType(k,t){traceEvent('propertyType',{key:k,type:t});}},plugins:{plugins:{}},keymap:{pushScope(){},popScope(){}},scope:{},fileManager:{renameFile:(f,p)=>vault.rename(f,p),async trashFile(f){await vault.trash(f);},async processFrontMatter(f,fn){const fm=clone(metadata.get(f.path)?.frontmatter||{});fn(fm);metadata.set(f.path,{frontmatter:fm,tags:[]});const body=f.content.replace(/^---\s*\r?\n[\s\S]*?\r?\n---(?:\r?\n)?/,'');f.content='---\n'+JSON.stringify(fm,null,2)+'\n---\n'+body;f.stat.mtime++;f.stat.size=f.content.length;traceEvent('frontmatter',{path:f.path,data:fm});},getAvailablePathForAttachment:async name=>name},commands:{executeCommandById:id=>traceEvent('executeCommand',id)}};
  class Plugin {constructor(a=app,manifest={id:'fixture-only-not-release-identity',version:'0.0.0-test',dir:'.obsidian/plugins/fixture-only'}){this.app=a;this.manifest=manifest;this._disposers=[];this._commands=[];this._views=[];this._saved=clone(config.settings||{});this._saveFailure=null;}
   async loadData(){traceEvent('loadData',null);return clone(this._saved);}async saveData(x){if(this._saveFailure)throw this._saveFailure;this._saved=clone(x);traceEvent('saveData',x);}
   register(fn){this._disposers.push(fn);}registerEvent(ref){this.register(()=>({vault,metadata:app.metadataCache,workspace}[ref.label]).offref(ref));}
   registerDomEvent(el,event,fn,opts){el.addEventListener(event,fn,opts);this.register(()=>el.removeEventListener(event,fn,opts));}
   registerInterval(id){this.register(()=>clearInterval(id));return id;}addCommand(c){this._commands.push(c);traceEvent('command',{id:c.id,name:c.name});}
   registerView(id,factory){this._views.push({id,factory});traceEvent('view',id);}addSettingTab(t){this._tab=t;traceEvent('settingsTab',t.constructor.name);}
   addRibbonIcon(icon,title,cb){traceEvent('ribbon',{icon,title});return doc?.createElement('button');}async _unloadHost(){this.onunload();for(const d of this._disposers.splice(0).reverse())d();}
  }
  class Notice{constructor(message,timeout){traceEvent('notice',{message:String(message),timeout:timeout??null});}}
  class Modal {constructor(a){this.app=a;this.scope=new Scope();if(doc){this.containerEl=doc.createElement('div');this.containerEl.className='modal-container';this.modalEl=this.containerEl.createDiv({cls:'modal'});this.titleEl=this.modalEl.createDiv({cls:'modal-title'});this.contentEl=this.modalEl.createDiv({cls:'modal-content'});this.closeButtonEl=this.modalEl.createDiv({cls:'modal-close-button'});this.bgEl=this.containerEl.createDiv({cls:'modal-bg'});}}open(){doc?.body.append(this.containerEl);this.onOpen?.();}close(){this.onClose?.();this.containerEl?.remove();}setTitle(t){this.titleEl?.setText(t);}onOpen(){}onClose(){}}
  class ItemView{constructor(leaf){this.leaf=leaf;this.app=leaf?.app||app;this.containerEl=doc?.createElement('div');this.contentEl=this.containerEl?.createDiv({cls:'view-content'});this._disposers=[];}async setState(){}register(fn){this._disposers.push(fn);}registerEvent(ref){this.register(()=>workspace.offref(ref));}registerDomEvent(el,n,fn,opts){el.addEventListener(n,fn,opts);this.register(()=>el.removeEventListener(n,fn,opts));}getState(){return {};}}
  class PluginSettingTab{constructor(a,p){this.app=a;this.plugin=p;this.containerEl=doc?.createElement('div');}}
  class Scope{constructor(){this.keys=[];}register(mod,key,fn){const k={mod,key,fn};this.keys.push(k);return k;}unregister(k){this.keys=this.keys.filter(x=>x!==k);}}
  class Menu{constructor(){this.items=[];}addItem(fn){const item={setTitle(t){this.title=t;return this;},setIcon(i){this.icon=i;return this;},setDisabled(v){this.disabled=v;return this;},onClick(fn){this.click=fn;return this;},setChecked(v){this.checked=v;return this;}};fn(item);this.items.push(item);return this;}addSeparator(){return this;}showAtMouseEvent(){}showAtPosition(){}hide(){}}
  class Setting{constructor(el){if(el){this.settingEl=el.createDiv({cls:'setting-item'});this.infoEl=this.settingEl.createDiv({cls:'setting-item-info'});this.nameEl=this.infoEl.createDiv({cls:'setting-item-name'});this.descEl=this.infoEl.createDiv({cls:'setting-item-description'});this.controlEl=this.settingEl.createDiv({cls:'setting-item-control'});}}setName(n){this.nameEl?.setText(n);return this;}setDesc(n){this.descEl?.setText(n);return this;}setClass(n){this.settingEl?.addClass(n);return this;}setHeading(){return this;}addText(fn){return this._control('input',fn);}addTextArea(fn){return this._control('textarea',fn);}addDropdown(fn){return this._control('select',fn);}addToggle(fn){return this._control('input',fn);}addButton(fn){return this._control('button',fn);}addExtraButton(fn){return this.addButton(fn);}addSlider(fn){return this._control('input',fn);} _control(tag,fn){const el=this.controlEl?.createEl(tag);const c={inputEl:el,selectEl:el,buttonEl:el,toggleEl:el,setValue(v){if(el)el.value=v;return this;},setPlaceholder(v){if(el)el.placeholder=v;return this;},setButtonText(v){el?.setText(v);return this;},setIcon(){return this;},setCta(){return this;},setWarning(){return this;},setTooltip(){return this;},setDisabled(v){if(el)el.disabled=v;return this;},addOption(v,t){el?.createEl('option',{text:t,attr:{value:v}});return this;},addOptions(opts){for(const [v,t]of Object.entries(opts))this.addOption(v,t);return this;},setLimits(){return this;},setDynamicTooltip(){return this;},onChange(fn){el?.addEventListener('change',()=>fn(el.value));return this;},onClick(fn){el?.addEventListener('click',fn);return this;}};fn(c);return this;}}
  function setIcon(el,name){if(!el)return;el.setAttribute('data-test-icon',name);const svg=el.ownerDocument.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('svg-icon');svg.setAttribute('width','16');svg.setAttribute('height','16');if(config.appendIcons)el.append(svg);else el.replaceChildren(svg);}
  const obsidian={Plugin,Notice,Setting,PluginSettingTab,Modal,Scope,Menu,TFile,TFolder,ItemView,setIcon,getIconIds:()=>['search','folder','file','check','plus','x','tag','settings','history','clock','pencil','trash-2','arrow-left','chevron-down'],Platform:{isMobile:!!config.mobile,isMobileApp:!!config.mobile,isDesktopApp:!config.mobile,isIosApp:!!config.mobile,isMacOS:!config.mobile},parseYaml,stringifyYaml:v=>JSON.stringify(v,null,2)+'\n',MarkdownView:class MarkdownView{}};
  return {app,obsidian,trace,store,metadata,adapterFiles,addFile,ensureFolder,setActive:p=>{activeFile=store.get(p)||null;},async layoutReady(){for(const fn of layout.splice(0))await fn();},activeListeners:()=>vEvents.listeners()+mEvents.listeners()+wEvents.listeners(),clearTrace:()=>{trace.length=0;}};
 }
 global.__makeHost=makeHost;
})(globalThis);
