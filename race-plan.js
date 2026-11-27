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
  const values={running_style:['','逃げ','先行','差し','追込'].indexOf(state.style),distance_type:['','短距離','マイル','中距離','長距離'].indexOf(state.distance),ground_type:state.surface==='芝'?1:2,rotation:{右:1,左:2,直線:4,直:4}[state.turn],season:['','春','夏','秋','冬'].indexOf(state.season),track_id:geo?.track,distance:d,is_basis_distance:Number(d%400===0)};
  let spans=[[0,d]], spatial=false, random=false, conditional=false, unknown=false;
  function clip(ranges){spatial=true;spans=spans.flatMap(([a,b])=>ranges.map(([c,e])=>[Math.max(a,c),Math.min(b,e)]).filter(([l,r])=>l<=r));}
  for(const token of branch.condition.split('&')){
    const m=token.match(/^(\w+)(==|>=|<=|>|<)(-?\d+(?:\.\d+)?)$/);
    if(!m){unknown=true;continue}
    const [,key,op]=m,n=Number(m[3]);
    const pass=v=>({'==':v===n,'>=':v>=n,'<=':v<=n,'>':v>n,'<':v<n})[op];
    if(Object.hasOwn(values,key)){if(values[key]==null)unknown=true;else if(!pass(values[key]))spans=[];continue}
    if(key==='phase'||(key==='phase_random'&&op==='==')){random ||= key.endsWith('random');clip([0,1,2,3].filter(pass).map(i=>[phase[i],phase[i+1]]));continue}
    if(['distance_rate','remain_distance'].includes(key)){
      const v=key==='distance_rate'?d*n/100:d-n;
      const lower=key==='distance_rate'?op.startsWith('>'):op.startsWith('<');
      clip([op==='=='?[v,v]:lower?[v,d]:[0,v]]);continue
    }
    if(op==='==' && (key==='straight_random'&&n===1||key==='all_corner_random'&&n===1||key==='is_last_straight'&&n===1||key==='slope'&&[1,2].includes(n))){
      if(!geo){unknown=true;continue}
      random ||= key.endsWith('random');
      clip(key==='straight_random'?geo.straights:key==='all_corner_random'?geo.corners:key==='is_last_straight'?geo.straights.slice(-1):geo.slopes.filter(x=>n===1?x[2]>0:x[2]<0));continue
    }
    if(/^(order|order_rate|popularity|bashin_diff_infront|is_overtake)$/.test(key)){conditional=true;continue}
    unknown=true;
  }
  if(branch.precondition)unknown=true;
  return {spans,spatial,random,conditional,unknown};
}
function skillBranches(s){
  const info=catalogSkills?.get(s.skillId);
  return (info?.branches||[]).flatMap(b=>b.condition.split('@').map(condition=>raceBranch({...b,condition})));
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
  const acquired=new Map(state.skills.filter(x=>active(x)&&x.selected&&x.type!=='進化').map(x=>[x.name,x]));
  const groups=rule.groups.map(group=>group.map(([kind,key,count,threshold])=>{
    if(kind==='skill'){const name=catalogSkills.get(key)?.name;if(!name)return null;return state.skills.some(x=>active(x)&&x.name===name&&x.selected)}
    if(kind==='a_skill'){
      const axis={strat:'styles',dist:'distances',trn:'grounds'}[key];
      const tag={strat:['','nige','senko','sashi','oikomi'],dist:['short','mile','mid','long'],trn:['','turf','dirt']}[key]?.[count];
      if(!axis||!tag)return null;
      let matched=0, unknown=0;
      for(const skill of acquired.values()){
        const branches=skill.activation?.branches;
        if(!branches?.length){unknown++;continue}
        if(branches.every(b=>b[axis]?.length===1&&b[axis][0]===tag))matched++;
      }
      return matched>=threshold?true:matched+unknown<threshold?false:null;
    }
    if(kind==='e_skill'){
      const effect={speed:'速度',accel:'加速',reco:'回復',green:'緑'}[key];
      if(!effect)return null;
      const known=[...acquired.values()].filter(x=>x.kind===effect).length;
      const unknown=[...acquired.values()].filter(x=>!x.kind||['不明','複合'].includes(x.kind)).length;
      return known>=count?true:known+unknown<count?false:null;
    }
    if(kind==='stat'||kind==='fan'){
      const v=state.trainingFacts?.[kind==='fan'?'fan':key];return v==null||v===''?null:Number(v)>=(kind==='fan'?key:count);
    }
    return null;
  }));
  if(groups.some(g=>g.length&&g.every(v=>v===false)))return '条件未達';
  return groups.length&&groups.every(g=>g.includes(true))?'取得可能':'判定不能';
}
function courseTimeline(skills){
  const {d,geo}=raceContext();
  const lane=(name,spans)=>'<p>'+esc(name)+'</p><div class="track">'+spans.map(([a,b])=>'<span class="bar" style="left:'+a/d*100+'%;width:max(2px,'+(b-a)/d*100+'%)"></span>').join('')+'</div>';
  let result='序盤 0–'+Math.round(d/6)+'m ／ 中盤 –'+Math.round(d*2/3)+'m ／ 終盤 –'+d+'m';
  if(geo){for(const [name,spans] of [['直線',geo.straights],['コーナー',geo.corners],['上り坂',geo.slopes.filter(x=>x[2]>0)],['下り坂',geo.slopes.filter(x=>x[2]<0)]])if(spans.length)result+=lane(name,spans);}
  else result+='<p>コース形状未照合</p>';
  for(const s of skills){
    if(s.start!==''&&s.end!==''&&s.start!=null&&s.end!=null&&+s.start>=0&&+s.end>=+s.start&&+s.end<=d){result+=lane(s.name+' · 手動登録',[[+s.start,+s.end]]);continue}
    const branches=skillBranches(s).filter(r=>r.spans.length);
    if(!branches.length||branches.some(r=>r.unknown||!r.spatial))result+='<p>'+esc(s.name)+' · 区間判定不能</p>';
    for(const r of branches.filter(r=>r.spatial&&!r.unknown))result+=lane(s.name+' · '+(r.random?'ランダム候補':r.spans.every(([a,b])=>a===b)?'固定位置':'発動可能区間')+(r.conditional?' · 順位・展開条件あり':'')+' '+r.spans.map(([a,b])=>Math.round(a)+'–'+Math.round(b)+'m').join(' / '),r.spans);
  }
  return result;
}
