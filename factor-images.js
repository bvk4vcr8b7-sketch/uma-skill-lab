'use strict';
const importBox=$('imageImport');
importBox.innerHTML='<h3>画像から因子を読み取る</h3><div class="dropArea" tabindex="0">画像をドロップ・貼り付け <input aria-label="因子画像" type="file" accept="image/*" multiple></div><small>同じ個体の画像をまとめて選択できます。初回は日本語認識モデルをダウンロードします。画像は端末内で処理します。</small><p role="status"></p><div class="ocrOriginals"></div><div class="ocrCandidates"></div><button hidden class="applyOcr">確認した候補を入力欄へ</button>';
const dropArea=importBox.querySelector('.dropArea'),ocrStatus=importBox.querySelector('[role=status]'),ocrRows=importBox.querySelector('.ocrCandidates');
let readingImages=false;
async function loadRecognition(){
  if(!window.Tesseract)await new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    script.onload=resolve;script.onerror=()=>reject(new Error('認識ライブラリを取得できません'));document.head.append(script);
  });
  return Tesseract.createWorker('jpn',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',langPath:'https://tessdata.projectnaptha.com/4.0.0_fast'});
}
function reviewRecognition(text){
  const names=new Set(catalog.skills.map(s=>s.name)),actors=[...new Set(catalog.characters.map(c=>c.characterName||c.name.split(']').at(-1)))];
  const normalize=s=>s.normalize('NFKC').replace(/\s/g,'').replace(/[〇◯]/g,'○');
  const lines=text.split(/\r?\n/).map(normalize).filter(Boolean);
  for(const line of lines){
    const mark=line.match(/(?:[★⭐]+|[★☆星]([1-3]))$/u),n=mark?(mark[1]?+mark[1]:[...mark[0]].length):0;
    const label=mark?line.slice(0,mark.index):line;
    const actor=actors.find(a=>a&&normalize(a)===label);
    const outfit=catalog.characters.find(c=>normalize(c.name)===label);
    if(actor||outfit){
      const row=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.dataset.actor=actor||outfit.characterName||outfit.name.split(']').at(-1);input.dataset.outfit=outfit?.name.match(/^\[(.*?)\]/)?.[1]||'';row.append(input,'ウマ娘候補 '+label);ocrRows.append(row);continue;
    }
    const row=document.createElement('div');row.className='ocrRow';
    const check=document.createElement('input');check.type='checkbox';check.ariaLabel='候補を採用';
    const input=document.createElement('input');input.value=label;input.ariaLabel='読み取り候補名';
    const type=document.createElement('select');type.add(option('','種類'));factorTypes.forEach(t=>type.add(option(t,t)));
    if(['スピード','スタミナ','パワー','根性','賢さ'].includes(label))type.value='青';
    else if(['芝','ダート','短距離','マイル','中距離','長距離','逃げ','先行','差し','追込'].includes(label))type.value='赤';
    else if(names.has(label)&&catalog.skills.filter(s=>s.name===label).every(s=>s.rarity===1))type.value='白';
    const stars=document.createElement('select');stars.add(option('','星数'));for(let i=1;i<=3;i++)stars.add(option(i,'★'+i));if(n>=1&&n<=3)stars.value=n;
    row.append(check,input,type,stars);const note=document.createElement('small');note.textContent=names.has(label)?'スキル名一致':'要確認';row.append(note);ocrRows.append(row);
  }
  importBox.querySelector('.applyOcr').hidden=!ocrRows.children.length;
}
async function readImages(files){
  const images=[...files].filter(f=>f.type.startsWith('image/'));if(!images.length||readingImages)return;
  let worker;readingImages=true;
  try{ocrStatus.textContent='日本語モデルを準備中…';worker=await loadRecognition();
    for(const [i,file] of images.entries()){ocrStatus.textContent=(i+1)+'/'+images.length+'枚を読み取り中…';const original=document.createElement('details'),summary=document.createElement('summary'),img=document.createElement('img');
      summary.textContent='照合用の原画像 '+(i+1);img.alt='因子の読み取り元';img.style.maxWidth='100%';
      const url=URL.createObjectURL(file);img.onload=()=>URL.revokeObjectURL(url);img.src=url;original.append(summary,img);importBox.querySelector('.ocrOriginals').append(original);
      reviewRecognition(await readFactorLines(worker,file))}
    ocrStatus.textContent='名前・種類・星数を確認し、採用する行を選んでください。';
  }catch{ocrStatus.textContent='画像を読み取れませんでした。再試行または手入力できます。'}
  finally{readingImages=false;if(worker)await worker.terminate();dropArea.querySelector('input').value=''}
}
dropArea.querySelector('input').onchange=e=>readImages(e.target.files);
dropArea.ondragover=e=>e.preventDefault();dropArea.ondrop=e=>{e.preventDefault();readImages(e.dataTransfer.files)};
document.addEventListener('paste',e=>{if(!tabPages[1].hidden&&e.clipboardData.files.length){e.preventDefault();readImages(e.clipboardData.files)}});
importBox.querySelector('.applyOcr').onclick=()=>{
  const checked=[...ocrRows.querySelectorAll('.ocrRow')].filter(r=>r.children[0].checked);
  const actors=[...ocrRows.querySelectorAll('[data-actor]:checked')];
  if(new Set(actors.map(x=>x.dataset.actor+x.dataset.outfit)).size>1||checked.some(r=>!r.children[1].value.trim()||!r.children[2].value||!r.children[3].value)){ocrStatus.textContent='ウマ娘は1人を選び、採用行の種類・星数を確認してください。';return}
  if(actors.length){$('factorName').value=actors[0].dataset.actor;if(actors[0].dataset.outfit)$('factorOutfit').value=actors[0].dataset.outfit}
  for(const r of checked)addTrait({name:r.children[1].value.trim(),type:r.children[2].value,stars:r.children[3].value});
  for(const r of checked)r.remove();for(const x of actors)x.parentElement.remove();
  ocrStatus.textContent='入力欄に反映しました。確認後に台帳へ保存してください。';
};
