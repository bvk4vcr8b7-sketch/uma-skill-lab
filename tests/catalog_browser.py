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
        skill_button = page.get_by_role('button', name='手入力の回帰確認')
        skill_button.click()
        assert skill_button.get_attribute('aria-pressed') == 'false'
        skill_button.click()
        assert skill_button.get_attribute('aria-pressed') == 'true'
        page.get_by_text('編成データ・スキル検索', exact=True).click()
        page.fill('#catalogSkill', '右回り○')
        assert '90 Pt' in page.locator('#catalogSkillResults').text_content()
        assert page.locator('.totals').evaluate("(el) => getComputedStyle(el).position") == 'fixed'
        assert page.evaluate('document.documentElement.scrollWidth === innerWidth')
        page.reload()
        page.wait_for_function("document.getElementById('catalogStatus').textContent.includes('568')")
        assert page.locator('#budget').input_value() == '8765'
        assert page.evaluate("state.skills.some(x => x.name === '手入力の回帰確認' && x.selected)")
        assert page.evaluate("state.skills.some(x => x.name === '純真無垢')")
        assert page.locator('#dbChar').input_value() == '107501'
        assert not errors, errors
        page.close()
    browser.close()
