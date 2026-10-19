from pathlib import Path
import json, hashlib, re
root=Path(__file__).resolve().parents[1]
manifest=root/'docs/APPROVED_CHANGES.json'
m=json.loads(manifest.read_text())
paths=['src/features/navigator/SearchNavigatorController.js','src/features/navigator/toolbar-config.js','src/features/plugin/project-catalog-methods.js','src/core/LocalSearchPlugin.js']
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for s in paths:
 p=root/s
 original=root/('baseline/modular.3-source/'+s[4:]); assert original.exists(),str(original)
 row=next((r for r in m['files'] if r['file']==s),None)
 if row is None:
  row={'file':s,'baseline':str(original.relative_to(root)),'before':sha(original),'after':sha(p)}
  m['files'].append(row)
 else:row['after']=sha(p)
for id in ['NAVIGATOR_VISIBLE_SECTION_DEFS','SearchNavigatorController','LocalSearchPlugin.getProjectOwnerMigration']:
 if id not in m['changedOriginIds']:m['changedOriginIds'].append(id)
m['reason']='GLS project-owner de-specialization: remove built-in owner navigation and read-only migration; ordinary user property remains in generic YAML catalog. Requires paired Workbench provider-stop patch.'
m['revision']='2026-10-18-owner-as-ordinary'
manifest.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
# Remove generated/historical docs claims that the removed API still exists.
method=root/'docs/METHOD_INDEX.md';s=method.read_text()
s=s.replace(', `getProjectOwnerMigration`','').replace('`getProjectOwnerMigration`, ','')
s=re.sub(r'### `getProjectOwnerMigration\(\)`\n.*?(?=### `getIndexedFileProperties\(path\)`)', '',s,flags=re.S)
method.write_text(s)
public=root/'docs/PUBLIC_API.md';s=public.read_text()
s=re.sub(r'### `getProjectOwnerMigration`\n.*?(?=### `getFileProperties`)', '',s,flags=re.S)
s=re.sub(r'getProjectOwnerMigration 仍保留就绪前 null 和原迁移读取语义，不因本次重构删除。', '已删除历史 `getProjectOwnerMigration` 迁移接口；普通属性完全由原生属性查询和编辑负责。',s)
public.write_text(s)
(root/'docs/PROJECT_OWNER_AS_ORDINARY.md').write_text('''# 项目负责人 → 普通属性（2026-10-18）

本轮不再为 `项目负责人` 提供 GLS 级特殊快捷分组或项目负责人迁移接口。`所属项目` 仍然是项目分组属性。

用户原有 YAML/Canvas/图片等属性保留；如果自行维护 `项目负责人`，完全走 GLS 既有普通属性索引、Picker、重命名、删除以及样式。

重点：个人工作台 3.4.1 的 SearchBridge 会额外注册外部虚拟属性 `workbench-project-owners`，造成同名键只读及覆盖 YAML。必须与独立工作台桥接修正版配套安装才能完全取消污染。工作台内部项目负责人字段和用户已保存的偏好数据本轮不删除。

正常项目分组 getIndexedProjectGroups、普通属性接口、Picker、iOS Portal、输入法底栏不跟随、Dialog44 和 Style Settings 默认值保持原状。
''')
print('Updated manifest:',len(m['files']),'files /',len(m['changedOriginIds']),'origin IDs')
