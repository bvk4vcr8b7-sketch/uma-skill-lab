'use strict';
const componentLabels={targetSpeed:['速度','spd'],heal:['回復','heal'],currentSpeed:['現在速','now'],speedWithDecel:['現在速','now'],acceleration:['加速','acc'],fullSpurtAcceleration:['全開加速','acc'],laneChangeSpeed:['レーン','misc']};
function skillComponents(s){
  const kinds=catalog.components.get(skillRecord(s)?.id)||[];
  const badges=new Map();
  for(const k of kinds){const pair=componentLabels[k]||(k.startsWith('passive')?['緑','green']:['その他','misc']);badges.set(pair[0],pair)}
  return badges.size?[...badges.values()]:[['未確認','misc']];
}
function openSkillInfo(i){
  const s=state.skills[i],r=skillRecord(s),box=$('skillInfo');
  const lines=(r?.conditionText||[]).join(' ／ ');
  const branches=skillBranches(s).filter(b=>b.spatial&&!b.unknown&&b.spans.length);
  const spans=branches.flatMap(b=>b.spans.map(([a,z])=>(b.passive?'常時':b.random?'ランダム':a===z?'固定':'条件付き')+' '+Math.round(a)+'–'+Math.round(z)+'m'));
  const row=(title,value)=>'<dt>'+title+'</dt><dd>'+esc(value||'未確認')+'</dd>';
  box.innerHTML='<form method="dialog"><button autofocus>閉じる</button></form><h2>'+esc(s.name)+'</h2><dl>'+
    row('取得元',s.owner||s.type)+row('説明',r?.description)+row('効果の種類',skillComponents(s).map(x=>x[0]).join('・'))+
    row('発動条件',r?.branches?.map(b=>[b.precondition,b.condition].filter(Boolean).join(' → ')).join(' ／ '))+row('効果量・基準持続時間（分岐別）',lines)+row('発動可能区間',spans.length?[...new Set(spans)].join(' ／ '):verdict(s)==='条件不一致'?'発動不可':'未確認')+
    row('基礎Pt ／ 通常 ／ 切れ者',[stepPoints(s),cost(s,0),cost(s,10)].map(v=>s.pt===''||v==null?'未確認':v).join(' ／ '))+
    row('判定',selectionReason(s))+(s.type==='サポカ通常'?row('通常ヒント', '1回の獲得Lv '+s.hint+' ／ 計算用の最終Lv '+hint(s)+'（個別設定を優先）'):'')+'</dl>'+
    (planDetails(s)||'<small>追加の進化・強化条件は未確認または対象外</small>')+'<p><button onclick="$(\'skillInfo\').close();edit('+i+')">詳細編集</button></p>';
  box.showModal();
}
