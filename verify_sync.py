import sys
import os
import shutil

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.logic.manager import PZModManager

def test_sync():
    manager = PZModManager()
    
    # Use a temporary file for testing
    test_ini = "d:\\mods_manager\\tmp_servertest.ini"
    orig_ini = "C:\\Users\\Lopez\\Zomboid\\Server\\servertest.ini"
    
    if not os.path.exists(orig_ini):
        print(f"Error: Original ini not found at {orig_ini}")
        return

    shutil.copy(orig_ini, test_ini)
    manager.server_config_path = test_ini
    
    print(f"Starting Sync Test on {test_ini}...")
    result = manager.sync_servertest_ini()
    print(f"Result: {result}")
    
    # Check the file content
    with open(test_ini, "r", encoding="utf-8") as f:
        content = f.read()
        
    mods_line = [l for l in content.splitlines() if l.startswith("Mods=")]
    workshop_line = [l for l in content.splitlines() if l.startswith("WorkshopItems=")]
    map_line = [l for l in content.splitlines() if l.startswith("Map=")]
    
    print("\nVerification:")
    if mods_line:
        mods = mods_line[0].replace("Mods=", "").split(";")
        print(f"Mods count: {len(mods)}")
        print("\nTop 10 Mods Analysis:")
        for mid in mods[:10]:
            rules = manager.sorting_rules.get(mid, {})
            minfo = next((m for m in manager.mods_data if m['id'] == mid), None)
            cat = rules.get('category') or (minfo.get('category') if minfo else "N/A")
            print(f"- {mid:40} | Cat: {cat:15}")
    
    if workshop_line:
        wids = workshop_line[0].replace("WorkshopItems=", "").split(";")
        print(f"WorkshopItems count: {len(wids)}")
        print(f"First 5: {wids[:5]}")
        
    if map_line:
        maps = map_line[0].replace("Map=", "").split(";")
        print(f"Map line ends correctly: {maps[-1] == 'Muldraugh, KY'}")
        print(f"Last 2: {maps[-2:]}")

if __name__ == "__main__":
    test_sync()
