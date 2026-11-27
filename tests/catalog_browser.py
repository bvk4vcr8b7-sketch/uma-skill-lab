from playwright.sync_api import sync_playwright
import os
import subprocess

legacy = subprocess.check_output(
    ['git', 'show', '4833d7cbae1309cdb537055cfab86b0c77a77573:index.html'],
    encoding='utf-8',
)
with sync_playwright() as pw:
    browser = getattr(pw, os.environ.get('BROWSER', 'chromium')).launch()
    for width, height in [(1440, 900), (390, 844)]:
        page = browser.new_page(
            viewport={'width': width, 'height': height},
            is_mobile=width < 500,
            has_touch=width < 500,
        )
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('https://**/*', lambda route: route.abort())
        page.route('**/legacy.html', lambda route: route.fulfill(
            content_type='text/html; charset=utf-8', body=legacy
        ))
        page.goto('http://127.0.0.1:8765/legacy.html')
        before = page.evaluate("""() => {
            state.budget = '8765';
            state.skills.push({name:'手入力の回帰確認', type:'因子', owner:'', pt:120, hint:1, selected:true});
            save();
            return cost(state.skills.at(-1), 0);
        }""")
        page.goto('http://127.0.0.1:8765/')
        page.wait_for_function("document.getElementById('catalogStatus').textContent.includes('568')")
        assert page.locator('#dbCard0 option').count() == 569
        assert page.locator('#dbChar option').count() == 275
        assert page.evaluate('catalog.skills.length') == 2236
        assert page.locator('#dbCourse option').count() > 1
        assert page.locator('.deckSlot').count() == 6
        assert page.evaluate("imageURL('dbCard0', 30311).includes('/full/small/30311.png')")
        for target, name in [('dbCard0', '馳せて奪うは映山紅'), ('dbChar', '白光のレガリア')]:
            page.locator('#preview' + target).click()
            page.fill('#pickerSearch', name)
            page.locator('#pickerGrid button').first.click()
        details = page.locator('#catalogDetails').text_content()
        assert '静寂を裂いて' in details
        assert '万策尽きてなお' in details
        assert page.evaluate("state.skills.some(x => x.name === 'ストレートハート' && x.hint === 2)")
        page.locator('#previewdbCard1').click()
        page.fill('#pickerSearch', '2026-11-10')
        assert page.locator('#pickerGrid button').count() == 2
        page.locator('#pickerGrid button').first.click()
        page.locator('#previewdbCard0').click()
        page.fill('#pickerSearch', 'As if Guided')
        page.locator('#pickerGrid button').first.click()
        page.locator('#reward0').click()
        branch = page.locator('#cardEvents0 select').first
        branch.select_option(index=1)
        assert page.evaluate("state.skills.some(x => x.name === '華麗な踏み込み' && x.hint === 5)")
        branch.select_option(index=2)
        assert page.evaluate("!state.skills.some(x => x.name === '華麗な踏み込み')")
        assert page.evaluate("state.skills.some(x => x.name === '純真無垢' && x.hint === 2)")
        assert page.locator('#budget').input_value() == '8765'
        assert page.evaluate("cost(state.skills.find(x => x.name === '手入力の回帰確認'), 0)") == before
        page.fill('#q', '手入力の回帰確認')
        page.locator('#rows select').select_option('5')
        assert page.evaluate("cost(state.skills.find(x => x.name === '手入力の回帰確認'), 0)") == 72
        skill_button = page.get_by_role('button', name='手入力の回帰確認',exact=True)
        skill_button.click()
        assert skill_button.get_attribute('aria-pressed') == 'false'
        skill_button.click()
        assert skill_button.get_attribute('aria-pressed') == 'true'
        page.get_by_role('button',name='設定',exact=True).click()
        page.get_by_text('編成データ・スキル検索', exact=True).click()
        page.fill('#catalogSkill', '右回り○')
        assert '90 Pt' in page.locator('#catalogSkillResults').text_content()
        page.get_by_role('button',name='Pt計算機',exact=True).click()
        assert page.locator('.totals').evaluate("(el) => getComputedStyle(el).position") == 'fixed'
        assert page.evaluate('document.documentElement.scrollWidth === innerWidth')
        page.reload()
        page.wait_for_function("document.getElementById('catalogStatus').textContent.includes('568')")
        assert page.locator('#budget').input_value() == '8765'
        assert page.evaluate("state.skills.some(x => x.name === '手入力の回帰確認' && x.selected)")
        assert page.evaluate("state.skills.some(x => x.name === '純真無垢')")
        assert page.locator('#dbChar').input_value() == '107501'
        # A saved public cache can use a different spelling for wisdom.
        page.evaluate("""() => {
            rawDB['data/supports.json'].find(c => c.id === 30289).type = 'intelligence';
            dbSetup();
        }""")
        page.locator('#previewdbCard0').click()
        for kind in ['speed','stamina','power','guts','wisdom','friend','group']:
            page.evaluate("(kind) => {filters.type.value=kind;drawPicker()}", kind)
            assert page.locator('#pickerGrid button span').all_text_contents() == page.evaluate(
                "(kind) => catalog.supports.filter(c => c.type===kind).map(c=>c.name+' / '+c.rarity)", kind)
        page.evaluate("filters.type.value='wisdom';drawPicker()")
        page.fill('#pickerSearch','フォーエバーヤング')
        assert page.locator('#pickerGrid button').filter(has_text='フォーエバーヤング').count() == 2
        page.get_by_role('button', name='閉じる', exact=True).click()
        page.select_option('#dbCourse','10606')
        page.select_option('#style','先行')
        page.get_by_role('button', name='条件に合う候補を選択').click()
        assert page.evaluate("state.skills.some(x=>x.name==='先行直線○' && x.selected)")
        assert 'ランダム候補' in page.locator('#courseTimeline').text_content()
        assert '上り坂' in page.locator('#courseTimeline').text_content()
        page.select_option('#style','差し')
        page.get_by_role('button', name='条件に合う候補を選択').click()
        assert not page.evaluate("state.skills.some(x=>x.name==='先行直線○' && x.selected)")
        assert page.evaluate("state.skills.filter(s=>s.type==='進化'&&s.selected).every(s=>selfEvolution(s)||evolutionStatus(s)==='取得可能')")
        assert page.evaluate("raceBranch({condition:'remain_distance==200'}).spans[0][0]===2200")
        assert page.evaluate("raceBranch({condition:'unverified_condition==1'}).unknown")
        assert page.evaluate("document.documentElement.scrollWidth===innerWidth")
        if width < 500:
            assert page.locator('.secondarySettings input').first.is_visible()
            assert page.locator('.deckSlot').last.bounding_box()['y'] == page.locator('.deckSlot').first.bounding_box()['y']
        page.evaluate("$('dbChar').value='100101';$('dbChar').onchange()")
        # Real skill 100101311 requires awakening 7 and four skills of either strategy.
        statuses = page.evaluate("""() => {
            const evo = state.skills.find(s => s.skillId === 100101311);
            const results = [evolutionStatus(evo)];
            $('awakening').value='7';dbApply();
            const current=state.skills.find(s=>s.skillId===100101311);
            clearSel();
            results.push(evolutionStatus(current));
            for(let i=0;i<4;i++)state.skills.push({
                name:'代替条件テスト'+i,type:'因子',selected:true,
                activation:{branches:[{styles:['sashi']}]}
            });
            results.push(evolutionStatus(current));
            return results;
        }""")
        assert statuses == ['条件未達','条件未達','取得可能'], statuses
        costs = page.evaluate("""() => {
            const item = {name:'費用試験',pt:130,type:'因子',owner:''};
            return [0,10].map(k => [0,1,2,3,4,5].map(h => cost({...item,hint:h},k)));
        }""")
        assert costs == [[130,117,104,91,84,78],[117,104,91,78,71,65]]
        assert page.evaluate("""() => {
            clearSel();
            const low={name:'先行直線○',skillId:201312,type:'因子',owner:'',hint:0,pt:130};
            const high={...low,name:'先行直線◎',skillId:201311,pt:270,selected:true};
            state.skills= [high,low,{...low,hint:5,selected:true}];
            const [items]=chosen();
            return items.size===2 && cost(items.get(low.name),0)===78 &&
                   cost(items.get(high.name),0)===140 && cost({...high,type:'進化'},0)===0;
        }""")
        page.select_option('#dbScenario','らっしゃい！トレセン軒！')
        assert page.evaluate("state.skills.some(s=>s.blockedReason)")
        assert not page.evaluate("state.skills.some((s,i)=>s.blockedReason && document.getElementById('skill'+i))")
        page.select_option('#filter','全件')
        page.fill('#q','')
        assert page.evaluate("state.skills.filter(s=>s.blockedReason).every(s=>document.getElementById('skill'+state.skills.indexOf(s))?.disabled)")
        page.select_option('#autoMode','course')
        page.get_by_role('button', name='条件に合う候補を選択').click()
        assert page.evaluate("state.skills.filter(s=>s.selected).every(s=>selfEvolution(s)||autoEligible(s))")
        assert page.locator('#courseTimeline .axisTick').count()==5
        page.select_option('#dbChar','101703',force=True)
        page.locator('select').filter(has=page.locator('option[value="loh202611"]')).select_option('loh202611',force=True)
        page.select_option('#style','差し')
        assert page.evaluate("""() => {
            clearSel();
            const i=state.skills.findIndex(s=>s.skillId===101703211), evo=state.skills[i];
            if(!selfEvolution(evo)||!planAllowed(evo))return false;
            auto();
            if(!evo.selected||!state.skills.find(s=>s.name==='大望は煌めきとなりて')?.selected)return false;
            const base={type:'サポカ通常',hint:3,name:'一括検証',owner:'検証',db:true};
            state.whiteHint=5;
            if(hint(base)!==5||hint({...base,type:'因子'})!==3||hint({...base,type:'サポカ金'})!==3)return false;
            state.hintOverrides[skillHintKey(base)]=1;
            if(hint(base)!==1)return false;
            return evo.selected && raceNeeds(evo).some(r=>r.need===7) &&
                !trainingGroups(evo).flat().some(x=>x.req?.need===7) &&
                verdict(state.skills.find(x=>x.name==='気炎万丈'))==='条件不一致' &&
                verdict(state.skills.find(x=>x.name==='大望は煌めきとなりて'))!=='条件不一致' &&
                document.querySelectorAll('.deckSlot .cardSkills').length===6 &&
                document.documentElement.scrollWidth===innerWidth;
        }""")
        assert not errors, errors
        page.close()
    browser.close()
