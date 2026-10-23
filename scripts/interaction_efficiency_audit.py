"""Real DOM event paths in the controlled Chromium host; not native latency certification."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get('GLS_EFFICIENCY_OUT', '/workspace/interaction-refine/after'))
OUT.mkdir(parents=True, exist_ok=True)
scope = {'__file__': str(ROOT/'scripts/desktop_navigator_audit.py')}
exec((ROOT/'scripts/desktop_navigator_audit.py').read_text().split('with sync_playwright()')[0], scope)
rows = []
def check(name, passed, evidence):
    rows.append({'name': name, 'pass': bool(passed), 'evidence': evidence})
    print(('PASS ' if passed else 'FAIL ')+name, flush=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for mobile in [False, True]:
        ctx, p = scope['boot'](browser, mobile=mobile)
        prefix = 'mobile' if mobile else 'desktop'
        p.evaluate('''()=>{
          window.calls={};window.savedMethods=[];
          for(const [owner,key,label] of [[C.navigator,'sync','nav'],[P.sharedSearchState,'publish','publish'],
            [C,'performSearch','search'],[C,'onStateChange','save'],[C.navigator,'_syncMobileTools','tools']]) {
            const original=owner[key];savedMethods.push(()=>owner[key]=original);
            owner[key]=function(...args){calls[label]=(calls[label]||0)+1;return original?.apply(this,args)};
          }
          window.input=value=>{C.searchInput.value=value;C.searchInput.dispatchEvent(new Event('input',{bubbles:true}))};
        }''')
        typing = p.evaluate('''async()=>{
          calls={};input('n');input('no');input('note');
          const pending={calls:{...calls},query:C.queryState.raw,saved:V.getState().session.query,
            timer:!!C.searchTimer,hasQuery:C.navigator.root.classList.contains('has-nav-query')};
          await waitFixture(220);
          return {pending,committed:{calls:{...calls},query:C.queryState.raw,count:C.fullResults.length}};
        }''')
        check(prefix+' pending typing saves the live buffer without publishing or projecting',
              typing['pending']['calls'].get('nav',0)==0 and typing['pending']['calls'].get('publish',0)==0
              and typing['pending']['calls'].get('tools',0)==0
              and typing['pending']['calls'].get('save')==3 and typing['pending']['query']==''
              and typing['pending']['saved']=='note' and typing['pending']['timer'] and typing['pending']['hasQuery'], typing)
        check(prefix+' debounce commits exactly once', typing['committed']['calls'].get('search')==1
              and typing['committed']['calls'].get('publish')==1 and typing['committed']['calls'].get('nav')==1
              and typing['committed']['query']=='note' and typing['committed']['count']==36, typing['committed'])
        cleared = p.evaluate('''()=>{calls={};input('');return {calls:{...calls},query:C.queryState.raw,timer:!!C.searchTimer}}''')
        check(prefix+' empty input has one synchronous commit notification',cleared['calls'].get('publish')==1
              and cleared['calls'].get('nav')==1 and cleared['calls'].get('save')==1 and not cleared['timer'],cleared)
        ime = p.evaluate('''async()=>{
          calls={};C.searchInput.dispatchEvent(new CompositionEvent('compositionstart'));
          input('笔');input('笔记');await waitFixture(180);
          const composing={calls:{...calls},query:C.queryState.raw,timer:!!C.searchTimer};
          C.searchInput.dispatchEvent(new CompositionEvent('compositionend'));await waitFixture(220);
          const committed={calls:{...calls},query:C.queryState.raw};
          input('');return {composing,committed};
        }''')
        check(prefix+' IME only commits after composition ends',not ime['composing']['calls'].get('search')
              and not ime['composing']['timer'] and ime['committed']['calls'].get('search')==1
              and ime['committed']['query']=='笔记',ime)
        create = p.evaluate('''()=>{
          C.createFlow.enterCreateMode();calls={};input('New draft');
          const result={calls:{...calls},title:C.createFlow.currentCreateTitle(),draft:V.getState().session.create};
          C.createFlow.toggleInputMode({focusInput:false});return result;
        }''')
        check(prefix+' create title owns its single notification',create['calls'].get('save')==1
              and create['calls'].get('nav')==1 and create['title']=='New draft' and bool(create['draft']),create)
        page = p.evaluate('''()=>{
          C.navigator.setPage('results',false);const n=C.navigator;
          const observer=new MutationObserver(()=>{});
          for(const el of [n.root,n.backButton,n.footer,n.facets,n.main]) observer.observe(el,{attributes:true});
          n.syncPage();const attrs=observer.takeRecords().filter(x=>x.attributeName==='hidden'||x.attributeName==='data-nav-page');
          observer.disconnect();return attrs.map(x=>({tag:x.target.tagName,attr:x.attributeName}));
        }''')
        check(prefix+' unchanged page writes no hidden or page attributes',len(page)==0,page)
        picker = p.evaluate('''async()=>{
          C.facets.showFolderDropdown();await waitFixture(80);
          const panel=C.dropdown.panel,list=panel.querySelector('.local-search-move-tree');
          let frames=0,reads=0,writes=0,measuring=false;const raf=window.requestAnimationFrame,RO=window.ResizeObserver;
          const tracked=callback=>(...args)=>{measuring=true;try{return callback(...args)}finally{measuring=false}};
          const descriptors=['offsetWidth','clientWidth'].map(key=>[key,Object.getOwnPropertyDescriptor(HTMLElement.prototype,key)||Object.getOwnPropertyDescriptor(Element.prototype,key)]);
          for(const [key,d] of descriptors) Object.defineProperty(list,key,{configurable:true,get(){if(measuring)reads++;return d.get.call(this)}});
          const set=panel.style.setProperty;
          panel.style.setProperty=function(key,...args){if(key==='--audit-reserve')writes++;return set.call(this,key,...args)};
          window.requestAnimationFrame=function(callback){frames++;return raf.call(this,tracked(callback))};
          window.ResizeObserver=class extends RO {constructor(callback){super(tracked(callback))}};
          const dispose=S.observePickerCountRail(panel,list,'--audit-reserve');
          window.requestAnimationFrame=raf;window.ResizeObserver=RO;await waitFixture(80);
          const initial={frames,reads,writes,reserve:panel.style.getPropertyValue('--audit-reserve')};
          const expected=()=>`${Math.max(0,list.offsetWidth-list.clientWidth)}px`;
          list.style.flex='none';list.style.minHeight='0';list.style.maxHeight='none';
          list.style.height='100px';await waitFixture(80);const height={writes,correct:panel.style.getPropertyValue('--audit-reserve')===expected()};
          panel.hidden=true;await waitFixture(40);panel.hidden=false;await waitFixture(80);
          const revealed=panel.style.getPropertyValue('--audit-reserve')===expected();
          dispose();const stopped={reads,writes};list.style.height='130px';await waitFixture(80);
          const clean=reads===stopped.reads&&writes===stopped.writes;
          panel.style.setProperty=set;for(const [key] of descriptors)delete list[key];
          C.dropdown.close();return {initial,height,revealed,clean};
        }''')
        check(prefix+' Picker initially measures through one observer',picker['initial']['frames']==0
              and picker['initial']['reads']==2 and picker['initial']['writes']==1,picker)
        check(prefix+' Picker unchanged reserve skips write and cleanup stops measurement',picker['height']['writes']==1
              and picker['height']['correct'] and picker['revealed'] and picker['clean'],picker)
        shared = p.evaluate('''async()=>{
          const peer=new S.SearchView({app:H.app},P,S.TAB_VIEW_TYPE);document.body.append(peer.containerEl);
          peer.containerEl.style.height='800px';peer.contentEl.style.height='100%';await peer.onOpen();await waitFixture(80);
          const other=peer.core;input('note2');other._applyResultQuickFilter('folder','Folder002');other._onFilterChanged();await Promise.resolve();
          const pending=C.searchInput.value==='note2'&&!!C.searchTimer;
          await waitFixture(300);
          const result={pending,localQuery:C.queryState.raw,peerQuery:other.queryState.raw,
            localFolders:[...C.filterState.folders],peerFolders:[...other.filterState.folders]};
          peer.onClose();peer.containerEl.remove();return result;
        }''')
        check(prefix+' pending local query merges a peer folder without losing either change',shared['pending']
              and shared['localQuery']=='note2' and shared['peerQuery']=='note2'
              and shared['localFolders']==['Folder002'] and shared['peerFolders']==['Folder002'],shared)
        closed = p.evaluate('''()=>{
          input('pending close');const core=C;V.onClose();
          return {saved:V.getState().session.query,shared:P.sharedSearchState.state.query,destroyed:core._destroyed};
        }''')
        check(prefix+' closing preserves and publishes the pending input',closed['saved']=='pending close'
              and closed['shared']=='pending close' and closed['destroyed'],closed)
        ctx.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
if not os.environ.get('GLS_EFFICIENCY_RECORD_ONLY'):
    assert all(row['pass'] for row in rows)
