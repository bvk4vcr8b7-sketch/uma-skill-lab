'use strict';

function storyChoices(item, group, existingEvents, skills) {
  const events = catalog.stories[group][catalogKey(item.name)] || [];
  const curated = existingEvents.filter(e => e.supportNameMatch && item.name.includes(e.supportNameMatch));
  const cleanTitle = title => title.normalize('NFKC').replace(/[『』「」\s]/g, '');
  const nameKey = name => name.normalize('NFKC').replace(/◯/g, '○');
  const byName = new Map();
  for (const skill of skills) {
    if (!skill.name) continue;
    const key = nameKey(skill.name);
    const matches = byName.get(key) || [];
    matches.push(skill);
    byName.set(key, matches);
  }
  const seen = new Set();
  return events.flatMap(entry => Object.entries(entry).flatMap(([title, options]) => {
    const titleKey = cleanTitle(title);
    if (seen.has(titleKey) || curated.some(e => cleanTitle(e.label).endsWith(titleKey))) return [];
    seen.add(titleKey);
    const choices = options.map((option, index) => {
      const rewards = new Map();
      for (const line of option.Effect.split('\n')) {
        const match = line.trim().match(/^[『「](.+?)[』」](?:の)?ヒント(?:Lv|レベル)\s*[+＋]\s*([1-5])$/i);
        if (!match) continue;
        const [, name, level] = match;
        const candidates = byName.get(nameKey(name)) || [];
        if (candidates.length !== 1) continue;
        const skill = candidates[0];
        const hintLevel = Number(level);
        if ((rewards.get(skill.id)?.hintLevel || 0) < hintLevel) {
          rewards.set(skill.id, {skillId: skill.id, skillName: skill.name, hintLevel});
        }
      }
      return {id: String(index), label: option.Option + '｜' + option.Effect.replace(/\n/g, ' / '), effect: option.Effect, skills: [...rewards.values()]};
    });
    if (!choices.length) return [];
    const id = 'story:' + group + ':' + item.id + ':' + title;
    if (choices.length === 1) return [{id, label: title, skills: choices[0].skills}];
    if (choices.every(x => x.effect === choices[0].effect)) return [{id, label: title, skills: choices[0].skills}];
    return [{id, label: title, choices, variableReward: true}];
  }));
}
