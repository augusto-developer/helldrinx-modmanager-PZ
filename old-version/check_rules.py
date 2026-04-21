import sys
sys.path.append('src')
from logic.manager import PZModManager

mgr = PZModManager()
mgr.load_cache()
mgr._load_sorting_rules()

cache_ids = {m['id'] for m in mgr.mods_data}
cache_ids_lower = {m['id'].lower(): m['id'] for m in mgr.mods_data}

missing_from_cache = []
wrong_case = []

print("Analyzing sorting_rules.txt against current mod cache...")
print("="*60)

for rule_mod in mgr.sorting_rules.keys():
    if rule_mod not in cache_ids:
        if rule_mod.lower() in cache_ids_lower:
            wrong_case.append(f"Rule: '{rule_mod}' -> Actual: '{cache_ids_lower[rule_mod.lower()]}'")
        else:
            missing_from_cache.append(rule_mod)

    # Check dependencies in loadAfter, loadBefore, incompatibleMods
    rules = mgr.sorting_rules[rule_mod]
    for dep_list_name in ['loadAfter', 'loadBefore', 'incompatibleMods']:
        for dep in rules.get(dep_list_name, []):
            if dep not in cache_ids:
                if dep.lower() in cache_ids_lower:
                    wrong_case.append(f"Rule dep: '{dep}' (in {rule_mod}.{dep_list_name}) -> Actual: '{cache_ids_lower[dep.lower()]}'")

print(f"\nFound {len(wrong_case)} Case Mismatches:")
for w in wrong_case:
    print(" -", w)

print(f"\nRules referring to mods not in cache (missing or uninstalled): {len(missing_from_cache)}")
for m in missing_from_cache:
    print(" -", m)

