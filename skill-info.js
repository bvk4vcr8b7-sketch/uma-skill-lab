'use strict';
const componentLabels={targetSpeed:['速度','spd'],heal:['回復','heal'],currentSpeed:['現在速','now'],speedWithDecel:['現在速','now'],acceleration:['加速','acc'],fullSpurtAcceleration:['全開加速','acc'],laneChangeSpeed:['レーン','misc']};
function opponentEffect(record){
  const text=record?.description||'';
  const target=text.match(/作戦が(逃げ|先行|差し|追込)のウマ娘|(?:目を付けた|すぐ後ろの|後ろの|前の|前[1-9]人までの|先頭から[1-9]人までの|ライバルの)ウマ娘/);
  if(!target)return null;
  const clause=text.slice(target.index).split(/自分の|自身の/)[0];
  const effects=[];
  if(/持久力を(?:ほんのちょっと|ちょっと|少し|わずかに)?減少/.test(clause))effects.push('持久力減少');
  if(/速度を(?:ほんのちょっと|ちょっと|少し|わずかに)?下げ/.test(clause))effects.push('速度低下');
  if(/加速力を(?:ほんのちょっと|ちょっと|少し|わずかに)?下げ/.test(clause))effects.push('加速力低下');
  if(/視野が(?:少し|わずかに)?狭くなる/.test(clause))effects.push('視野縮小');
  return effects.length?{target:target[0],effects}:null;
}
function skillComponents(s){
  const record=skillRecord(s),debuff=opponentEffect(record),badges=new Map();
  for(const k of catalog.components.get(record?.id)||[]){const pair=componentLabels[k]||(k.startsWith('passive')?['緑','green']:['その他','misc']);badges.set(pair[0],pair)}
  if(debuff)badges.set('デバフ',['デバフ','debuff']);
  return badges.size?[...badges.values()]:[['未確認','misc']];
}
function japaneseCondition(token){
  const m=token.match(/^(\w+)(==|>=|<=|>|<)(\d+(?:\.\d+)?)$/);if(!m)return null;
  const [,key,op,v]=m,n=Number(v),phase=['序盤','中盤','終盤','最終盤'];
  const choices={running_style:['','逃げ','先行','差し','追込'],distance_type:['','短距離','マイル','中距離','長距離'],ground_type:['','芝','ダート'],season:['','春','夏','秋','冬'],rotation:['','右回り','左回り'],phase};
  if(op==='=='&&choices[key]?.[n])return choices[key][n];
  if(key==='phase_random'&&op==='=='&&phase[n])return phase[n]+'のどこか';
  if(key==='distance_rate_after_random'&&op==='==')return 'コースの'+v+'％以降のどこか';
  if(key==='is_lastspurt'&&op==='=='&&n===1)return 'ラストスパート中';
  const target=key.match(/^running_style_count_(nige|senko|sashi|oikomi)_otherself$/);
  if(target&&op==='>='&&n===1)return '自分以外に'+({nige:'逃げ',senko:'先行',sashi:'差し',oikomi:'追込'}[target[1]])+'のウマ娘がいる';
  if(key==='accumulatetime'&&op==='>=')return 'スタートから'+v+'秒以上経過';
  if(key==='always'&&op==='=='&&n===1)return '常時';
  if(key==='order'&&op==='<=')return v+'位以内';
  if(key==='order'&&op==='>=')return v+'位以下';
  return null;
}
function readableBranches(record){
  const described=(record?.conditionText||[]).map(line=>{
    const parts=[...line.matchAll(/「([^」]+)」/g)].map(m=>m[1]);
    if(!parts.length||parts.some(x=>/[a-zA-Z_]/.test(x.replace(/(?:チャンミ|LoH)/g,''))))return null;
    return line.slice(0,line.lastIndexOf('」')+1).replace(/[「」]/g,'').replace(/>=([0-9.]+)/g,'$1以上').replace(/<=([0-9.]+)/g,'$1以下').replace(/==([0-9.]+)/g,'$1');
  });
  if(described.length&&described.every(Boolean))return [...new Set(described)].join(' ／ ');
  return [...new Set((record?.branches||[]).map(branch=>[branch.precondition,branch.condition].filter(Boolean).map(expr=>expr.split('@').map(alt=>{
    const tokens=alt.split('&').map(japaneseCondition);
    const labels=tokens.filter(Boolean);if(labels.length!==tokens.length)labels.push('詳細未確認');return labels.join('・');
  }).join(' または ')).join(' → ')))].join(' ／ ');
}
function effectFacts(record){
  const branches=(record?.conditionText||[]).map(line=>{
    const end=line.lastIndexOf('」');if(end<0)return {};
    const facts=line.slice(end+1).split('、').map(x=>x.trim()).filter(Boolean);
    let duration;const amounts=[];
    for(const fact of facts){
      const m=fact.match(/^(目標速度|現在速度|加速|体力|持続|スピード|スタミナ|パワー|根性|賢さ)(-?[0-9]+(?:\.[0-9]+)?)$/);
      if(!m)continue;
      const value=Number(m[2]),key=m[1];
      if(key==='持続'){duration=value>0?value+'秒':null;continue}
      if(['目標速度','現在速度','加速'].includes(key))amounts.push(key+' '+value/10000+(key==='加速'?' m/s²':' m/s'));
      else if(key==='体力')amounts.push('持久力 '+value/100+'％');
      else amounts.push(key+' '+value);
    }
    return {amount:amounts.join('・'),duration};
  });
  const label=k=>branches.map((b,i)=>(branches.length>1?'分岐'+(i+1)+'：':'')+(b[k]||'未確認')).join(' ／ ');
  return {amount:label('amount'),duration:label('duration')};
}
function openSkillInfo(i){
  const s=state.skills[i],r=skillRecord(s),box=$('skillInfo'),debuff=opponentEffect(r);
  const facts=effectFacts(r);
  const branches=skillBranches(s).filter(b=>b.spatial&&!b.unknown&&b.spans.length);
  const spans=branches.flatMap(b=>b.spans.map(([a,z])=>(b.passive?'常時':b.random?'ランダム':a===z?'固定':'条件付き')+' '+Math.round(a)+'–'+Math.round(z)+'m'));
  const row=(title,value)=>'<dt>'+title+'</dt><dd>'+esc(value||'未確認')+'</dd>';
  const routes=state.skills.filter(x=>sourceKey(x)===sourceKey(s));
  const routeMap=new Map();
  for(const route of routes){
    const title=route.factorTrait||(route.note?.startsWith('公開DB')?route.type:route.note)||route.type;
    const text=[title,route.eventChoiceLabel,'基本Lv'+(route.hint??0),'計算Lv'+hint(route)].filter(Boolean).join(' · ');
    // The curated and story feeds sometimes spell the same event with different long dashes.
    const cleaned=text.normalize('NFKC').replace(/[ー―—]{2,}/g,'――');
    const alias=[...routeMap.keys()].find(k=>k===cleaned||k.endsWith(' '+cleaned)||cleaned.endsWith(' '+k));
    if(!alias)routeMap.set(cleaned,text);
  }
  const routeLines=[...routeMap.values()];
  const raw=(r?.branches||[]).map(b=>[b.precondition,b.condition].filter(Boolean).join(' → ')).join(' ／ ');
  const pt=v=>v==null||s.pt==null||s.pt===''?'未確認':v+' Pt';
  box.innerHTML='<form method="dialog"><button autofocus>閉じる</button></form><h2>'+esc(s.name)+'</h2><p>'+esc(r?.description||'ゲーム内説明は未確認')+'</p><dl>'+
    row('効果',skillComponents(s).map(x=>x[0]).join('・'))+(debuff&&skillComponents(s).length>1?row('自身への効果',skillComponents(s).filter(x=>x[0]!=='デバフ').map(x=>x[0]).join('・')):'')+(debuff?row('相手への効果',debuff.target+'：'+debuff.effects.join('・')):'')+
    row('発動条件',readableBranches(r)||s.condition)+row('効果量',facts.amount)+row('基準持続時間',facts.duration)+
    row('発動可能区間',spans.length?[...new Set(spans)].join(' ／ '):verdict(s)==='条件不一致'?'発動不可':'未確認')+
    row('消費Pt','基礎 '+pt(stepPoints(s))+' ／ 通常 '+pt(cost(s,0))+' ／ 切れ者 '+pt(cost(s,10)))+
    row('取得元',s.owner||s.type)+'</dl><details><summary>取得経路（'+routeLines.length+'件）</summary><ul>'+routeLines.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></details>'+
    planDetails(s)+(raw?'<details><summary>開発者向け条件式</summary><code>'+esc(raw)+'</code></details>':'')+'<p><button onclick="$(\'skillInfo\').close();edit('+i+')">詳細編集</button></p>';
  box.showModal();
}
