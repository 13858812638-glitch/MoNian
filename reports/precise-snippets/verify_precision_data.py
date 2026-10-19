"""Assert frozen-baseline reproduction, candidate precision, and stale-read protection."""
import json
from pathlib import Path
W=Path(__file__).resolve().parent
R=lambda name:json.loads((W/name).read_text(encoding='utf8'))
proof=[]
for n,mode in [(300,'mobile'),(300,'desktop'),(3000,'mobile')]:
    baseline=R(f'baseline-{n}-{mode}.json')
    candidate=R(f'candidate-final-{n}-{mode}.json')
    b=baseline['offscreen']; c=candidate['offscreen']
    assert len(b['steps'])==12 and len(c['steps'])==12
    assert b['updateCount']==216 and b['mutationCount']==648, (n,mode,b)
    assert c['updateCount']==0 and c['mutationCount']==0, (n,mode,c)
    assert c['buildCount']==0 and c['allDomRetained'] and c['sameVisibleOrder']
    assert candidate['visibleChanged']['updates']==1
    assert candidate['visibleChanged']['builds']==1
    assert 'VISIBLE_MARKER_20261018' in candidate['visibleChanged']['rendered']
    assert candidate['scroll']['changed'] and candidate['scroll']['summaryCount']>=18
    assert not candidate['pageErrors']
    proof.append({'files':n,'platform':mode,'offscreenSnippetsBefore':b['updateCount'],'offscreenSnippetsAfter':c['updateCount'],'domMutationRecordsBefore':b['mutationCount'],'domMutationRecordsAfter':c['mutationCount'],'visibleRowBuilds':candidate['visibleChanged']['builds'],'visibleSnippetUpdates':candidate['visibleChanged']['updates'],'lateScrollVisibleSnippets':candidate['scroll']['summaryCount']})
for nm,expect in [('race-final-offscreen.json',False),('race-final-visible.json',True),('race-multi.json',False)]:
    d=R(nm); assert d['pending']==0 and not d['pageErrors']
    assert d['beforeRelease']['gen']>d['beforeRelease']['oldGeneration']
    assert 'old-start' in d['events'] and 'new-start' in d['events'] and 'old-release' in d['events']
    assert 'OLD_STALE_CONTENT_MARKER' not in d['afterSnippet']+d['domSnippet']
    if expect: assert 'NEW_CONTENT_MARKER' in d['afterSnippet'] and 'NEW_CONTENT_MARKER' in d['domSnippet']
    if d.get('secondHost'): assert d['secondHost']['sameSearch'] and d['secondHost']['pending']==0
    proof.append({'race':nm,'passed':True,'secondHost':bool(d.get('secondHost'))})
(W/'precision-proof.json').write_text(json.dumps({'testEnvironment':'Chromium mock Obsidian; not native iOS','status':'PASS','assertions':proof},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('PRECISION TEST PASS',len(proof),'groups')
