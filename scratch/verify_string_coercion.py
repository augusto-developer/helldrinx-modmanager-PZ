
import sys
import os

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.logic.sandbox_manager import SandboxManager

def test_string_to_number_coercion():
    print("Testing String-to-Number Coercion...")
    dummy_lua = "test_SandboxVars_String.lua"
    with open(dummy_lua, "w") as f:
        f.write("SandboxVars = {\n")
        f.write("    -- Adds free points during character creation. Min: -100 Max: 100 Default: 0\n")
        f.write("    CharacterFreePoints = 0,\n")
        f.write("}\n")
    
    manager = SandboxManager(dummy_lua)
    manager.get_sandbox_vars()
    
    # Simulate UI sending a string "20"
    new_vars = {"CharacterFreePoints": "20"}
    manager.update_vars(new_vars)
    
    with open(dummy_lua, "r") as f:
        content = f.read()
        print(f"LUA Content:\n{content}")
        # Match expected: CharacterFreePoints = 20, (No quotes)
        assert "CharacterFreePoints = 20," in content
        assert '"20"' not in content
        
    os.remove(dummy_lua)
    print("Coercion Test Passed!\n")

if __name__ == "__main__":
    test_string_to_number_coercion()
