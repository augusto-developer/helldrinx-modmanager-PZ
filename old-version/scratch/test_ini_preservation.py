import sys
sys.path.append('d:/mods_manager')
from src.logic.ini_manager import IniManager
import os

# Create a dummy ini file
ini_content = """PVPMeleeDamageModifier=30
MaxPlayers=32
VoiceMinDistance=10.0
"""
test_ini = "d:/mods_manager/scratch/test_vars.ini"
with open(test_ini, "w") as f:
    f.write(ini_content)

im = IniManager(test_ini)

# Modify values
updates = {
    "PVPMeleeDamageModifier": 40, # Should be 40.0
    "MaxPlayers": 24,             # Should be 24
    "VoiceMinDistance": 5,        # Should be 5.0
}

im.save_ini_vars(updates)

with open(test_ini, "r") as f:
    updated_content = f.read()

print("\n--- UPDATED INI ---")
print(updated_content)

if "PVPMeleeDamageModifier=40.0" in updated_content:
    print("SUCCESS: PVPMeleeDamageModifier forced to float.")
else:
    print("FAILURE: PVPMeleeDamageModifier is not float.")

if "MaxPlayers=24" in updated_content and "24.0" not in updated_content:
    print("SUCCESS: MaxPlayers preserved as int.")
else:
    print("FAILURE: MaxPlayers became float.")

if "VoiceMinDistance=5.0" in updated_content:
    print("SUCCESS: VoiceMinDistance preserved as float.")
else:
    print("FAILURE: VoiceMinDistance lost decimal.")
