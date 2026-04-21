import sys
sys.path.append('d:/mods_manager')
from src.logic.sandbox_manager import SandboxManager
import os

# Create a dummy lua file
lua_content = """SandboxVars = {
    FloatValue = 1.0,
    IntValue = 10,
    ZeroFloat = 0.0,
}"""
test_lua = "d:/mods_manager/scratch/test_types.lua"
with open(test_lua, "w") as f:
    f.write(lua_content)

sm = SandboxManager(test_lua)
vars = sm.get_sandbox_vars()
print("Original Types:", sm.original_types)

# Modify values
new_vars = {
    "FloatValue": 2, # Changed int-like
    "IntValue": 20.0, # Changed float-like
    "ZeroFloat": 0,    # Changed to 0
}

sm.update_vars(new_vars)

with open(test_lua, "r") as f:
    updated_content = f.read()

print("\n--- UPDATED LUA ---")
print(updated_content)

if "FloatValue = 2.0," in updated_content:
    print("SUCCESS: FloatValue preserved as float.")
else:
    print("FAILURE: FloatValue lost decimal.")

if "IntValue = 20," in updated_content:
    print("SUCCESS: IntValue preserved as int.")
else:
    print("FAILURE: IntValue gained decimal unexpectedly.")

if "ZeroFloat = 0.0," in updated_content:
    print("SUCCESS: ZeroFloat preserved as 0.0.")
else:
    print("FAILURE: ZeroFloat lost decimal.")
