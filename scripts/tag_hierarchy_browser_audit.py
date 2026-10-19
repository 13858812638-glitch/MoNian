"""GLS Tag Hierarchy Composer: browser interactions in a controlled Obsidian host.
This is Chromium simulation, not actual iPhone Obsidian/WebKit acceptance.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,os,shutil,json,traceback,sys
ROOT=Path(__file__).resolve().parent.parent
os.chdir(ROOT)
subprocess.run(['node','--input-type=module','-e',"import {prepareSubjects} from './tests/harness.mjs';prepareSubjects();"],check=True,stdout=subprocess.DEVNULL)
res=[]; errors=[]
def check(label, expr, extra=None):
    ok=bool(expr)
    res.append({'case':label,'pass':ok,'detail':extra})
    print(('PASS ' if ok else 'FAIL ')+label,flush=True)
    if not ok: raise AssertionError(f'{label}: {extra}')
with sync_playwright() as tool:
    browser=tool.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-sandbox'])
    for mobile,dark,width in [(True,False,390),(True,True,320),(False,False,1100),(False,True,870)]:
        label=('mobile' if mobile else 'desktop')+('-dark' if dark else '-light')+f'-{width}'
        context=browser.new_context(viewport={'width':width,'height':844},locale='zh-CN',is_mobile=mobile,has_touch=mobile)
        page=context.new_page()
        page.on('pageerror',lambda e:errors.append(str(e)))
        try:
            page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body class="'+('is-mobile is-phone is-ios ' if mobile else '')+('theme-dark' if dark else 'theme-light')+'"><div id="host"></div></body></html>')
            for f in ['tests/browser-fixture.css','src/styles/styles.css']:
                page.add_style_tag(content=(ROOT/f).read_text())
            for f in ['tests/host.js','tests/browser-scenarios.js']:
                page.add_script_tag(content=(ROOT/f).read_text())
            page.evaluate('(mobile)=>bootFixture(mobile)',mobile)
            page.add_script_tag(content=(ROOT/'tests/generated/subject.cjs').read_text())
            page.evaluate('()=>startFixture()')
            page.evaluate('''()=>{
                window.tagSession=C.batchMetadata.open(C.tagFilterBtn, {initialAction:'tag',paths:['资料/鞋垫方案.md']});
                window.pickerInput=tagSession?.panel.querySelector('.local-search-picker-search');
                window.inputValue=(value)=>{pickerInput.value=value;pickerInput.dispatchEvent(new InputEvent('input',{bubbles:true}));};
                window.buttonLabel=(b)=>b?.getAttribute('aria-label')||b?.getAttribute('title')||b?.ownerDocument.getElementById(b.getAttribute('aria-labelledby'))?.textContent||'';
                window.findAction=(label)=>[...tagSession.panel.querySelectorAll('button')].find(b=>buttonLabel(b)===label);
                window.createAction=(label)=>{const button=findAction(label);if(!button) throw Error('no action: '+label);button.click();return button};
                window.currentCrumbs=()=>[...tagSession.panel.querySelectorAll('.local-search-tag-hierarchy-crumb')].map(x=>x.innerText);
            }''')
            check(label+' opens tag editor',page.evaluate('()=>!!tagSession?.panel?.isConnected && !!pickerInput'))
            check(label+' one input only',page.evaluate("()=>tagSession.panel.querySelectorAll('.local-search-picker-search').length===1"))
            check(label+' hierarchy bar visible and fits',page.evaluate('''()=>{const h=tagSession.panel.querySelector('.local-search-tag-hierarchy-bar').getBoundingClientRect();const panel=tagSession.panel.getBoundingClientRect();return h.width>0&&h.right<=panel.right+1&&h.left>=panel.left-1}'''))
            # Existing parent immediate drill via trailing '+' action; no tag is staged by navigating.
            page.evaluate("""()=>createAction('在 运动 下创建子标签')""")
            check(label+' drill existing parent',page.evaluate("()=>currentCrumbs().join('/')==='全部标签/运动' && tagSession.state.add.size===0"), page.evaluate("()=>({crumbs:currentCrumbs(), parent:tagSession.state.parentPath, add:tagSession.state.add.size, button:findAction('在 运动 下创建子标签')?.outerHTML.slice(0,400)})"))
            check(label+' native search node stays stable and focusable',page.evaluate("()=>pickerInput.isConnected && tagSession.panel.querySelector('.local-search-picker-search')===pickerInput && document.activeElement===pickerInput"))
            page.evaluate("()=>inputValue('跑步')")
            check(label+' composed full-path preview',page.evaluate("""()=>!!findAction('创建并添加标签 运动/跑步')"""))
            if mobile:
                hit=page.evaluate("""()=>{const action=findAction('进入 运动/跑步 下一级（不添加父标签）'); const r=action.getBoundingClientRect();return{w:r.width,h:r.height}}""")
                check(label+' child-action mobile hit target >=44px',hit['w']>=43.5 and hit['h']>=43.5,hit)
            if mobile: page.screenshot(path=str(ROOT/f'reports/tag-hierarchy-composer-{label}.png'),animations='disabled',caret='hide')
            # Virtual next-level drill without staging the parent tag.
            page.evaluate("""()=>createAction('进入 运动/跑步 下一级（不添加父标签）')""")
            check(label+' virtual parent, still no staged tags',page.evaluate("()=>currentCrumbs().join('/')==='全部标签/运动/跑步' && tagSession.state.add.size===0"))
            page.evaluate("""()=>pickerInput.dispatchEvent(new KeyboardEvent('keydown',{key:'Backspace',code:'Backspace',bubbles:true,cancelable:true}))""")
            check(label+' empty Backspace navigates to parent',page.evaluate("()=>currentCrumbs().join('/')==='全部标签/运动' && tagSession.state.add.size===0"))
            page.evaluate("()=>inputValue('跑步/')")
            check(label+' trailing slash drills into virtual child',page.evaluate("()=>currentCrumbs().join('/')==='全部标签/运动/跑步' && tagSession.state.add.size===0"))
            page.evaluate("()=>inputValue('训练')")
            page.evaluate("""()=>createAction('创建并添加标签 运动/跑步/训练')""")
            check(label+' stage only leaf, search clears',page.evaluate("()=>tagSession.state.add.size===1 && [...tagSession.state.add.values()][0]==='运动/跑步/训练' && !pickerInput.value"))
            check(label+' leaf appears in scoped list',page.evaluate("""()=>[...tagSession.panel.querySelectorAll('.local-search-tag-tree-row .local-search-move-tree-name')].some(x=>x.textContent==='训练')"""))
            # Switch to root, type direct path with IME protection.
            page.evaluate("""()=>createAction('返回层级：全部标签')""")
            page.evaluate('''()=>{pickerInput.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));inputValue('营销/');}''')
            check(label+' composing input does not drill',page.evaluate("()=>currentCrumbs().join('/')==='全部标签' && pickerInput.value==='营销/'"))
            page.evaluate("()=>pickerInput.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}))")
            check(label+' slash drills after composition ends',page.evaluate("()=>currentCrumbs().join('/')==='全部标签/营销' && !pickerInput.value"))
            page.evaluate("()=>inputValue('活动/')")
            check(label+' second slash drills immediately',page.evaluate("()=>currentCrumbs().join('/')==='全部标签/营销/活动' && !pickerInput.value"))
            page.evaluate("()=>inputValue('黑五')")
            page.evaluate("()=>pickerInput.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,cancelable:true}))")
            check(label+' Enter creates leaf only',page.evaluate("()=>tagSession.state.add.size===2 && [...tagSession.state.add.values()].includes('营销/活动/黑五') && !pickerInput.value"))
            # No side effects before Confirm.
            check(label+' staged draft does not write before confirm',page.evaluate("()=>!(H.store.get('资料/鞋垫方案.md')?.content||'').includes('营销/活动/黑五')"))
            # Cancel should keep file content unchanged.
            page.evaluate("()=>tagSession.panel.querySelector('.local-search-metadata-actions button.local-search-action-btn').click()")
            check(label+' cancel discards draft',page.evaluate("()=>!C.dropdown.panel?.isConnected && !(H.store.get('资料/鞋垫方案.md')?.content||'').includes('营销/活动/黑五')"))
            # Open anew and Commit via same service.
            page.evaluate("()=>{tagSession=C.batchMetadata.open(C.tagFilterBtn, {initialAction:'tag',paths:['资料/鞋垫方案.md']});pickerInput=tagSession.panel.querySelector('.local-search-picker-search');}")
            page.evaluate("()=>inputValue('运动')")
            page.evaluate("""()=>pickerInput.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))""")
            check(label+' duplicate Enter cannot remove existing tag',page.evaluate("()=>tagSession.state.add.size===0 && tagSession.state.remove.size===0"))
            page.evaluate("()=>inputValue('业务/活动/直播')")
            page.evaluate("()=>pickerInput.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))")
            check(label+' old slash path compatible',page.evaluate("()=>[...tagSession.state.add.values()].includes('业务/活动/直播')"))
            page.evaluate("()=>tagSession.panel.querySelector('.local-search-metadata-actions button.local-search-action-primary').click()")
            page.wait_for_timeout(250)
            check(label+' confirm saves through current metadata service',page.evaluate("()=>(H.store.get('资料/鞋垫方案.md')?.content||'').includes('业务/活动/直播')"))
            # Verify the same Picker correctly routes draft creation without writing a file.
            page.evaluate("""()=>{
                window.draftTags=null;
                const metadataTarget={label:'新建文件草稿',summary:()=>({tags:{values:[]}}),
                    isActive:()=>true,commit:async draft=>{window.draftTags=draft.addTags;return true;}};
                tagSession=C.batchMetadata.open(C.tagFilterBtn,{initialAction:'tag',metadataTarget});
                pickerInput=tagSession.panel.querySelector('.local-search-picker-search');
                inputValue('新建/项目/方案');
                pickerInput.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
            }""")
            check(label+' new-file draft stages nested label',page.evaluate("()=>[...tagSession.state.add.values()].includes('新建/项目/方案')"))
            page.evaluate("()=>tagSession.panel.querySelector('.local-search-metadata-actions button.local-search-action-primary').click()")
            page.wait_for_timeout(100)
            check(label+' new-file draft commits through existing target only',page.evaluate("()=>draftTags?.length===1 && draftTags[0]==='新建/项目/方案'"))
            # Deep breadcrumb horizontal scrolling must never overflow the frame.
            page.evaluate("""()=>{
                tagSession=C.batchMetadata.open(C.tagFilterBtn,{initialAction:'tag',paths:['项目/周报.md']});
                pickerInput=tagSession.panel.querySelector('.local-search-picker-search');
                for(const part of ['部门','运营','活动','渠道','直播','内容','主题']) inputValue(part+'/');
            }""")
            page.wait_for_timeout(90)
            check(label+' very deep breadcrumb remains inside panel',page.evaluate("""()=>{
                const bar=tagSession.panel.querySelector('.local-search-tag-hierarchy-bar').getBoundingClientRect();
                const panel=tagSession.panel.getBoundingClientRect();
                const crumbs=tagSession.panel.querySelector('.local-search-tag-hierarchy-crumbs');
                return currentCrumbs().length===8 && bar.right<=panel.right+1 && bar.left>=panel.left-1
                    && crumbs.scrollLeft+crumbs.clientWidth>=crumbs.scrollWidth-2;
            }"""), page.evaluate("""()=>{const b=tagSession.panel.querySelector('.local-search-tag-hierarchy-bar'),c=tagSession.panel.querySelector('.local-search-tag-hierarchy-crumbs');return{crumbs:currentCrumbs(),left:c.scrollLeft,client:c.clientWidth,total:c.scrollWidth,scrollBehavior:getComputedStyle(c).scrollBehavior,bar:b.getBoundingClientRect().toJSON(),panel:tagSession.panel.getBoundingClientRect().toJSON()}}"""))
            page.evaluate("()=>C.dropdown.close(false)")

            check(label+' no page errors',not errors,errors[:4])
            if mobile:
                page.screenshot(path=str(ROOT/f'reports/tag-hierarchy-{label}.png'),animations='disabled',caret='hide')
        except Exception as exc:
            errors.append(label+': '+traceback.format_exc())
            print('ERROR',label,str(exc),flush=True)
            page.screenshot(path=str(ROOT/f'reports/tag-hierarchy-fail-{label}.png'),animations='disabled',caret='hide')
        finally:
            context.close()
    browser.close()
out={'browser':'Chromium '+browser.version,'results':res,'errors':errors,'passed':sum(x['pass'] for x in res),'failed':sum(not x['pass'] for x in res)}
(ROOT/'reports/tag-hierarchy-browser.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print('SUMMARY',out['passed'],out['failed'],'errors',len(errors),flush=True)
if errors or out['failed']:sys.exit(1)
