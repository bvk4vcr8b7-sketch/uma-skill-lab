"""Merge the pinned UmaUmaChecker Chara.json into the JP event catalog."""
import json
import sys
from pathlib import Path

source = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig"))["Chara"]
directory = Path(__file__).resolve().parents[1] / "data/catalog"
output = directory / "stories.json"
catalog = json.loads(output.read_text())
characters = json.loads((directory / "characters.json").read_text())

def key(name):
    return "".join(name.translate(str.maketrans("【】［］", "[][]")).split())

names = {key(character["name"]) for character in characters}
updated = set()
for group in source.values():
    for owner, record in group.items():
        name = key(owner)
        if name not in names:
            continue
        events = {}
        for event in catalog["Charactor"].get(name, []):
            events.update(event)
        for event in record["Events"]:
            for title, choices in event.items():
                rows = [{"Option": row["Title"], "Effect": row["Effect"]} for row in choices]
                if rows:
                    events[title] = rows
        if events:
            updated.add(name)
            catalog["Charactor"][name] = [{title: rows} for title, rows in events.items()]
output.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")))
print(f"照合衣装 {len(updated)} / {len(names)}")
print(f"育成イベント {sum(len(catalog['Charactor'].get(n, [])) for n in names)}")
