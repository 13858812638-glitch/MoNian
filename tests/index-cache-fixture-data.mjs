// Deterministic exact-byte oracle fixtures, independent of Obsidian and of
// the index-cache writer. Keep this dataset fixed when comparing P1 vs frozen v5.2.
export function makeIndexCacheFixture(count, variant = 'normal') {
  const metas = new Map();
  const docs = new Map();
  for (let i = 0; i < count; i++) {
    const path = `业务/目录${i % 97}/文件${String(i).padStart(6, '0')}.md`;
    const meta = {
      path, name: `文件 ${i} “样例”`, nameLower: `文件 ${i} “样例”`,
      tags: i % 3 ? ['项目', `研发/${i % 13}`] : [],
      inlineTags: i % 7 ? [] : ['#周报'],
      properties: {所属项目:`业务组${i%11}`,状态:i%2?'进行中':'完成',数组:['A','B'],路径:`源\\${i}`},
      mtime: 1760000000000 + i, ctime: 1750000000000,
      statSize: 1024 + i, validationStamp: `finger-${i}`,
      fileModifiedAt: 1760000000000+i,
      timeFileSource: 'gls',timeFileFingerprint: `file-${i}`,
      timeFingerprint:`time-${i}`,timeCreatedSource:'gls',timeContentSource:'gls',
      contentModifiedAt: 1760000000000+i,extension:'md',
      snippet: `测试第 ${i} 行\n引号 “ ”\\反斜线`,
      textCount: i+20,canvasNodeCount:0,excalidrawElementCount:null,
      file: {path, stat:{mtime:1760000000000 + i}}
    };
    if (variant === 'missing' && i === 1) {
      delete meta.properties; delete meta.inlineTags;
      delete meta.textCount; delete meta.excalidrawElementCount;
      meta.contentModifiedAt = 'bad'; meta.canvasNodeCount = Infinity;
    }
    metas.set(path,meta);
    if (i % 7 !== 0) docs.set(path, `鞋垫业务分析\r\n第${i}条 \\"<> & 😀 ` .repeat(variant === 'large' ? 70 : 9));
  }
  // Object.fromEntries (as used by the frozen BodyIndex) applies JS object
  // ordering rules: integer keys precede the insertion-ordered path keys.
  docs.set('10', 'integer-10');
  docs.set('2', 'integer-2');
  docs.set('0', 'integer-0');
  docs.set('__proto__', 'dangerous-key-is-data');
  docs.set('奇怪\\"路径\\\n.md', 'unusual-path\\n值✅');
  return {metas,docs,settings:{contentSegmentMaxLen:8000,snippetMaxLen:200}};
}

export function makeCacheStub(fixture, write) {
  return {
    _unloaded:false, _indexCacheSaveGeneration:0,
    settings:{...fixture.settings},
    fileMetaCache:fixture.metas,
    bodyIndex:{serialize:()=>({documents:Object.fromEntries(fixture.docs)})},
    _persistWriteChain:Promise.resolve(),
    _writablePluginDirectory:async()=>'.obsidian/plugins/gls',
    app:{vault:{adapter:{write}}}
  };
}
