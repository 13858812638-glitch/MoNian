"""Read-only whole-source inventory. Candidate lists are not dead-code proofs."""
from pathlib import Path
import re,json,hashlib,collections
import tinycss2,yaml
root=Path(__file__).resolve().parent.parent
src=root/'src';css=(src/'styles/styles.css').read_text(); jsfiles=sorted(src.rglob('*.js'));js='\n'.join(p.read_text() for p in jsfiles)
errors=[];selectors=collections.defaultdict(list);duplicate_properties=[];decls=[]
def scan(nodes,context=()):
 for n in nodes:
  if n.type=='error':errors.append({'line':n.source_line,'message':n.message});continue
  if n.type=='at-rule' and n.content is not None:
   if n.lower_at_keyword in ['media','supports','container','layer','document','keyframes','-webkit-keyframes']:
    scan(tinycss2.parse_rule_list(n.content,skip_whitespace=True,skip_comments=True),context+(('@'+n.lower_at_keyword+' '+tinycss2.serialize(n.prelude)).strip(),))
  if n.type!='qualified-rule':continue
  selector=tinycss2.serialize(n.prelude).strip();selectors[(context,selector)].append(n.source_line)
  ds=tinycss2.parse_declaration_list(n.content,skip_whitespace=True,skip_comments=True);seen={}
  for d in ds:
   if d.type=='error':errors.append({'line':d.source_line,'message':d.message});continue
   if d.type!='declaration':continue
   row={'line':d.source_line,'selector':selector,'context':context,'property':d.name,'value':tinycss2.serialize(d.value).strip(),'important':d.important};decls.append(row)
   if d.name in seen:duplicate_properties.append({'line':d.source_line,'selector':selector,'property':d.name,'earlier':seen[d.name]})
   seen[d.name]=d.source_line
scan(tinycss2.parse_stylesheet(css,skip_comments=True,skip_whitespace=True))
settings_match=re.search(r'/\*\s*@settings\s*([\s\S]*?)\*/',css)
settings=yaml.safe_load(settings_match.group(1));items=settings['settings'];ids=[x['id'] for x in items]
heads=[x for x in items if x.get('type')=='heading'];params=[x for x in items if x.get('type')!='heading']
body=css[settings_match.end():]
tokens=set(d['property'] for d in decls if d['property'].startswith('--'))
uses=set(re.findall(r'var\(\s*(--[\w-]+)',body))
not_consumed=sorted(x for x in tokens-uses if x not in js)
param_missing=[]
for x in params:
 identifier=x['id']; token='--'+identifier
 if x['type'].startswith('variable'):
  if token not in body and token not in js and identifier not in js:param_missing.append(identifier)
 elif identifier not in body and identifier not in js:param_missing.append(identifier)
resources=[];literal_styles=[]
resource_re=re.compile(r'addEventListener\(|removeEventListener\(|requestAnimationFrame\(|cancelAnimationFrame\(|new (?:ResizeObserver|MutationObserver|IntersectionObserver)\b|\bsetTimeout\(|\bsetInterval\(|\.registerEvent\(|\.registerDomEvent\(')
for p in jsfiles:
 text=p.read_text()
 for number,line in enumerate(text.splitlines(),1):
  if resource_re.search(line):resources.append({'file':str(p.relative_to(root)),'line':number,'code':line.strip()})
  if re.search(r'\.style\.(?:\w+)\s*=\s*(?:["\']|\d)|\.style\.setProperty\([^,]+,\s*["\'][^"\']*["\']\s*\)',line):literal_styles.append({'file':str(p.relative_to(root)),'line':number,'code':line.strip()})
report={'scope':'all src JavaScript and CSS; read-only inventory, not an all-behavior proof','modules':len(jsfiles),'sourceFiles':len(jsfiles)+1,'jsLines':sum(len(p.read_text().splitlines()) for p in jsfiles),'jsBytes':sum(p.stat().st_size for p in jsfiles),'cssBytes':(src/'styles/styles.css').stat().st_size,'cssLines':len(css.splitlines()),'cssParseErrors':errors,'cssRuleCount':sum(map(len,selectors.values())),'duplicateSelectorsSameContext':[{'context':k[0],'selector':k[1],'lines':v} for k,v in selectors.items() if len(v)>1],'duplicatePropertiesSameRule':duplicate_properties,'styleSettings':{'sectionName':settings['name'],'sectionId':settings['id'],'headings':len(heads),'parameters':len(params),'duplicateIds':[x for x,c in collections.Counter(ids).items() if c>1],'duplicateSectionNamedHeading':[x for x in heads if x['title']==settings['name']],'missingConsumerCandidates':param_missing},'tokenDefinitionCount':len(tokens),'unconsumedTokenCandidates':not_consumed,'resourceReferences':resources,'literalStyleCandidates':literal_styles,'notes':['Selectors are grouped by at-rule context; repeated rules are candidates for ownership review, not proven conflicts.','Dynamic class/token names and external Style Settings consumers can produce scan false positives.','DOM-owned listeners may be collected with their element; global listeners require explicit scope cleanup.','No user theme/CSS snippets/data/manifest were supplied.']}
report['files']=[{'file':str(p.relative_to(root)),'lines':len(p.read_text().splitlines()),
 'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [*jsfiles,src/'styles/styles.css']]
report['mobileContract']={'baseHeightToken':'--ui-mobile-modal-height' in tokens,
 'keyboardHeightToken':'--ui-mobile-keyboard-height' in tokens,
 'note':'Presence is an inventory check, not a native keyboard/layout acceptance test.'}
(root/'reports/current/full-source-style-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in report.items() if k not in ['resourceReferences','literalStyleCandidates','files']},ensure_ascii=False,indent=2))
print('resource references',len(resources),'literal style candidates',len(literal_styles))
