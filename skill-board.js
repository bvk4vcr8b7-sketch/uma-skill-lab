'use strict';
function renderSkillBoard(planned){
  if(!$('skillGroupsReady')||typeof catalog==='undefined'||!catalog)return;
  const filter=$('filter').value,query=$('q').value.trim(),slots=Array.from({length:6},()=>[]);
  const groups=new Map(),best=new Map(),review=new Map(),representatives=new Map();
  for(const s of state.skills){const k=sourceKey(s),old=representatives.get(k);if(!old||hint(s)>hint(old))representatives.set(k,s)}
  for(const s of state.skills){
    if(!active(s))continue;
    if(!best.has(skillIdentity(s))||hint(s)>hint(best.get(skillIdentity(s))))best.set(skillIdentity(s),s);
  }
  state.skills.forEach((s,i)=>{
    if((s.type==='因子'&&!active(s))||representatives.get(sourceKey(s))!==s)return;
    const availability=acquisition(s),own=selfEvolution(s),selected=active(s)&&planned.has(skillIdentity(s));
    const status=verdict(s);
    if(!own&&availability==='取得不可'&&filter!=='全件'||filter==='適合候補'&&status!=='条件適合'||filter==='取得予定'&&!selected||!(s.name+s.type+s.owner).includes(query))return;
    const duplicate=best.has(skillIdentity(s))&&sourceKey(best.get(skillIdentity(s)))!==sourceKey(s);
    const info=skillRecord(s),gold=info?.rarity===2;
    const warnings=[];
    if(selected&&raceNeeds(s).some(req=>assess(req,selectedTrainingSkills()).gap))warnings.push(s.skillId===101703211?'強化候補不足':'発動用の候補不足');
    if(selected&&availability!=='取得可能')warnings.push(availability);
    if(selected&&status!=='条件適合')warnings.push(status);
    if(selected&&status==='条件適合'&&skillBranches(s).some(r=>r.conditional))warnings.push('展開次第');
    const override=state.sourceHints?.[sourceKey(s)]??state.hintOverrides?.[skillHintKey(s)];
    const components=skillComponents(s),rating=courseGroup(s);
    if(selected&&rating==='要確認')warnings.push('有効性要確認');
    const cls=own||s.type==='進化'?'evolved':gold?'gold':'';
    const level=hint(s);
    const html='<article class="skillEntry '+cls+(selected?' isPlanned':' notPlanned')+(duplicate?' duplicate':'')+(warnings.length?' warnEntry':'')+'">'+
      '<button id="skill'+i+'" class="skillName" aria-label="'+esc(s.name)+'" aria-pressed="'+selected+'" '+(!planAllowed(s)&&!selected?'disabled':'')+' onclick="toggleSkill('+i+','+!selected+')">'+
      (selected?'✓ ':'')+esc(s.name)+' <b>'+(cost(s,0)??'—')+'</b></button>'+
      '<div class="miniControls"><select id="hint'+i+'" aria-label="'+esc(s.name)+' 最終ヒントLv" onchange="setSkillHint('+i+',this.value)"><option value="">自'+level+'</option>'+[0,1,2,3,4,5].map(n=>'<option value="'+n+'" '+(override===n?'selected':'')+'>Lv'+n+'</option>').join('')+'</select>'+
      '<button class="infoButton" aria-label="'+esc(s.name)+'の詳細" onclick="openSkillInfo('+i+')">ⓘ</button></div>'+
      '<div class="badges">'+components.map(([label,style])=>'<span class="'+style+'">'+label+'</span>').join('')+(duplicate?' 重複':'')+(warnings.length?' ⚠':'')+'</div></article>';
    if(rating!=='適合'){
      if(!review.has(rating))review.set(rating,[]);
      review.get(rating).push('<div><small>'+esc(s.owner||s.type)+'</small>'+html+'</div>');return;
    }
    const slot=s.type.startsWith('サポカ')?state.deck.indexOf(s.owner):-1;
    if(slot>=0){slots[slot].push(html);return}
    const group=s.type==='進化'?(s.festival?'シナリオ進化':'育成ウマ娘'):s.type==='キャラ'?'育成ウマ娘':s.type==='シナリオ'?(/リンク|選択/.test(s.note||'')?'サポカ連動・選択報酬':'シナリオ確定'):s.type==='因子'?'因子':s.type;
    if(!groups.has(group))groups.set(group,[]);
    groups.get(group).push(html);
  });
  if($('inheritanceStatus')){const count=(state.factorSlots||[]).filter(id=>id&&savedFactorIds.has(id)).length;
    const msg=count?'継承因子を'+count+'枠に設定中':'継承因子が設定されていません';
    $('inheritanceStatus').textContent=msg;
    $('inheritanceStatus').parentElement.querySelector('summary').textContent=msg+' · 親・祖父母を選択';
  }
  slots.forEach((items,i)=>{$('cardSkills'+i).innerHTML=items.join('')});
  $('rows').innerHTML=[...groups].map(([group,items])=>'<section class="sourceGroup"><h3>'+esc(group)+'</h3>'+items.join('')+'</section>').join('')+['要確認','条件外','判定保留'].filter(k=>review.has(k)).map(k=>'<section class="sourceGroup review"><h3>'+k+' · '+review.get(k).length+'</h3>'+review.get(k).join('')+'</section>').join('');
  for(let i=0;i<6;i++){
    const reward=$('reward'+i);if(!reward)continue;
    const list=state.skills.filter(s=>s.db&&s.type==='サポカ金'&&s.owner===state.deck[i]&&active(s)).map(s=>s.name);
    reward.textContent=list.length?'報酬 '+new Set(list).size+'件':'イベント設定';reward.title=list.join('・');const names=$('rewardNames'+i);if(names)names.textContent=list.length?'予定報酬　'+[...new Set(list)].join('・'):'予定報酬なし';
    const heading=$('eventHeading'+i);if(heading)heading.textContent=(i+1)+' '+(state.deck[i]||'未選択');
  }
}
