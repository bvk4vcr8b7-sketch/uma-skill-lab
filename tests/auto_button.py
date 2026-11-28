def check_auto_button(page, baseline=False):
    button = page.get_by_role('button', name='条件に合う候補を選択')
    preset = page.locator('select').filter(has=page.locator('option[value="loh202611"]'))
    page.select_option('#dbChar', '101703', force=True)
    page.select_option('#dbScenario', '朋、史解き ～午式駿大祭～')
    page.select_option('#style', '差し')
    preset.select_option('loh202611')
    page.locator('#previewdbCard0').click()
    page.fill('#pickerSearch', 'いとどめでたき')
    page.locator('#pickerGrid button').first.click()
    for slot,query,choice in [(1,'永久の誓い、永久の輝き',1),(2,'Innovator',2)]:
        page.locator('#previewdbCard'+str(slot)).click()
        page.fill('#pickerSearch',query)
        page.locator('#pickerGrid button').first.click()
        page.locator('#reward'+str(slot)).click()
        page.locator('#cardEvents'+str(slot)+' select').first.select_option(index=choice)
    page.select_option('#autoMode', 'course')
    page.fill('#budget','1')
    page.locator('#budget').press('Tab')
    gold = ['神速','全身全霊','名にし負う夢','一所懸命','尻尾の滝登り']
    own = ['大望は煌めきとなりて','熱烈峻厳']
    scenario = ['捧ぐる願い','急之舞']
    def marked():
        return page.evaluate("() => [...new Set(state.skills.filter(s=>s.selected).map(s=>s.name))]")
    button.click()
    selected = marked()
    print('Kyoto', [(s,s in selected) for s in gold+own+scenario], flush=True)
    if baseline:
        return
    assert set(gold+own+scenario).issubset(selected)
    assert '気炎万丈' not in selected and '満願成就' not in selected
    assert 'コール&レスポンス' not in selected
    assert page.evaluate("acquisition(state.skills.find(s=>s.name==='満願成就'))")== '取得不可'
    assert page.evaluate("courseGroup(state.skills.find(s=>s.name==='気炎万丈'))")== '条件外'
    fan=page.get_by_label('ファン数',exact=True)
    assert not fan.is_visible()
    page.get_by_text('育成実績の詳細',exact=True).click()
    fan.fill('123456')
    fan.press('Tab')
    assert page.evaluate("() => {const [items]=chosen();const gold=items.get(200511);return gold.pt===340&&stepPoints(gold)===170&&items.has(200512)&&cost(items.get(415041),0)===0}")
    assert '不足' in page.locator('#stats').inner_text()
    assert all(page.get_by_role('button',name=s,exact=True).first.get_attribute('aria-pressed')=='true' for s in gold+own+scenario)
    page.evaluate("state.autoTargets={other:false,heal:false,green:false};save()")
    page.reload()
    page.wait_for_function("document.getElementById('catalogStatus').textContent.includes('568')")
    assert page.evaluate("state.trainingFacts.fan")=='123456'
    preset.select_option('cm202612')
    page.select_option('#style','逃げ')
    button.click()
    assert set(gold+scenario).issubset(marked()) and '熱烈峻厳' not in marked()
    preset.select_option('loh202611')
    page.select_option('#style','差し')
    button.click()
    assert set(gold+own+scenario).issubset(marked())


    page.select_option('#dbCourse','10606')
    button.click()
    assert '一所懸命' not in marked()
    assert '神速' in marked()
