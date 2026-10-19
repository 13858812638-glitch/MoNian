from pathlib import Path
root=Path('/mnt/data/GLS-OrdinaryAttributes-20261018/src')
f='core/LocalSearchPlugin.js';s=(root/f).read_text()
s=s.replace('''        this._projectPropertySubscribers = new Set();
        this._projectGroupSnapshot = null;
''','''        this._indexChangeSubscribers = new Set();
''')
s=s.replace('''            listProjects: () => this.getIndexedProjectGroups(),
''','''            listIndexedFiles: () => this.getIndexedFiles(),
''')
s=s.replace('''            subscribeProjectChanges: (listener) => this.subscribeProjectPropertyChanges(listener)
''','''            subscribeIndexChanges: (listener) => this.subscribeIndexChanges(listener)
''')
s=s.replace('''        this.registerEvent(this.app.workspace.on("dida:workbench-api-ready", owner => this._connectDidaProjectCatalog(owner)));
        this._connectDidaProjectCatalog();
''','')
s=s.replace('''            this._connectDidaProjectCatalog();
''','')
s=s.replace('''                this._publishProjectChanges([]);
''','''                this._publishIndexChanges(new Set(), { refreshPools: false });
''')
s=s.replace('''        this._didaProjectUnsubscribe?.();
        this._didaProjectUnsubscribe = null;
        this._didaProjectApi = null;
        this._didaProjectOwner = null;
        this._didaProjectRows = null;
''','')
s=s.replace('''        this._projectPropertySubscribers.clear();
''','''        this._indexChangeSubscribers.clear();
''')
# class method assignment last keeps current method index, no rename for frozen extraction
s=s.replace('"_publishProjectChanges","subscribeProjectPropertyChanges","_connectDidaProjectCatalog","_refreshDidaProjectCatalog",','"subscribeIndexChanges",')
s=s.replace('"getIndexedProjectGroups","getIndexedFileProperties",','"getIndexedFiles","getIndexedFileProperties",')
for needle in ('_projectGroupSnapshot','_projectPropertySubscribers','_connectDidaProjectCatalog','subscribeProjectChanges:','listProjects:','_publishProjectChanges','getIndexedProjectGroups','_didaProject'):
 if needle in s:raise RuntimeError('residual '+needle)
(root/f).write_text(s);print(f,'modified')

f='features/navigator/SearchNavigatorController.js';s=(root/f).read_text()
s=s.replace('''        if (this.layout !== "mobile") definitions.push(["project", "所属项目", "layers"]);
''','')
s=s.replace('''        else if (kind === "project") core.facets.openPropertyPicker("所属项目", anchor, { mode: "quick-value" });
''','')
s=s.replace('''            } else {
                const key = "所属项目";
                count = this._propertyStats(key, universe, state).present;
                selected = Boolean(state.properties.get(key)?.size);
            }
''','''            }
''')
a=s.index('            } else if (id === "project") {');b=s.index('\n            }\n            this._finishProjectionRows(ref);',a)
s=s[:a]+'            }'+s[b+len('\n            }'):]
if '"所属项目"' in s or 'id === "project"' in s:raise RuntimeError('GLS navigator has domain branch')
(root/f).write_text(s);print(f,'modified')

f='features/navigator/toolbar-config.js';s=(root/f).read_text()
s=s.replace('''    { id: "project", label: "所属项目快捷分组（桌面）", icon: "layers" },
''','')
(root/f).write_text(s);print(f,'modified')

f='features/plugin/index-queue-methods.js';s=(root/f).read_text()
s=s.replace('''            let projectChanged = false;
''','')
s=s.replace('''            const projectKey = meta => meta ? JSON.stringify([meta.properties?.["所属项目"], meta.ctime]) : "";
''','')
s=s.replace('''                    const previousProject = projectKey(this.fileMetaCache.get(path));
''','')
s=s.replace('''                    projectChanged ||= previousProject !== projectKey(this.fileMetaCache.get(path));
''','')
s=s.replace('''this._publishIndexChanges(changedPaths, { refreshPools, projectChanged });''','''this._publishIndexChanges(changedPaths, { refreshPools });''')
(root/f).write_text(s);print(f,'modified')

f='features/plugin/path-lifecycle-methods.js';s=(root/f).read_text()
s=s.replace(', { projectChanged: true }','')
(root/f).write_text(s);print(f,'modified')

f='features/plugin/property-maintenance-methods.js';s=(root/f).read_text()
s=s.replace('''        this._projectGroupSnapshot = null;
''','')
s=s.replace('''this._publishIndexChanges(null, { refreshPools: true, projectChanged: true });''','''this._publishIndexChanges(null, { refreshPools: true });''')
(root/f).write_text(s);print(f,'modified')

f='data/properties/property-values.js';s=(root/f).read_text()
s=s.replace('''    if (key === "所属项目") for (const value of knownValues) {
''','''    for (const value of knownValues) {
''')
s=s.replace('''    const display = value => key === "所属项目" && typeof value === "string" && !isSpecialPropertyValue(value)
''','''    const display = value => typeof value === "string" && !isSpecialPropertyValue(value)
''')
(root/f).write_text(s);print(f,'modified')

f='integrations/public-contract.js';s=(root/f).read_text()
s=s.replace('''EXTERNAL_SEARCH_API_VERSION = 18''','''EXTERNAL_SEARCH_API_VERSION = 19''')
s=s.replace('''"workbench-presentation", "workbench-toolbar", "project-catalog"''','''"workbench-presentation", "workbench-toolbar", "indexed-files", "index-change-subscription"''')
(root/f).write_text(s);print(f,'modified')
