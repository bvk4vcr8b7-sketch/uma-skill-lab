'use strict';
function selfEvolution(s){return s.type==='進化'&&!s.festival&&s.owner===state.char&&Boolean(s.skillId)}
function planAllowed(s){return active(s)&&(selfEvolution(s)||acquisition(s)==='取得可能')}
function selectedTrainingSkills(){
  const found=new Map();
  function visit(s){
    if(!s||found.has(skillIdentity(s)))return;
    found.set(skillIdentity(s),s);
    const lower=lowerStage(s),name=s.pre||lower?.name;
    if(name)visit(state.skills.find(x=>active(x)&&x.name===name)||(lower&&{name:lower.name,skillId:lower.id,type:'前提'}));
  }
  state.skills.filter(s=>active(s)&&s.selected).forEach(visit);
  const replaced=new Set([...found.values()].map(x=>lowerStage(x)?.name).filter(Boolean));
  return [...found.values()].filter(x=>x.type!=='進化'&&!replaced.has(x.name));
}
function trainingType(s){
  if(s.kind&&s.kind!=='不明')return s.kind;
  return {speed:'速度',acceleration:'加速',passive:'緑',heal:'回復',multi:'複合'}[catalog.effectTypes[skillRecord(s)?.id]]||'不明';
}
function requirement(r){
  const [key,axis,value,count]=r;
  if(key==='skill'){
    const name=catalogSkills.get(axis)?.name;
    return name?{label:name,need:1,match:s=>s.name===name}:null;
  }
  if(key==='e_skill'){
    const label={green:'緑',speed:'速度',accel:'加速',reco:'回復',lane:'レーン移動'}[axis];
    if(!label)return null;
    return {label,need:value,match:s=>{const type=trainingType(s);return type===label?true:['複合','不明'].includes(type)?null:false}};
  }
  if(key!=='a_skill')return null;
  const field={strat:'styles',dist:'distances',trn:'grounds'}[axis];
  const tag={strat:['','nige','senko','sashi','oikomi'],dist:['short','mile','mid','long'],trn:['','turf','dirt']}[axis]?.[value];
  const label={strat:['','逃げ','先行','差し','追込'],dist:['短距離','マイル','中距離','長距離'],trn:['','芝','ダート']}[axis]?.[value];
  if(!tag)return null;
  return {label,need:count,match:s=>{
    const b=(s.activation||skillRecord(s)?.activation)?.branches;
    return b?.length?b.every(x=>x[field]?.length===1&&x[field][0]===tag):null;
  }};
}
function assess(req,skills){
  const values=skills.map(req.match),have=values.filter(x=>x===true).length;
  const gap=Math.max(0,req.need-have);
  return {req,gap,ok:!gap?true:values.filter(x=>x==null).length>=gap?null:false,
    label:req.label+' '+have+'/'+req.need+'個'+(gap?'（確認済み数からあと'+gap+'個）':'')};
}
function trainingGroups(s){
  const selected=selectedTrainingSkills();
  return (catalog.evolutionRules[s.skillId]?.groups||[]).map((group,g)=>group.map((r,i)=>{
    const req=requirement(r);if(req)return assess(req,selected);
    const [type,id,n]=r;
    if(type==='stat'||type==='fan'){
      const fan=type==='fan',v=state.trainingFacts?.[fan?'fan':id],need=fan?id:n;
      return {ok:v==null||v===''?null:Number(v)>=need,label:(fan?'ファン数':['','スピード','スタミナ','パワー','根性','賢さ'][id])+' '+need+'以上（'+(v??'未入力')+'）'};
    }
    const key=[s.owner,s.skillId,g,i].join('|');
    const kind={win:'対象レース勝利',win_all:'指定レース全勝',ev:'指定イベント',fan:'ファン数',participate:'対象レース出走'}[r[0]]||'育成実績';
    return {key,ok:state.evoConfirm?.[key]||null,label:kind+'（資料コード '+r.join(' ')+ '）'};
  }));
}
function raceNeeds(s){
  const branches=skillRecord(s)?.branches||[],needs=new Map();
  for(const b of branches)for(const m of (b.condition+' '+b.precondition).matchAll(/(activate_count_param_skill|activate_count_heal)>=([0-9]+)|is_used_skill_id==([0-9]+)/g)){
    const r=m[3]?['skill',Number(m[3])]:['e_skill',m[1]==='activate_count_heal'?'reco':'green',Number(m[2])];
    const req=requirement(r);if(req)needs.set(JSON.stringify(r),req);
  }
  return [...needs.values()];
}
function planDetails(s){
  const groups=selfEvolution(s)?trainingGroups(s):[];
  const items=groups.map((group,i)=>'<p>進化条件 '+(i+1)+'　'+group.map(x=>esc(x.label)+(x.key?' <label><input type="checkbox" data-confirm="'+esc(x.key)+'" '+(x.ok?'checked':'')+'>ゲーム内で達成確認</label>':'')).join(' または ')+'</p>');
  const needs=raceNeeds(s);
  for(const req of needs)items.push('<p>'+(s.skillId===101703211?'効果強化（中央・芝で緑7回発動時に持続3倍）':'レース中の発動回数・使用条件')+'　計画上の候補 '+esc(assess(req,selectedTrainingSkills()).label)+'</p>');
  return items.join('');
}
function fillRequirement(req,trainingOnly=false){
  const selected=selectedTrainingSkills(),names=new Set(selected.map(s=>s.name));
  let gap=assess(req,selected).gap;
  const pool=state.skills.filter(x=>x.type!=='進化'&&active(x)&&(autoEligible(x,true)||trainingOnly&&verdict(x)==='条件不一致')&&req.match(x)===true)
    .sort((a,b)=>(cost(a,0)??Infinity)-(cost(b,0)??Infinity));
  for(const x of pool){if(!gap)break;if(names.has(x.name))continue;x.selected=true;names.add(x.name);gap--}
}
function fillTrainingTargets(){
  for(const s of state.skills.filter(s=>selfEvolution(s)&&s.selected)){
    if(state.autoTargets?.training)for(const g of trainingGroups(s)){
      if(g.some(x=>x.ok))continue;
      const options=g.filter(x=>x.req).sort((a,b)=>a.gap-b.gap);
      if(options.length)fillRequirement(options[0].req,true);
    }
  }
  if(state.autoTargets?.raceNeeds)for(const s of state.skills.filter(x=>x.selected&&active(x)))for(const req of raceNeeds(s))fillRequirement(req);
}
document.addEventListener('change',e=>{
  if(e.target.dataset.confirm){(state.evoConfirm??={})[e.target.dataset.confirm]=e.target.checked;render()}
});
