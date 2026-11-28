def check_skill_sources(page):
    assert page.evaluate("state.skills.filter(s=>s.type==='因子').length")==0
    assert '継承因子が設定されていません' in page.locator('.inheritance summary').inner_text()
    page.locator('#previewdbCard0').click()
    page.fill('#pickerSearch','いとどめでたき')
    page.locator('#pickerGrid button').first.click()
    slot=page.locator('#cardSkills0')
    button=slot.get_by_role('button',name='神速',exact=True)
    assert button.count()==1
    assert page.evaluate("state.skills.filter(s=>s.skillId===202551&&s.owner===state.deck[0]).length")>=2
    button.click()
    assert button.get_attribute('aria-pressed')=='true'
    assert button.evaluate("el=>el.closest('.skillEntry').classList.contains('isPlanned')")
    assert page.evaluate("chosen()[0].get(202551)?.name")== '神速'
    slot.get_by_role('button',name='神速の詳細',exact=True).click()
    dialog=page.locator('#skillInfo')
    assert '0.35 m/s' in dialog.inner_text() and '3秒' in dialog.inner_text()
    assert 'distance_rate' not in dialog.inner_text()
    dialog.get_by_role('button',name='閉じる').click()
    button.click()
    assert not page.evaluate("chosen()[0].has(202551)")
    assert page.evaluate("""() => {
       const s={skillId:200831,name:'逃げけん制',type:'キャラ',owner:state.char,pt:130,hint:0};
       state.skills.push(s);render();openSkillInfo(state.skills.indexOf(s));
       return skillComponents(s).map(x=>x[0]).join()==='デバフ' &&
         skillComponents({skillId:200691}).map(x=>x[0]).includes('回復') &&
         skillComponents({skillId:200691}).map(x=>x[0]).includes('デバフ')
    }""")
    assert '作戦が逃げのウマ娘：持久力減少' in dialog.inner_text()
    assert 'スタートから5秒以上' in dialog.inner_text()
    assert 'running_style_count' not in dialog.inner_text()
    dialog.get_by_role('button',name='閉じる').click()
    assert page.evaluate("""() => {
      state.autoTargets={debuff:false};
      return !autoEligible(state.skills.find(s=>s.skillId===200831));
    }""")


    assert page.evaluate("""() => {
      const routes=state.skills.filter(s=>s.skillId===202551&&s.owner===state.deck[0]);
      routes[0].hint=1;routes[1].hint=4;toggleSkill(state.skills.indexOf(routes[0]),true);
      const [items]=chosen(),best=items.get(202551);
      return hint(best)===4 && [...items.values()].filter(s=>s.skillId===202551).length===1 &&
        document.querySelectorAll('#cardSkills0 [aria-label="神速"]').length===1;
    }""")
    slot.get_by_role('button',name='神速の詳細',exact=True).click()
    dialog.get_by_text('取得経路（2件）',exact=True).click()
    assert '基本Lv1' in dialog.inner_text() and '基本Lv4' in dialog.inner_text()
    dialog.get_by_role('button',name='閉じる').click()

    page.locator('#previewdbCard1').click()
    page.fill('#pickerSearch','白き稲妻の如く')
    page.locator('#pickerGrid button').first.click()
    page.locator('#reward1').click()
    page.locator('#cardEvents1 select').first.select_option(index=1)
    assert page.locator('#cardSkills0 [aria-label="神速"]').count()==1
    assert page.locator('#cardSkills1 [aria-label="神速"]').count()==1
    assert page.evaluate("() => [...chosen()[0].values()].filter(s=>s.skillId===202551).length===1")
