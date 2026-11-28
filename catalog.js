'use strict';
const catalogLabels = {
  friendship_bonus:'友情ボーナス', motivation_bonus:'やる気効果', training_bonus:'トレーニング効果',
  initial_bond:'初期絆', specialty_priority:'得意率', skill_point_bonus:'スキルPtボーナス',
  initial_skill_points:'初期スキルPt', race_bonus:'レースボーナス', fan_bonus:'ファン数ボーナス', hint_levels:'ヒントLvアップ',
  hint_frequency:'ヒント発生率', energy_cost_reduction:'体力消費ダウン', event_effectiveness:'イベント効果',
  event_recovery:'イベント回復量', failure_protection:'失敗率ダウン', wisdom_friendship_recovery:'賢さ友情回復量'
};
for(const [key,label] of Object.entries({speed:'スピード',stamina:'スタミナ',power:'パワー',guts:'根性',wisdom:'賢さ'})){
  catalogLabels[key+'_bonus']=label+'ボーナス';
  catalogLabels['initial_'+key]='初期'+label;
}
for(const [key,label] of Object.entries(catalogLabels)){
  if(!Array.from(filters.sort.options).some(option=>option.value===key))filters.sort.add(new Option('4凸'+label+'順',key));
}
let catalog, catalogSkills, catalogCards, catalogChars;
const catalogKey = name => name.replace(/\s/g,'').replace(/[【［]/g,'[').replace(/[】］]/g,']');
function catalogMerge(key,records){
  const path='data/'+key+'.json';
  const merged=new Map(records.map(x=>[String(x.id),{...x}]));
  for(const x of rawDB[path]||[]){
    if(String(x.id).startsWith('local-') && records.some(r=>catalogKey(r.name)===catalogKey(x.name)))continue;
    const base=merged.get(String(x.id));
    const row={...base,...x};
    if(key==='supports' && base)row.type=base.type;
    merged.set(String(x.id),row);
  }
  rawDB[path]=Array.from(merged.values());
}
function applyCatalog(){
  if(!catalog)return;
  rawDB['data/courses.json']??=catalog.courses;
  rawDB['data/scenarios/toresenken.json']??=catalog.toresenken;
  catalogMerge('characters',catalog.characters);
  catalogMerge('supports',catalog.supports);
  catalogMerge('skills',catalog.skills);
  const events=new Map(catalog.events.events.map(e=>[e.id,e]));
  for(const e of rawDB['data/events.json']?.events||[])events.set(e.id,e);
  rawDB['data/events.json']={...catalog.events,events:Array.from(events.values())};
}
function catalogDetails(){
  if(!catalog)return;
  const box=$('catalogDetails');
  box.replaceChildren();
  function block(name,lines){
    const d=document.createElement('details'), title=document.createElement('summary'), body=document.createElement('div');
    title.textContent=name;body.style.whiteSpace='pre-wrap';body.textContent=lines.join('\n');
    d.append(title,body);box.append(d);
  }
  for(const [item,group] of [[catalogChars.get(state.char),'Charactor'],...state.deck.map(n=>[catalogCards.get(n),'Support'])]){
    if(!item)continue;
    const lines=['実装日 '+item.release];
    if(item.unique)lines.push('固有ボーナス '+item.unique);
    if(item.performance)item.performance.forEach((p,i)=>lines.push((i?i+'凸':'無凸')+'　'+(Object.entries(p).map(([k,v])=>(catalogLabels[k]||k)+' '+v).join(' / ')||'資料未確認')));
    if(item.uniqueByLimit){const u=item.uniqueByLimit[4];const fixed=Object.entries(u.effects).map(([k,v])=>(catalogLabels[k]||k)+' '+v);if(fixed.length)lines.push('固有（4凸） '+fixed.join(' / '));if(u.special)lines.push('条件付き固有・資料の効果コード '+u.special)}
    for(const e of item.evolutions||[])lines.push('進化　'+(e.parent||'進化元未照合')+' → '+catalogSkills.get(e.id)?.name);
    if(item.localHints?.length)lines.push('通常ヒント '+item.localHints.join('、'));
    if(item.hintSkillIds)lines.push('通常ヒント '+item.hintSkillIds.map(id=>catalogSkills.get(id)?.name||id).join('、'));
    for(const [lv,ids] of Object.entries(item.skillsByAwakening||{}))lines.push((lv==='1'?'初期':'覚醒Lv'+lv)+'　'+ids.map(id=>catalogSkills.get(id)?.name||id).join('、'));
    const stories=catalog.stories[group][catalogKey(item.name)]||[];
    if(!stories.length)lines.push('イベント選択肢・報酬は未照合');
    for(const entry of stories){
      for(const [title,choices] of Object.entries(entry)){
        lines.push('\n'+title);
        for(const opt of choices)lines.push(opt.Option+'　'+opt.Effect);
      }
    }
    block(item.name,lines);
  }
}
const originalCatalogImage=imageURL;
imageURL=function(target,id){
  const row=(target==='dbChar'?catalog?.characters:catalog?.supports)?.find(x=>String(x.id)===String(id));
  if(target!=='dbChar'&&Object.hasOwn(catalog?.portraits||{},id))return catalog.portraits[id];
  return row?.image||originalCatalogImage(target,id);
};
const catalogSetup=dbSetup;
dbSetup=function(){applyCatalog();catalogSetup();catalogDetails()};
const catalogApply=dbApply;
dbApply=function(){catalogApply();catalogDetails()};
async function loadCatalog(){
  try{
    const keys=['supports','characters','skills','events','stories','eventLinks','portraits','courses','toresenken','geometry','evolutionRules','effectTypes','effectComponents','extraBranches','uniqueSkills'];
    catalog=Object.fromEntries(await Promise.all(keys.map(async k=>[k,await getJSON('data/catalog/'+k+'.json')])));
    for(const [group,owners] of Object.entries(catalog.eventLinks)){
      const records=catalog.stories[group];
      for(const [name,links] of Object.entries(owners)){
        records[name]=links.flatMap(link=>{
          const events=records[link.owner]||[];
          return link.event?events.filter(e=>Object.prototype.hasOwnProperty.call(e,link.event)):events;
        });
      }
    }
    catalog.components=new Map(Object.entries(catalog.effectComponents).flatMap(([types,ids])=>ids.map(id=>[id,types.split(',')])));
    catalogCards=new Map(catalog.supports.map(x=>[x.name,x]));
    catalogChars=new Map(catalog.characters.map(x=>[x.name,x]));
    for(const skill of catalog.skills)if(!skill.branches?.length&&catalog.extraBranches[skill.id])skill.branches=catalog.extraBranches[skill.id];
    catalogSkills=new Map(catalog.skills.map(x=>[x.id,x]));
    catalog.bySkillName=new Map();
    for(const s of catalog.skills)catalog.bySkillName.set(s.name,catalog.bySkillName.has(s.name)?null:s.id);
    dbSetup();
    if(state.factorSlots?.some(Boolean))syncFactors();
    $('catalogSkill').oninput=showCatalogSkill;
    $('catalogStatus').textContent='サポカ '+catalog.supports.length+'枚・育成 '+catalog.characters.length+'衣装。資料確認日 2026-11-27';
  }catch(e){$('catalogStatus').textContent='同梱DBの読み込み失敗　'+e.message}
}
loadCatalog();

function showCatalogSkill(){
  const q=$('catalogSkill').value.trim(), box=$('catalogSkillResults');
  box.replaceChildren();
  if(!q)return;
  for(const s of catalog.skills.filter(s=>s.name.includes(q))){
    const d=document.createElement('details'),title=document.createElement('summary'),p=document.createElement('p');
    title.textContent=s.name+'　'+(s.baseSp==null?'基礎Pt未確認':s.baseSp+' Pt');
    const owners=[];
    for(const card of catalog.supports)if(card.hintSkillIds.includes(s.id)||(card.localHints||[]).includes(s.name))owners.push(card.name+' 通常ヒント');
    for(const c of catalog.characters){
      for(const [lv,ids] of Object.entries(c.skillsByAwakening))if(ids.includes(s.id))owners.push(c.name+(lv==='1'?' 初期':' 覚醒Lv'+lv));
      for(const e of c.evolutions||[])if(e.id===s.id)owners.push(c.name+' '+(e.parent||'')+'から進化');
    }
    p.style.whiteSpace='pre-wrap';
    p.textContent=[s.description,...(s.conditionText||[]),...(s.branches||[]).map(b=>[b.precondition,b.condition].filter(Boolean).join(' → ')),...owners].filter(Boolean).join('\n');
    d.append(title,p);box.append(d);
  }
}
