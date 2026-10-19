from pathlib import Path
import re
root=Path('/mnt/data/GLS-OrdinaryAttributes-20261018/src')
def patch(name, operations):
 p=root/name; s=p.read_text(); original=s
 for old,new in operations:
  n=s.count(old)
  if n!=1:raise RuntimeError(f'{name} expected 1, got {n}: {old[:100]}')
  s=s.replace(old,new)
 p.write_text(s)
 print(name,'modified',len(s)-len(original))

f='features/plugin/project-catalog-methods.js';s=(root/f).read_text();
# Keep ordinary catalog operations, remove GLS-owned domain groups and Dida integration.
start=s.index('    _publishIndexChanges(');end=s.index('    _propertyValueCatalog() {')
s=s[:start]+'''    // A generic index event: consumers choose their own grouping property.
    _publishIndexChanges(paths = null, { refreshPools = true } = {}) {
        if (this._unloaded) return;
        this._clearResidentSearchResults();
        this._forEachActiveSearchCore(core => core._queueResultIndexChanges(paths, { refreshPools }));
        for (const listener of this._indexChangeSubscribers) {
            try { listener(paths === null ? null : [...paths]); }
            catch (error) { console.error("GLS 索引变更订阅失败", error); }
        }
    },

    subscribeIndexChanges(listener) {
        if (this._unloaded || typeof listener !== "function") return () => {};
        this._indexChangeSubscribers.add(listener);
        return () => this._indexChangeSubscribers.delete(listener);
    },

'''+s[end:]
s=s.replace('''        if (key === "所属项目") for (const group of this.getIndexedProjectGroups()) {
            if (!values.has(propertyValueKey(group.name))) values.set(propertyValueKey(group.name), group.name);
        }
''','')
s=s.replace('''        if (this.getIndexedProjectGroups().length) result.add("所属项目");
''','')
s=s.replace('''this._publishIndexChanges(null, { refreshPools: true, projectChanged: selected.some(row => row.key === "所属项目") });''','''this._publishIndexChanges(null, { refreshPools: true });''')
s=s.replace('''            this._projectGroupSnapshot = null;
''','')
start=s.index('    getIndexedProjectGroups() {');end=s.index('    getIndexedFileProperties(path) {');
s=s[:start]+'''    // Read-only ordinary property snapshot; no special property names, project model,
    // task list inference or duplicate persisted registry. One authoritative index.
    getIndexedFiles() {
        if (this._unloaded) return [];
        const files = [];
        for (const meta of this.fileMetaCache.values()) {
            const path = String(meta?.path || "");
            const file = this.app.vault.getAbstractFileByPath(path);
            if (!(file instanceof TFile) || this.isPathExcluded(path)
                || (meta?.file && meta.file !== file)) continue;
            files.push({
                path,
                ctime: Number(meta.ctime) || 0,
                properties: JSON.parse(JSON.stringify(indexedFileProperties(meta.properties || {})))
            });
        }
        return files.sort((a, b) => a.path.localeCompare(b.path, "zh-CN"));
    },

'''+s[end:]
s=s.replace('''        const projects = this.propertyCatalogValues("所属项目");
        if (projects.length) {
            const row = rows.find(item => item.key === "所属项目");
            if (row) row.values = projects;
            else rows.push({ key: "所属项目", propertyType: "multitext", values: projects });
        }
''','')
if re.search('getIndexedProjectGroups|_connectDida|_projectGroupSnapshot|projectChanged|项目目录',s):raise RuntimeError('residual project in generic service')
(root/f).write_text(s)
print(f,'modified')

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
