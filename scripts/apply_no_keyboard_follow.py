from pathlib import Path
import hashlib,json
root=Path(__file__).parent.parent
p=root/'src/integrations/SearchWorkspaceCapabilities.js'
s=p.read_text()
old='''        this.mobileFrame = mountMobileFrame(this.root, {
            preserveFrame: false,
            onSettled: () => core.dropdown?._queueReposition(),
            onOrientation: () => core.dropdown?.invalidateFrame()
        });'''
new='''        // The native mobile sidebar owns its dock as part of the Obsidian leaf.
        // Do not subscribe this sidebar to keyboard/VisualViewport frame updates:
        // the bottom command rail must never be lifted by a keyboard inset.
        // Keep the existing controller for native search tabs; independent
        // Picker/modal surfaces retain their own mobile frame lifecycle.
        this.mobileFrame = core.hostKind === "sidebar" ? null : mountMobileFrame(this.root, {
            preserveFrame: false,
            onSettled: () => core.dropdown?._queueReposition(),
            onOrientation: () => core.dropdown?.invalidateFrame()
        });'''
assert old in s
p.write_text(s.replace(old,new,1))
p=root/'src/styles/styles.css';s=p.read_text()
css='''/* When the host overlays instead of resizing its native sidebar leaf,
   keep the command dock inside the actually visible keyboard boundary.
   Native-resizing leaves report 0px so retain their normal layout. */
.local-search-workspace-host.local-search-navigator[data-nav-layout="mobile"].is-ui-keyboard-open > .local-search-nav-mobile-toolbar {
    margin-bottom: var(--ui-mobile-keyboard-inset, 0px);
}
'''
assert css in s
p.write_text(s.replace(css,'''/* The native sidebar toolbar stays at the leaf's bottom. The iOS keyboard
   never adds a margin or owns a second command-toolbar position. */
''',1))
p=root/'docs/APPROVED_CHANGES.json';d=json.loads(p.read_text());h=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
d['changedOriginIds'].append('SearchWorkspaceCapabilities')
new_row={'file':'src/integrations/SearchWorkspaceCapabilities.js','baseline':'baseline/modular.3-source/integrations/SearchWorkspaceCapabilities.js','before':h('baseline/modular.3-source/integrations/SearchWorkspaceCapabilities.js'),'after':h('src/integrations/SearchWorkspaceCapabilities.js')}
assert not any(x['file']==new_row['file'] for x in d['files'])
d['files'].append(new_row)
css_row=next(x for x in d['files'] if x['file']=='src/styles/styles.css');css_row['after']=h('src/styles/styles.css')
d['reason'] += ' Follow-up: native mobile sidebar command dock no longer consumes mobile keyboard frame or CSS keyboard inset; native search tabs and separate Pickers retain their original keyboard behavior.'
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
p=root/'package.json';d=json.loads(p.read_text());d['version']='0.0.0-stability.1-sidebar-no-keyboard-dock.1';p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
p=root/'scripts/pack.mjs';s=p.read_text();assert "const base='GLS-Mobile-Sidebar-Stability-1'" in s;s=s.replace("const base='GLS-Mobile-Sidebar-Stability-1'","const base='GLS-Stability-1-Sidebar-NoKeyboardFollow-1'");p.write_text(s)
print('Changed source: ',new_row['file'],'and src/styles/styles.css; total approved:',len(d.get('files',[])))
