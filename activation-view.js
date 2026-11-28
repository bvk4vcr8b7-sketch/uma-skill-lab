'use strict';
const timelineOptions={selected:true,kind:'すべて',order:'位置順',phase:'全区間'};
const effectTypes=['速度','加速','回復','複合','その他・未照合'];
function effectType(s){
  if(effectTypes.includes(s.kind))return s.kind;
  const verified={speed:'速度',acceleration:'加速',heal:'回復',multi:'複合',passive:'その他・未照合',other:'その他・未照合'}[catalog.effectTypes?.[s.skillId]];
  if(verified)return verified;
  const detail=(catalogSkills.get(s.skillId)?.conditionText||[]).join(' ');
  const types=[['速度',/目標速度|現在速度/],['加速',/加速度/],['回復',/持久力回復|体力回復/]].filter(([,pattern])=>pattern.test(detail));
  return types.length>1?'複合':types[0]?.[0]||'その他・未照合';
}
function elevationProfile(geo,d){
  const ends=[...new Set([0,d,...geo.slopes.flatMap(([a,b])=>[a,b])])].sort((a,b)=>a-b);
  let height=0;
  const points=ends.map((x,i)=>{
    if(i){const a=ends[i-1],grade=geo.slopes.find(([l,r])=>l<=a&&r>=x)?.[2]||0;height+=(x-a)*grade}
    return [x,height];
  });
  const heights=points.map(p=>p[1]),low=Math.min(...heights),range=Math.max(...heights)-low;
  const line=points.map(([x,h])=>x/d*1000+','+(29-(h-low)/(range||1)*25)).join(' ');
  return '<svg role="img" aria-label="登録勾配から算出した相対高低" viewBox="0 0 1000 32" preserveAspectRatio="none"><polygon points="0,32 '+line+' 1000,32" fill="#afcfc0"/><polyline points="'+line+'" fill="none" stroke="#396a59" vector-effect="non-scaling-stroke"/></svg>';
}
function activationChart(selectedSkills){
  const {d,geo}=raceContext();
  if(!Number.isFinite(d)||d<=0)return '距離を設定してください';
  const phases=['序盤','中盤','終盤','最終盤'],bounds=[0,d/6,d*2/3,d*5/6,d];
  const row=(label,lane)=>'<div class="axisRow"><div class="axisLabel">'+label+'</div><div class="axisLane">'+lane+'</div></div>';
  const bar=(a,b,cls,label='')=>'<span class="axisMark '+cls+'" style="left:'+100*a/d+'%;width:'+100*(b-a)/d+'%" title="'+esc(label)+'">'+esc(label)+'</span>';
  const opts=(key,values)=>values.map(v=>'<option '+(timelineOptions[key]===v?'selected':'')+'>'+v+'</option>').join('');
  const select=(key,title,values)=>'<label>'+title+'<select onchange="timelineOptions.'+key+'=this.value;render()">'+opts(key,values)+'</select></label>';
  let html='<div class="axisControls">'+select('order','並び順',['位置順','種別順'])+select('phase','位置',['全区間',...phases,'区間不明','発動不可'])+select('kind','種別',['すべて',...effectTypes])+'<label><input type="checkbox" '+(timelineOptions.selected?'checked':'')+' onchange="timelineOptions.selected=this.checked;render()">取得予定のみ</label></div>';
  html+=row('距離 m',bounds.map((b,i)=>'<span class="axisTick t'+i+'" style="left:'+b/d*100+'%">'+Math.round(b)+'</span>').join(''));
  html+=row('レース区間',phases.map((p,i)=>bar(bounds[i],bounds[i+1],'phase p'+i,p)).join(''));
  if(geo){
    html+=row('相対高低',elevationProfile(geo,d));
    const parts=[...geo.straights.map(x=>[...x,'直線']),...geo.corners.map((x,i)=>[...x,'コーナー '+(i+1)])].sort((a,b)=>a[0]-b[0]);
    html+=row('コース',parts.map(([a,b,k])=>bar(a,b,k==='直線'?'straight':'corner',k==='直線'?'直':k.split(' ')[1])).join(''));
    html+='<details><summary>境界距離・坂</summary>'+parts.map(([a,b,k])=>k+' '+a+'–'+b+'m').concat(geo.slopes.map(([a,b,g])=>(g>0?'上り坂':'下り坂')+' '+a+'–'+b+'m')).join(' ／ ')+'</details>';
  }else html+=row('コース','形状未照合');
  const skills=timelineOptions.selected?[...selectedSkills]:state.skills.filter(s=>active(s)&&acquisition(s)!=='取得不可');
  const unique=new Map(skills.map(s=>[s.name,s]));
  if(timelineOptions.selected)for(const s of skills){if(s.type==='進化'&&s.pre)unique.delete(s.pre);const lower=lowerStage(s);if(lower)unique.delete(lower.name)}
  const phase=phases.indexOf(timelineOptions.phase),entries=[];
  for(const s of unique.values()){
    const kind=effectType(s);
    if(timelineOptions.kind!=='すべて'&&kind!==timelineOptions.kind)continue;
    const branches=skillBranches(s);const impossible=branches.length>0&&branches.every(r=>!r.spans.length);const raw=branches.filter(r=>r.spans.length);
    let spans=raw.filter(r=>r.spatial&&!r.unknown).flatMap(r=>r.spans.map(([a,b])=>({a,b,random:r.random,conditional:r.conditional,passive:r.passive})));
    if(s.start!==''&&s.end!==''&&s.start!=null&&s.end!=null&&+s.start>=0&&+s.start<=+s.end&&+s.end<=d)spans=[{a:+s.start,b:+s.end}];
    if(phase>=0&&!spans.some(({a,b})=>b>=bounds[phase]&&a<bounds[phase+1]))continue;
    if(timelineOptions.phase==='区間不明'&&(spans.length||impossible))continue;
    if(timelineOptions.phase==='発動不可'&&!impossible)continue;
    entries.push({s,kind,spans,impossible,first:Math.min(...spans.map(x=>x.a)),partial:raw.some(r=>!r.spatial||r.unknown)});
  }
  entries.sort((a,b)=>(timelineOptions.order==='種別順'?effectTypes.indexOf(a.kind)-effectTypes.indexOf(b.kind):0)||a.first-b.first||a.s.name.localeCompare(b.s.name,'ja'));
  html+='<small>発動候補位置　◆ 固定位置　斜線 ランダム候補　実線 条件区間</small>';
  html+='<div class="effectLegend">'+effectTypes.filter(k=>entries.some(e=>e.kind===k)).map(k=>'<span class="k'+effectTypes.indexOf(k)+'">'+k+'</span>').join('')+'</div>';
  for(const {s,kind,spans,partial,impossible} of entries){
    const text=spans.map(x=>(x.passive?'常時効果':x.random?'ランダム候補':x.a===x.b?'固定位置':'条件区間')+' '+Math.round(x.a)+'–'+Math.round(x.b)+'m'+(x.conditional?'（順位・展開条件あり）':'')).join(' ／ ');
    const details='<details><summary>'+esc(s.name)+'</summary>'+esc(kind+' · '+(text||(impossible?'発動不可':'区間判定不能'))+(partial?' · 未照合条件あり':'')+' '+(catalogSkills.get(s.skillId)?.conditionText||[]).join(' ／ '))+'</details>';
    html+=row(details,spans.length?spans.map(x=>bar(x.a,x.b,'skillBand k'+effectTypes.indexOf(kind)+(x.random?' random':'')+(x.a===x.b?' point':''),x.passive?'常時':'')).join(''):'<small>'+(impossible?'発動不可':'区間判定不能')+'</small>');
  }
  return html+(entries.length?'':'<small>該当スキルなし</small>');
}
