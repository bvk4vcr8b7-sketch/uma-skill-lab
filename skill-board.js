'use strict';
function renderSkillBoard(planned){
  if(!$('skillGroupsReady')||typeof catalog==='undefined'||!catalog)return;
  const filter=$('filter').value,query=$('q').value.trim(),slots=Array.from({length:6},()=>[]);
  const groups=new Map(),best=new Map();
  for(const s of state.skills){
    if(!active(s))continue;
    if(!best.has(s.name)||hint(s)>hint(best.get(s.name)))best.set(s.name,s);
  }
  const opened=new Set([...document.querySelectorAll('.skillEntry details[open]')].map(e=>e.dataset.key));
  state.skills.forEach((s,i)=>{
    const availability=acquisition(s),own=selfEvolution(s),selected=active(s)&&planned.has(s.name);
    const status=verdict(s);
    if(!own&&availability==='取得不可'&&filter!=='全件'||filter==='適合候補'&&status!=='条件適合'||filter==='取得予定'&&!selected||!(s.name+s.type+s.owner).includes(query))return;
    const duplicate=best.has(s.name)&&best.get(s.name)!==s;
    const info=skillRecord(s),gold=info?.rarity===2;
    const warnings=[];
    if(selected&&raceNeeds(s).some(req=>assess(req,selectedTrainingSkills()).gap))warnings.push(s.skillId===101703211?'強化候補不足':'発動用の候補不足');
    if(selected&&availability!=='取得可能')warnings.push(availability);
    if(selected&&status!=='条件適合')warnings.push(status);
    if(selected&&status==='条件適合'&&skillBranches(s).some(r=>r.conditional))warnings.push('展開次第');
    const key=JSON.stringify([s.owner,s.name,s.type,s.eventKey]),safeKey=esc(key);
    const override=state.hintOverrides?.[skillHintKey(s)];
    const html='<article class="skillEntry '+(gold?'gold ':'')+(duplicate?'duplicate ':'')+(status==='条件不一致'?'outside ':'')+(warnings.length?'warnEntry':'')+'">'+
      '<button id="skill'+i+'" class="skillName" aria-label="'+esc(s.name)+'" aria-pressed="'+selected+'" '+(!planAllowed(s)&&!selected?'disabled':'')+' onclick="toggleSkill('+i+','+!selected+')">'+esc(s.name)+' <b>'+ (cost(s,0)??'—')+'</b></button>'+
      (warnings.length?'<small class="entryWarning">⚠ '+esc(warnings.join('・'))+'</small>':'')+
      '<details data-key="'+safeKey+'" '+(opened.has(key)?'open':'')+'><summary>Lv'+hint(s)+(duplicate?' · 重複':'')+'</summary><div class="entryDetail">'+
      '<label>ヒントLv<select id="hint'+i+'" onchange="setSkillHint('+i+',this.value)"><option value="">自動</option>'+[0,1,2,3,4,5].map(n=>'<option '+(override===n?'selected':'')+'>'+n+'</option>').join('')+'</select></label>'+
      '<p>通常 '+(cost(s,0)??'—')+' ／ 切れ者 '+(cost(s,10)??'—')+' Pt</p><p>'+esc(selectionReason(s))+'</p>'+planDetails(s)+
      '<label>基礎Pt<input type="number" min="0" value="'+esc(s.pt)+'" onchange="state.skills['+i+'].pt=this.value;render()"></label><button class="alt" onclick="edit('+i+')">詳細編集</button></div></details></article>';
    const slot=s.type.startsWith('サポカ')?state.deck.indexOf(s.owner):-1;
    if(slot>=0){slots[slot].push(html);return}
    const group=s.type==='進化'?(s.festival?'シナリオ進化':'育成ウマ娘'):s.type==='キャラ'?'育成ウマ娘':s.type==='シナリオ'?(/リンク|選択/.test(s.note||'')?'サポカ連動・選択報酬':'シナリオ確定'):s.type==='因子'?'因子':s.type;
    if(!groups.has(group))groups.set(group,[]);
    groups.get(group).push(html);
  });
  slots.forEach((items,i)=>{$('cardSkills'+i).innerHTML=items.join('')});
  $('rows').innerHTML=[...groups].map(([group,items])=>'<section class="sourceGroup"><h3>'+esc(group)+'</h3>'+items.join('')+'</section>').join('');
}
