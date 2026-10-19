from pathlib import Path
p=Path('/mnt/data/GLS-ProjectOwner-Normalize-20261018')
def patch(rel,subs):
 f=p/rel; s=f.read_text(encoding='utf8'); original=s
 for a,b in subs:
  n=s.count(a)
  if n != (2 if a == 'const key = id === "project" ? "所属项目" : "项目负责人";' else 1): raise RuntimeError(f'{rel}: mismatch count {n} for {a[:80]!r}')
  s=s.replace(a,b)
 f.write_text(s,encoding='utf8')
 print(rel,'delta',len(s)-len(original))
patch('src/features/navigator/SearchNavigatorController.js',[
 ('new Set(Platform.isMobile ? ["folder"] : ["properties", "owner"])','new Set(Platform.isMobile ? ["folder"] : ["properties"])'),
 ('definitions.push(["project", "所属项目", "layers"], ["owner", "负责人", "user"]);','definitions.push(["project", "所属项目", "layers"]);'),
 ('        else if (kind === "owner") core.facets.openPropertyPicker("项目负责人", anchor, { mode: "quick-value" });\n',''),
 ('const key = id === "project" ? "所属项目" : "项目负责人";','const key = "所属项目";'),
 ('} else if (id === "project" || id === "owner") {','} else if (id === "project") {')
])
# The key expression occurs in two independent branches; simplify both.

patch('src/features/navigator/toolbar-config.js',[
 ('    { id: "owner", label: "负责人快捷分组（桌面）", icon: "user" }','    // Person/team ownership belongs to ordinary metadata properties, not a built-in section.')
])
patch('src/features/plugin/project-catalog-methods.js',[
 ('''    // Migration-only read. Live project catalogs never infer owners from files.
    // Null means the initial authoritative index is not yet safe to migrate.
    getProjectOwnerMigration() {
        if (this._unloaded || !this._initialIndexReady) return null;
        if (this.app.vault.getFiles().some(file => !this.isPathExcluded(file.path)
            && !this.fileMetaCache.has(file.path))) return null;
        return this.getIndexedProjectGroups().map(group => ({ name: group.name,
            owners: normalizeUniqueStringList(group.paths.flatMap(path => {
                const value = this.fileMetaCache.get(path)?.properties?.["项目负责人"];
                return Array.isArray(value) ? value : value == null ? [] : [String(value)];
            })) }));
    },


''','')
])
patch('src/core/LocalSearchPlugin.js',[
 ('            getProjectOwnerMigration: () => this.getProjectOwnerMigration(),\n',''),
 ('"getIndexedProjectGroups","getProjectOwnerMigration","getIndexedFileProperties"','"getIndexedProjectGroups","getIndexedFileProperties"')
])
print('GLS updated')
