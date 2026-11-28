'use strict';
const tabNames=['Pt計算機','因子台帳','出走ウマ娘管理','コース分析','設定'];
const tabPages=tabNames.map(()=>document.createElement('div'));
const navigation=document.createElement('nav');
navigation.className='workspaceTabs';navigation.setAttribute('aria-label','機能');
const mainArea=document.querySelector('main');
const previousChildren=[...mainArea.children];
mainArea.prepend(navigation);
tabPages.forEach((pane,i)=>{
  pane.className='workspacePane';mainArea.append(pane);
  const button=document.createElement('button');button.textContent=tabNames[i];
  button.onclick=()=>showWorkspace(i);navigation.append(button);
});
tabPages[0].append(...previousChildren);
const chartPanel=$('courseTimeline').closest('details');
tabPages[3].append(chartPanel);chartPanel.open=true;
for(const id of ['editor','catalogDetails','dbstatus'])tabPages[4].append($(id).closest('details'));
function showWorkspace(i){
  tabPages.forEach((pane,j)=>{pane.hidden=i!==j;navigation.children[j].setAttribute('aria-pressed',String(i===j))});
  document.querySelector('.totals').hidden=i!==0;
  window.scrollTo(0,0);
}
function loadLibrary(){
  const saved=JSON.parse(localStorage.getItem('umaLibrary1')||'{}');
  return {factors:saved.factors||[],runners:saved.runners||[]};
}
function writeLibrary(lib){localStorage.setItem('umaLibrary1',JSON.stringify(lib))}
const regularEdit=edit;edit=function(i){showWorkspace(4);regularEdit(i)};
const oldExport=exportData;exportData=function(){
  const a=document.createElement('a');
  const url=URL.createObjectURL(new Blob([JSON.stringify({...state,libraryBackup:loadLibrary()},null,2)],{type:'application/json'}));
  a.href=url;a.download='uma-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
loadFile=async function(input){
  try{
    const data=JSON.parse(await input.files[0].text());
    if(!Array.isArray(data.skills)||!Array.isArray(data.deck)||data.deck.length!==6||!data.skills.every(s=>typeof s?.name==='string'))throw Error();
    const lib=data.libraryBackup;
    if(lib&&(!Array.isArray(lib.factors)||!lib.factors.every(f=>typeof f?.id==='string'&&Array.isArray(f.traits))||!Array.isArray(lib.runners)||!lib.runners.every(r=>Array.isArray(r?.plan?.skills))))throw Error();
    delete data.libraryBackup;
    localStorage.setItem('umaPlanner1',JSON.stringify(data));
    if(lib)writeLibrary(lib);
    location.reload();
  }catch{alert('読み込み失敗：形式・保存容量を確認してください')}
};
showWorkspace(0);
