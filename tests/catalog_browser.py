from playwright.sync_api import sync_playwright
import json
with sync_playwright() as pw:
 import os
 browser=getattr(pw,os.environ.get('BROWSER','chromium')).launch()
 for size in [(1440,900),(390,844)]:
  page=browser.new_page(viewport={'width':size[0],'height':size[1]},is_mobile=size[0]<500)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://**/*',lambda route:route.abort())
  page.goto('http://127.0.0.1:8765/')
  page.wait_for_function("document.getElementById('catalogStatus').textContent.includes('568')",timeout=10000)
  print(page.locator('#catalogStatus').inner_text(),errors)
  assert page.locator('#dbCard0 option').count()==569
  assert page.locator('#dbChar option').count()==275
  for target, name in [('dbCard0','馳せて奪うは映山紅'),('dbChar','白光のレガリア')]:
   page.locator('#preview'+target).click()
   page.fill('#pickerSearch',name)
   page.locator('#pickerGrid button').first.click()
  assert '静寂を裂いて' in page.locator('#catalogDetails').text_content()
  assert '万策尽きてなお' in page.locator('#catalogDetails').text_content()
  page.locator('#previewdbCard1').click()
  page.fill('#pickerSearch','2026-11-10')
  assert page.locator('#pickerGrid button').count()==2
  page.locator('#pickerGrid button').first.click()
  page.locator('#budget').fill('8765')
  page.locator('#budget').dispatch_event('change')
  page.evaluate("state.skills.push({name:'手入力の回帰確認',type:'因子',owner:'',pt:120,hint:1,selected:true});save()")
  page.reload()
  page.wait_for_function("document.getElementById('catalogStatus').textContent.includes('568')")
  assert page.locator('#budget').input_value()=='8765'
  assert page.evaluate("state.skills.some(x=>x.name==='手入力の回帰確認'&&x.selected)")
  assert page.locator('#dbChar').input_value()=='107501'
  assert not errors,errors
  page.close()
 browser.close()
