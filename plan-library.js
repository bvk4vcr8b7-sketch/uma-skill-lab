'use strict';
const roles=['親1','親2','祖父母1','祖父母2','祖父母3','祖父母4'];
const factorTypes=['青','赤','緑','白','レース','シナリオ'];
tabPages[1].innerHTML='<section><h2>因子台帳</h2><label>検索<input id="factorSearch" type="search"></label><select id="factorList" aria-label="登録済み因子"></select><button id="newFactor">新規</button><div class="grid"><label>ウマ娘名<input id="factorName" required></label><label>衣装<input id="factorOutfit"></label><label>所有<select id="factorOwner"><option>自前</option><option>レンタル</option></select></label></div><div id="factorRows"></div><button id="addFactorRow">因子を追加</button> <button id="saveFactor">台帳に保存</button> <button id="deleteFactor" class="alt">削除</button><div id="imageImport"></div></section>';
tabPages[2].innerHTML='<section><h2>出走ウマ娘管理</h2><label>保存済み個体<select id="runnerList"></select></label><div class="grid"><label>個体名<input id="runnerName"></label><label>大会<input id="runnerRace"></label><label>育成状態<select id="runnerStatus"><option>育成予定</option><option>完成</option></select></label><label>採用<select id="runnerUse"><option>未定</option><option>採用</option><option>不採用</option></select></label><label>適性<input id="runnerFit" placeholder="芝A・長距離S など"></label></div><button id="runnerSave">現在の計画を新規保存</button> <button id="runnerUpdate">選択個体を更新</button> <button id="runnerOpen">計算機で再編集</button><div id="runnerComparison"></div></section>';
const inheritance=document.createElement('details');inheritance.className='inheritance';
inheritance.innerHTML='<summary>継承因子を呼び出す</summary><div class="grid"></div>';
strip.before(inheritance);
const factorSource=(id)=>loadLibrary().factors.find(f=>f.id===id);
function option(value,label){return new Option(label,value)}
function factorTitle(f){return [f.name,f.outfit,f.owner].filter(Boolean).join('・')}
function addTrait(trait={}){
  const row=document.createElement('div');row.className='traitRow';
  const type=document.createElement('select');type.ariaLabel='因子種類';factorTypes.forEach(t=>type.add(option(t,t)));type.value=trait.type||'白';
  const name=document.createElement('input');name.placeholder='因子名';name.ariaLabel='因子名';name.value=trait.name||'';
  const stars=document.createElement('select');stars.ariaLabel='星数';for(let n=1;n<=3;n++)stars.add(option(n,'★'+n));stars.value=trait.stars||1;
  const remove=document.createElement('button');remove.textContent='×';remove.ariaLabel='行を削除';remove.onclick=()=>row.remove();
  row.append(type,name,stars,remove);$('factorRows').append(row);
}
function fillFactor(f){
  $('factorName').value=f?.name||'';$('factorOutfit').value=f?.outfit||'';$('factorOwner').value=f?.owner||'自前';
  $('factorRows').replaceChildren();(f?.traits?.length?f.traits:[{}]).forEach(addTrait);
}
function libraryLists(){
  const lib=loadLibrary(),q=$('factorSearch').value,prev=$('factorList').value;
  $('factorList').replaceChildren(option('','新規登録'),...lib.factors.filter(f=>[factorTitle(f),...f.traits.map(t=>t.name)].join(' ').includes(q)).map(f=>option(f.id,factorTitle(f))));
  $('factorList').value=prev;
  for(const [i,input] of [...inheritance.querySelectorAll('select')].entries()){
    input.replaceChildren(option('','未選択'),...lib.factors.map(f=>option(f.id,factorTitle(f))));input.value=state.factorSlots?.[i]||'';
  }
  const r=$('runnerList').value;$('runnerList').replaceChildren(option('','個体を選択'),...lib.runners.map(x=>option(x.id,x.race+'・'+x.name)));$('runnerList').value=r;
  $('runnerComparison').innerHTML=lib.runners.map(x=>'<p><b>'+esc(x.name)+'</b> '+esc([x.race,x.status,x.use,x.fit,Object.values(x.plan.trainingFacts||{}).join('/')].join(' · '))+'</p>').join('');
}
function syncFactors(){
  const old=state.skills.filter(s=>s.factorRef);
  state.skills=state.skills.filter(s=>!s.factorRef);
  for(const [i,id] of (state.factorSlots||[]).entries()){
    const f=factorSource(id);if(!f)continue;
    for(const t of f.traits.filter(t=>['白','緑'].includes(t.type))){
      const matches=catalog.skills.filter(s=>s.name===t.name);
      if(matches.length!==1)continue;
      const r=matches[0],ref=i+'/'+id+'/'+r.id;
      state.skills.push({...old.find(s=>s.factorRef===ref),factorRef:ref,name:r.name,owner:roles[i]+' '+factorTitle(f),type:'因子',pt:r.baseSp,skillId:r.id,hint:0});
    }
  }
  render();
}
roles.forEach((role,i)=>{
  const label=document.createElement('label');label.textContent=role;const input=document.createElement('select');label.append(input);inheritance.lastElementChild.append(label);
  input.onchange=()=>{(state.factorSlots??=Array(6).fill(''))[i]=input.value;syncFactors()};
});
$('addFactorRow').onclick=()=>addTrait();
$('newFactor').onclick=()=>{$('factorList').value='';fillFactor(null)};
$('factorSearch').oninput=()=>{libraryLists();fillFactor(factorSource($('factorList').value))};
$('factorList').onchange=()=>fillFactor(factorSource($('factorList').value));
$('saveFactor').onclick=()=>{
  const name=$('factorName').value.trim();if(!name)return $('factorName').focus();
  const rows=[...$('factorRows').children].map(row=>({type:row.children[0].value,name:row.children[1].value.trim(),stars:+row.children[2].value})).filter(t=>t.name);
  const f={id:$('factorList').value||crypto.randomUUID(),name,outfit:$('factorOutfit').value.trim(),owner:$('factorOwner').value,traits:[...new Map(rows.map(t=>[t.type+'/'+t.name,t])).values()]};
  const lib=loadLibrary(),same=lib.factors.find(x=>x.id!==f.id&&factorTitle(x)===factorTitle(f)&&JSON.stringify(x.traits)===JSON.stringify(f.traits));if(same){alert('同じ因子を登録済みです');return}
  lib.factors=lib.factors.filter(x=>x.id!==f.id).concat(f);writeLibrary(lib);$('factorSearch').value='';libraryLists();$('factorList').value=f.id;syncFactors();
};
$('deleteFactor').onclick=()=>{const id=$('factorList').value;if(!id||!confirm('選択中の因子を削除しますか？'))return;const lib=loadLibrary();lib.factors=lib.factors.filter(f=>f.id!==id);writeLibrary(lib);state.factorSlots=(state.factorSlots||[]).map(x=>x===id?'':x);libraryLists();fillFactor(null);syncFactors()};
function saveRunner(update){
  const lib=loadLibrary(),id=update?$('runnerList').value:crypto.randomUUID();if(!id)return;
  const plan=JSON.parse(JSON.stringify(state));delete plan.libraryBackup;
  const runner={id,plan,awakening:$('awakening').value,name:$('runnerName').value.trim()||state.char,race:$('runnerRace').value.trim()||sel.selectedOptions[0].textContent,status:$('runnerStatus').value,use:$('runnerUse').value,fit:$('runnerFit').value};
  lib.runners=lib.runners.filter(x=>x.id!==id).concat(runner);writeLibrary(lib);libraryLists();$('runnerList').value=id;
}
$('runnerSave').onclick=()=>saveRunner(false);$('runnerUpdate').onclick=()=>saveRunner(true);
$('runnerList').onchange=()=>{const x=loadLibrary().runners.find(x=>x.id===$('runnerList').value);if(!x)return;for(const [id,k] of [['runnerName','name'],['runnerRace','race'],['runnerStatus','status'],['runnerUse','use'],['runnerFit','fit']])$(id).value=x[k]};
$('runnerOpen').onclick=()=>{const x=loadLibrary().runners.find(x=>x.id===$('runnerList').value);if(!x)return;localStorage.setItem('umaPlanner1',JSON.stringify({...x.plan,awakeningLevel:x.awakening}));location.reload()};
$('awakening').value=state.awakeningLevel||$('awakening').value;$('awakening').addEventListener('change',()=>{state.awakeningLevel=$('awakening').value;save()});
libraryLists();fillFactor(null);
