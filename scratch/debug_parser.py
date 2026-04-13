import sys
import os

# Adiciona o diretório src ao path para importar o SandboxManager
sys.path.append(os.path.join(os.getcwd(), 'src'))

from logic.sandbox_manager import SandboxManager

lua_path = r"C:\Users\Lopez\Zomboid\Server\servertest_SandboxVars.lua"
sm = SandboxManager(lua_path)

data = sm.get_sandbox_vars()

print("--- CATEGORY AUDIT (UI RESTORE CHECK) ---")
for cat in data['categories']:
    cat_id = cat.get('id', 'Unknown')
    cat_name = cat.get('name', 'MISSING_NAME_PROPERTY!!!!') # THIS IS WHAT FRONTEND NEEDS
    print(f"\nCategory ID: {cat_id} | UI Name: {cat_name}")
    
    # Check sections and fields count
    field_count = len(cat.get('fields', []))
    print(f"  Fields/Sections: {field_count}")
    
    if cat_name == 'MISSING_NAME_PROPERTY!!!!':
        print("  ❌ ERROR: FRONTEND WILL NOT SEE THIS TAB!")

print("\n--- BLACKLIST CHECK (Should be empty) ---")
blacklist_found = []
for cat in data['categories']:
    for field in cat['fields']:
        if not 'section' in field:
            if field['id'] in ["VERSION", "WaterShut", "ElecShut", "AlarmDecayModifier"]:
                blacklist_found.append(field['id'])

if not blacklist_found:
    print("  ✅ SUCCESS: Blacklisted items are hidden.")
else:
    print(f"  ❌ ERROR: Found blacklisted items: {blacklist_found}")
