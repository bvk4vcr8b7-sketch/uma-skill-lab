'use strict';

const setupSection = setupGrid.closest('section');
setupSection.classList.add('setup');
setupSection.querySelector('h2').remove();
const trainee = $('dbChar').closest('label');
const traineeControl = document.createElement('div');
traineeControl.className = 'traineeControl';
trainee.replaceWith(traineeControl);
traineeControl.append(...Array.from(trainee.childNodes));
const charEvents = document.createElement('div');
charEvents.id = 'charEvents';
charEvents.className = 'eventSlot';
const whiteHint = document.createElement('label');
whiteHint.textContent = '白ヒントLv';
const whiteLevel = document.createElement('select');
whiteLevel.id = 'whiteHint';
for (let level = 0; level <= 5; level++) whiteLevel.add(new Option(String(level)));
whiteLevel.onchange = () => {
  state.whiteHint = Number(whiteLevel.value);
  render();
};
whiteHint.append(whiteLevel);
const strip = document.createElement('div');
strip.className = 'deckStrip';
strip.setAttribute('aria-label', 'サポートカード編成');
deckHeading.replaceWith(strip);
const targets = ['dbChar', ...Array.from({length: 6}, (_, i) => 'dbCard' + i)];
for (const [index, target] of targets.entries()) {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'preview' + target;
  button.className = 'selectedImage';
  button.setAttribute('aria-label', index ? 'サポカ ' + index + ' を変更' : '育成ウマ娘を変更');
  button.onclick = () => openPicker(target);
  const preview = $(button.id);
  preview.replaceWith(button);
  if (!index) continue;
  const original = $(target).closest('label');
  const slot = document.createElement('div');
  slot.className = 'deckSlot';
  slot.append($(target), button, limitUI[index - 1].s);
  const events = document.createElement('div');
  events.className = 'eventSlot';
  events.id = 'cardEvents' + (index - 1);
  slot.append(events);
  strip.append(slot);
  original.remove();
}
const raceDetails = setupSection.querySelector('details');
setupGrid.insertBefore($('distance').closest('label'), strip);
setupGrid.insertBefore(whiteHint, strip);
setupGrid.after(charEvents, $('eventChoices'), raceDetails, strip);
$('dbSummary').hidden = true;
const manual = raceDetails.querySelector('.grid');
for (const k of ['char', ...Array.from({length: 6}, (_, i) => 'd' + i)]) {
  const field = $(k).closest('label');
  field.querySelector('select')?.remove();
  manual.append(field);
}
const plan = $('rows').closest('section');
plan.classList.add('plan');
plan.querySelector('h2').textContent = '取得スキル';
plan.querySelector('h2').after($('catalogStatus'));
const totals = document.createElement('footer');
totals.className = 'totals';
totals.setAttribute('aria-label', '消費スキルPtと残りPt');
totals.append($('stats'));
document.querySelector('main').after(totals);
for (const [id, title] of [['course', '発動区間'], ['editor', 'スキル・因子登録と保存'], ['catalogDetails', '編成データ・スキル検索'], ['dbstatus', '公開データ連携']]) {
  // The legacy race input and the timeline had the same ID. Address the timeline by its section.
  const section = id === 'course' ? Array.from(document.querySelectorAll('section')).find(s => s.querySelector('h2')?.textContent.includes('発動区間')) : $(id).closest('section');
  const disclosure = document.createElement('details');
  disclosure.className = 'toolPanel';
  const summary = document.createElement('summary');
  summary.textContent = title;
  section.querySelector('h2').remove();
  disclosure.append(summary, ...Array.from(section.childNodes));
  section.replaceWith(disclosure);
}
const timeline = document.querySelector('.toolPanel > div[id="course"]');
if (timeline) timeline.id = 'courseTimeline';
$('runtime').hidden = true;
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && pickerTarget) closePicker();
});
const setupPlanner = dbSetup;
dbSetup = function () {
  whiteLevel.value = String(state.whiteHint ?? 5);
  setupPlanner();
  drawSelectedImages();
};
whiteLevel.value = String(state.whiteHint ?? 5);
drawSelectedImages();

const secondary = document.createElement('details');
secondary.className = 'secondarySettings';
const secondaryTitle = document.createElement('summary');
secondaryTitle.textContent = '大会・覚醒・育成実績';
secondary.append(secondaryTitle);
const settingsFields = document.createElement('div');
settingsFields.className = 'grid';
secondary.append(settingsFields);
settingsFields.append(race, $('awakening').closest('label'));
for (const [key, name] of [[1,'スピード'],[2,'スタミナ'],[3,'パワー'],[4,'根性'],[5,'賢さ'],['fan','ファン数']]) {
  const field = document.createElement('label');
  field.textContent = name;
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.placeholder = '未入力';
  input.value = state.trainingFacts?.[key] ?? '';
  input.onchange = () => {
    (state.trainingFacts ??= {})[key] = input.value;
    render();
  };
  field.append(input);
  settingsFields.append(field);
}
setupGrid.after(secondary);

const dataTools = $('dbstatus').closest('details');
document.querySelector('main').append(dataTools);

const board = document.createElement('div');
board.id = 'rows';
plan.querySelector('.scroll').replaceWith(board);
for (const [i, slot] of [...strip.children].entries()) {
  const list=document.createElement('div');
  list.id='cardSkills'+i;
  list.className='cardSkills';
  slot.append(list);
}
board.parentNode.id='skillGroupsReady';
const pinned=document.createElement('div');
pinned.className='pinnedSettings';
setupSection.before(pinned);
pinned.append(setupGrid);
const options=document.createElement('details');
options.className='targetOptions';
const title=document.createElement('summary');title.textContent='自動選択の対象';options.append(title);
for (const [key,label,initial] of [['other','その他の適合スキル',true],['green','適合する緑',true],['heal','適合する回復',true],['training','予定した進化に必要なスキル',false],['raceNeeds','レース中の発動・強化に必要な候補',false]]) {
  const wrap=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=state.autoTargets?.[key]??initial;
  input.onchange=()=>{(state.autoTargets??={})[key]=input.checked;save()};
  wrap.append(input,label);options.append(wrap);
}
plan.querySelector('p:has(button)').before(options);
