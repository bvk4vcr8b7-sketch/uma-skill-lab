'use strict';
function raceContext(){
  const courses=rawDB['data/courses.json']?.courses||[];
  const matches=courses.filter(c=>c.place===state.course && c.distance===Number(state.meters) && c.turn===state.turn && c.ground===state.surface);
  const selected=matches.find(c=>String(c.id)===$('dbCourse').value);
  const course=selected||(matches.length===1?matches[0]:null);
  return {d:Number(state.meters),geo:catalog?.geometry?.[course?.id]};
}
function raceBranch(branch) {
  const {d,geo}=raceContext();
  const phase=[0,d/6,2*d/3,5*d/6,d];
  const values={running_style:['','逃げ','先行','差し','追込'].indexOf(state.style),distance_type:['','短距離','マイル','中距離','長距離'].indexOf(state.distance),ground_type:state.surface==='芝'?1:2,rotation:{右:1,左:2,直線:4,直:4}[state.turn],season:['','春','夏','秋','冬'].indexOf(state.season),track_id:geo?.track,course_distance:d,distance:d,is_basis_distance:Number(d%400===0)};
  let spans=[[0,d]], spatial=false, random=false, conditional=false, unknown=false;
  function clip(ranges){spatial=true;spans=spans.flatMap(([a,b])=>ranges.map(([c,e])=>[Math.max(a,c),Math.min(b,e)]).filter(([l,r])=>l<=r));}
  for(const token of branch.condition.split('&')){
    const m=token.match(/^(\w+)(==|!=|>=|<=|>|<)(-?\d+(?:\.\d+)?)$/);
    if(!m){unknown=true;continue}
    const [,key,op]=m,n=Number(m[3]);
    const pass=v=>({'==':v===n,'!=':v!==n,'>=':v>=n,'<=':v<=n,'>':v>n,'<':v<n})[op];
    if(Object.hasOwn(values,key)){if(values[key]==null)unknown=true;else if(!pass(values[key]))spans=[];continue}
    if(key==='always'&&op==='=='&&n===1)continue;
    if(op==='==' && n>=0 && n<4 && /^phase_(firsthalf|laterhalf|firstquarter|straight|corner)(_random)?$/.test(key)){
      const start=phase[n],end=phase[n+1],mid=(start+end)/2;
      random ||= key.endsWith('_random');
      if(key.includes('firsthalf'))clip([[start,mid]]);
      else if(key.includes('laterhalf'))clip([[mid,end]]);
      else if(key.includes('firstquarter'))clip([[start,start+(end-start)/4]]);
      else{clip([[start,end]]);if(!geo)unknown=true;else clip(key.includes('straight')?geo.straights:geo.corners)}
      continue;
    }
    if((key==='corner'&&n===0&&['==','!='].includes(op))||((key==='up_slope_random'||key==='down_slope_random'||key==='is_finalcorner_random')&&op==='=='&&n===1)){
      if(!geo){unknown=true;continue}
      random ||= key.endsWith('_random');
      if(key==='corner')clip(op==='=='?geo.straights:geo.corners);
      else if(key==='is_finalcorner_random')clip(geo.corners.slice(-1));
      else clip(geo.slopes.filter(x=>key==='up_slope_random'?x[2]>0:x[2]<0));
      continue;
    }
    if(key==='phase'||(key==='phase_random'&&op==='==')){random ||= key.endsWith('random');clip([0,1,2,3].filter(pass).map(i=>[phase[i],phase[i+1]]));continue}
    if(op!=='!='&&['distance_rate','remain_distance'].includes(key)){
      const v=key==='distance_rate'?d*n/100:d-n;
      const lower=key==='distance_rate'?op.startsWith('>'):op.startsWith('<');
      clip([op==='=='?[v,v]:lower?[v,d]:[0,v]]);continue
    }
    if(op==='==' && (key==='straight_random'&&n===1||key==='all_corner_random'&&n===1||key==='is_last_straight'&&n===1||key==='slope'&&[1,2].includes(n))){
      if(!geo){unknown=true;continue}
      random ||= key.endsWith('random');
      clip(key==='straight_random'?geo.straights:key==='all_corner_random'?geo.corners:key==='is_last_straight'?geo.straights.slice(-1):geo.slopes.filter(x=>n===1?x[2]>0:x[2]<0));continue
    }
    if(key==='order'){
      const fieldSize=state.racePreset==='loh202611'?12:state.racePreset==='cm202612'?9:null;
      if(fieldSize&&!Array.from({length:fieldSize},(_,i)=>i+1).some(pass))spans=[];
    }
    if(/^(order|order_rate|popularity|bashin_diff_infront|bashin_diff_behind|is_overtake|blocked_side_continuetime|blocked_front_continuetime|change_order_onetime|overtake_target_time|distance_diff_top|near_count|hp_per|compete_fight_count|activate_count_param_skill)$/.test(key)){conditional=true;continue}
    unknown=true;
  }
  if(branch.precondition){
    const alternatives=branch.precondition.split('@');
    const staticOnly=alternatives.every(a=>a.split('&').every(t=>Object.hasOwn(values,t.split(/[<>=!]/)[0])));
    if(staticOnly){const results=alternatives.map(condition=>raceBranch({condition}));if(results.every(x=>!x.spans.length))spans=[];else if(!results.some(x=>x.spans.length&&!x.unknown))unknown=true;}else unknown=true;
  }
  return {spans,spatial,random,conditional,unknown};
}
function skillRecord(s){
  const known=catalogSkills?.get(s.skillId);
  if(known)return known;
  const matches=catalog.skills.filter(x=>x.name===s.name);
  return matches.length===1?matches[0]:null;
}
function skillBranches(s){
  const info=skillRecord(s);
  const passive=catalog.effectTypes?.[info?.id]==='passive';
  return (info?.branches||[]).flatMap(b=>b.condition.split('@').map(condition=>{
    const result=raceBranch({...b,condition});result.passive=passive;
    if(!result.unknown&&(passive||result.conditional))result.spatial=true;
    return result;
  }));
}
function raceVerdict(s){
  const rows=skillBranches(s);
  if(!rows.length)return '判定保留';
  if(rows.some(r=>r.spans.length&&!r.unknown))return '条件適合';
  return rows.some(r=>r.spans.length)?'判定保留':'条件不一致';
}
function evolutionStatus(s){
  if(s.type!=='進化')return '取得可能';
  if(!active(s))return '取得不可';
  const parent=state.skills.find(x=>x.name===s.pre&&active(x));
  if(s.festival)return parent?'取得可能':'取得不可';
  const rule=catalog?.evolutionRules?.[s.skillId];
  if(!rule)return '判定不能';
  const parents=catalogChars.get(state.char)?.skillsByAwakening||{};
  const unlock=Object.entries(parents).find(([,ids])=>ids.includes(rule.parent));
  if(unlock && Number(unlock[0])>Number($('awakening').value))return '条件未達';
  if(!parent)return s.pre?'取得不可':'判定不能';
  const groups=trainingGroups(s);
  if(groups.some(g=>g.length&&g.every(x=>x.ok===false)))return '条件未達';
  return groups.length&&groups.every(g=>g.some(x=>x.ok===true))?'取得可能':'判定不能';
}
function acquisition(s){
  if(!active(s))return '取得不可';
  if(s.type!=='進化')return '取得可能';
  return typeof catalog==='undefined'||!catalog?'判定不能':evolutionStatus(s);
}
function selectionReason(s){
  const available=acquisition(s);
  const source=s.owner||s.source||s.type;
  if(available!=='取得可能')return '取得：'+available+'。'+(s.blockedReason||(s.pre?'進化元 '+s.pre+'・覚醒・育成実績を確認':'現在の編成・取得元の対象外'));
  const status=verdict(s);
  const catalogInfo=typeof catalogSkills==='undefined'?null:catalogSkills?.get(s.skillId);
  const condition=s.condition||catalogInfo?.branches?.map(b=>[b.precondition,b.condition].filter(Boolean).join(' → ')).join(' ／ ')||'条件資料なし';
  return '取得元：'+source+'。レース条件：'+status+'（'+condition+'）。自動選択：'+(autoEligible(s)?'対象':'除外')+($('autoMode').value==='course'?'（展開条件を除外）':'（展開条件付きも対象）')+(s.festival&&s.type==='進化'?'。シナリオ進化は先頭から最大2個':'');
}
function autoEligible(s,ignoreCategories=false){
  if(!ignoreCategories&&typeof catalog!=='undefined'&&catalog){const kind=trainingType(s);if(state.autoTargets?.[kind==='緑'?'green':kind==='回復'?'heal':'other']===false)return false;}
  if(acquisition(s)!=='取得可能'||verdict(s)!=='条件適合')return false;
  if($('autoMode').value!=='course'||!s.skillId)return true;
  if(typeof catalogSkills==='undefined'||!catalogSkills)return false;
  return skillBranches(s).some(r=>r.spans.length&&!r.conditional&&!r.unknown);
}
