import sys
import os
import uvicorn
import asyncio
import urllib.parse
from contextlib import asynccontextmanager

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from typing import List, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from src.logic.manager import PZModManager, TRASH_PATH, SORTING_RULES_FILE
from src.logic.sandbox_manager import SandboxManager
from src.logic.ini_manager import IniManager

import signal

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages the startup and shutdown lifecycles of the application."""
    # Start the watchdog to prevent zombie processes
    asyncio.create_task(parent_watchdog())
    yield
    # Any cleanup logic would go here

app = FastAPI(title="HellDrinx - Tool (ModManager)", lifespan=lifespan)
manager = PZModManager()

# --- ZOMBIE PROTECTION ---
async def parent_watchdog():
    """Asynchronous task that shuts down the backend if the parent process (Electron) dies."""
    # 1. Disable in development to avoid annoying shutdowns
    if os.environ.get('NODE_ENV') == 'development':
        print("Watchdog: Disabled (Development Mode)")
        return
        
    parent_pid = os.getppid()
    
    # Don't start watchdog if we can't get a valid parent PID (e.g. detached)
    if parent_pid <= 1:
        print(f"Watchdog skipped. Parent PID is {parent_pid} (detached or system).")
        return

    print(f"Watchdog started. Monitoring parent PID: {parent_pid}")
    
    # Wait longer at startup to allow Electron to stabilize and potentially spawn/respawn
    await asyncio.sleep(20)
    
    while True:
        try:
            # os.kill(pid, 0) checks if process exists
            os.kill(parent_pid, 0)
        except (OSError, ProcessLookupError):
            print(f"Parent process {parent_pid} lost. Shutting down backend...")
            os._exit(0)
        await asyncio.sleep(5) # Check every 5 seconds

# --- END ZOMBIE PROTECTION ---

# CORS configuration to allow React (Node) to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, use the frontend URL
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve Workshop and Trash images as static files
if os.path.exists(manager.workshop_path):
    app.mount("/workshop_images", StaticFiles(directory=manager.workshop_path), name="workshop_images")

if os.path.exists(TRASH_PATH):
    app.mount("/trash_images", StaticFiles(directory=TRASH_PATH), name="trash_images")

class SettingsAction(BaseModel):
    workshop_path: str
    server_config_path: str
    last_selected_profile: Optional[str] = None
    last_community_selected: Optional[bool] = False
    last_profile_mods: Optional[List[str]] = []

class ModAction(BaseModel):
    mod_id: str = ""
    mod_ids: List[str] = []
    workshop_id: str = ""
    name: str = ""
    bypass_conflicts: bool = False
    fingerprint: str = ""
    fingerprints: List[str] = []

class RawRulesAction(BaseModel):
    content: str

class ProfileAction(BaseModel):
    name: Optional[str] = ""
    is_community: Optional[bool] = False
    method: Optional[str] = "full"
    src_path: Optional[str] = None
    target_name: Optional[str] = None

class BackupAction(BaseModel):
    zomboid_path: str
    backup_dest: str

class SandboxVarsAction(BaseModel):
    vars: dict

@app.get("/api/mods")
async def get_mods():
    """Returns mods from JSON cache or workshop."""
    if not manager.mods_data:
        manager.load_cache()
    
    # Process image paths into API URLs
    processed_mods = []
    # 1. Process paths and URLs
    for mod in manager.mods_data:
        m = mod.copy()
        if m.get('poster'):
            post_path = m['poster']
            if post_path.startswith(TRASH_PATH):
                rel_path = os.path.relpath(post_path, TRASH_PATH).replace("\\", "/")
                safe_path = urllib.parse.quote(rel_path, safe='/')
                m['poster_url'] = f"/trash_images/{safe_path}"
            elif post_path.startswith(manager.workshop_path):
                rel_path = os.path.relpath(post_path, manager.workshop_path).replace("\\", "/")
                safe_path = urllib.parse.quote(rel_path, safe='/')
                m['poster_url'] = f"/workshop_images/{safe_path}"
        processed_mods.append(m)
        
    # 2. Sort mods to match servertest.ini order in the UI
    # - Active Mods: Follow server_mods order (top)
    # - Inactive Mods: Follow after
    def get_sort_key(m):
        try:
            return manager.server_mods.index(m['id'])
        except ValueError:
            return 999999 + hash(m['id']) % 1000000

    processed_mods.sort(key=get_sort_key)
        
    return {
        "total": manager.total_mod_folders,
        "mods": processed_mods,
        "server_mods": manager.server_mods,
        "trash": manager.trash_data,
        "dependency_map": manager.get_dependency_status()
    }

@app.post("/api/sync")
async def sync_mods():
    try:
        # Run heavy scan in thread to avoid blocking the API
        await asyncio.to_thread(manager.sync_servertest_ini)
        return {"status": "success", "message": "Synchronization completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/enhance")
async def enhance_mods():
    try:
        # Run heavy logic in thread to avoid blocking the API
        result = await asyncio.to_thread(manager.enhance_servertest_ini)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/activate-mod")
async def activate_mod(action: ModAction):
    result = manager.activate_mod(action.mod_id, action.bypass_conflicts)
    return result

@app.post("/api/activate-bulk")
async def activate_bulk(action: ModAction):
    try:
        if not action.mod_ids:
            return {"status": "error", "message": "No mod IDs provided for bulk action"}
        result = manager.activate_mods_bulk(action.mod_ids, action.bypass_conflicts, action.fingerprints)
        return result
    except Exception as e:
        print(f"ERROR in activate_bulk: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.post("/api/ignore-fingerprint")
async def ignore_fingerprint(action: ModAction):
    if manager.ignore_fingerprint(action.fingerprint):
        return {"status": "success"}
    return {"status": "error", "message": "Failed to ignore fingerprint or already ignored"}

@app.post("/api/clear-ignored-conflicts")
async def clear_ignored_conflicts():
    if manager.clear_ignored_conflicts():
        return {"status": "success"}
    return {"status": "error"}

@app.post("/api/delete-volume")
async def delete_volume(action: ModAction):
    if manager.trash_mod(action.mod_id, action.workshop_id, action.name):
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Error moving to trash")

@app.post("/api/delete-specific")
async def delete_specific(action: ModAction):
    result = manager.remove_specific_mod_id(action.mod_id, action.workshop_id)
    if result:
        return result
    raise HTTPException(status_code=500, detail="Error removing specific mod")

@app.post("/api/restore")
async def restore_mod(action: ModAction):
    if manager.restore_mod(action.workshop_id):
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Error restoring mod")

@app.post("/api/empty-trash")
async def empty_trash():
    if manager.empty_trash():
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Error emptying trash")

@app.get("/api/settings")
async def get_settings():
    return {
        "workshop_path": manager.workshop_path,
        "server_config_path": manager.server_config_path,
        "last_selected_profile": manager.last_selected_profile,
        "last_community_selected": manager.last_community_selected,
        "last_profile_mods": manager.last_profile_mods
    }

@app.post("/api/settings")
async def update_settings(settings: SettingsAction):
    manager.save_settings(settings.workshop_path, settings.server_config_path)
    # We don't remount static files here as it requires app restart or complex logic,
    # but we update the internal paths.
    return {"status": "success"}

@app.get("/api/sorting-rules/raw")
async def get_raw_sorting_rules():
    try:
        if os.path.exists(SORTING_RULES_FILE):
            with open(SORTING_RULES_FILE, "r", encoding="utf-8") as f:
                return {"content": f.read()}
        return {"content": ""}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sorting-rules/raw")
async def save_raw_sorting_rules(action: RawRulesAction):
    try:
        # Escreve o conteúdo bruto preservando comentários e formatação
        with open(SORTING_RULES_FILE, "w", encoding="utf-8") as f:
            f.write(action.content)
        
        # Apenas recarrega para a memória do manager
        manager._load_sorting_rules()
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sorting-rules/open")
async def open_sorting_rules():
    try:
        if not os.path.exists(SORTING_RULES_FILE):
            with open(SORTING_RULES_FILE, "w", encoding="utf-8") as f:
                f.write("")
        if os.name == 'nt':
            os.startfile(SORTING_RULES_FILE)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/activate-all")
async def activate_all():
    result = manager.activate_all()
    if result:
        return result
    raise HTTPException(status_code=500, detail="Error activating all")

@app.post("/api/deactivate-all")
async def deactivate_all():
    if manager.deactivate_all():
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Error deactivating all")

# --- PROFILES ---
@app.get("/api/profiles")
async def list_profiles():
    return manager.list_profiles()

@app.post("/api/profiles/save")
async def save_profile(action: ProfileAction):
    return manager.save_profile(action.name)

@app.post("/api/profiles/load")
async def load_profile(action: ProfileAction):
    return manager.load_profile_advanced(action.name, action.is_community, action.method)

@app.post("/api/profiles/delete")
async def delete_profile(action: ProfileAction):
    return manager.delete_profile(action.name, action.is_community)

@app.post("/api/profiles/import")
async def import_profile(action: ProfileAction):
    return manager.import_profile_from_path(action.src_path, action.is_community, action.target_name)

@app.get("/api/profiles/path")
async def get_profiles_path(is_community: bool = False):
    return {"path": manager.get_profiles_path(is_community)}

# --- BACKUP ---
@app.post("/api/backup")
async def create_backup(action: BackupAction):
    # Offload heavy zip operation to a separate thread to keep API responsive
    return await asyncio.to_thread(manager.create_server_backup, action.zomboid_path, action.backup_dest)

# --- SANDBOX VARS ---
@app.get("/api/sandbox-vars")
async def get_sandbox_vars():
    # Construct SandboxVars.lua path relative to servertest.ini
    ini_path = manager.server_config_path
    if not ini_path:
        raise HTTPException(status_code=400, detail="Server config path not set")
    
    # Example: C:\Users\Lopez\Zomboid\Server\servertest.ini -> servertest_SandboxVars.lua
    base_name = os.path.basename(ini_path).replace(".ini", "")
    lua_path = os.path.join(os.path.dirname(ini_path), f"{base_name}_SandboxVars.lua")
    
    sm = SandboxManager(lua_path)
    return sm.get_sandbox_vars()

@app.get("/api/ini-vars")
async def get_ini_vars():
    """Returns variables from servertest.ini (INI Tab)."""
    ini_mgr = IniManager(manager.server_config_path)
    return ini_mgr.get_ini_vars()

@app.post("/api/ini-vars")
async def save_ini_vars(action: SandboxVarsAction):
    """Saves variables back to servertest.ini (INI Tab)."""
    ini_mgr = IniManager(manager.server_config_path)
    return ini_mgr.save_ini_vars(action.vars)

@app.get("/api/workshop-playlist")
async def get_workshop_playlist():
    """Returns the ordered list of mods and workshop IDs from servertest.ini."""
    ini_mgr = IniManager(manager.server_config_path)
    vars_data = ini_mgr.get_ini_vars().get("vars", {})
    
    mods_str = vars_data.get("Mods", "")
    ws_str = vars_data.get("WorkshopItems", "")
    
    # Split and clean
    mods_raw = [m.strip() for m in mods_str.split(";") if m.strip()]
    ws_raw = [w.strip() for w in ws_str.split(";") if w.strip()]
    
    # Unique Mods in order (as per user instruction: Id aparece apenas uma vez)
    mods_unique = []
    seen_mods = set()
    for m in mods_raw:
        if m not in seen_mods:
            mods_unique.append(m)
            seen_mods.add(m)

    # Pre-load mod data for name and workshop mapping
    mod_to_ws = {}
    mod_to_name = {}
    for mod in manager.mods_data:
        mod_to_ws[mod["id"]] = mod["workshop_id"]
        mod_to_name[mod["id"]] = mod["name"]
    
    playlist = []
    used_ws_ids = set()

    # Build playlist from Mods list (The source of truth)
    for m_id in mods_unique:
        w_id = mod_to_ws.get(m_id, "")
        
        # If we can't find the WS ID in scan, check if it was in the original file
        # This is a bit advanced, but let's try to find it if there was a 1:1 match in the file
        if not w_id and len(mods_raw) == len(ws_raw):
            try:
                idx = mods_raw.index(m_id)
                w_id = ws_raw[idx]
            except: pass

        if w_id:
            used_ws_ids.add(w_id)

        playlist.append({
            "workshopId": w_id,
            "modId": m_id,
            "name": mod_to_name.get(m_id, m_id)
        })

    # Add "Orphan" Workshop IDs (those in WS list but not mapping to any mod in Mods list)
    # This prevents accidental deletion of map mods or assets
    for w_id in ws_raw:
        if w_id not in used_ws_ids:
            playlist.append({
                "workshopId": w_id,
                "modId": "",
                "name": f"Workshop Asset: {w_id}"
            })
            used_ws_ids.add(w_id)
        
    return playlist

@app.post("/api/workshop-playlist")
async def save_workshop_playlist(playlist: List[dict]):
    """Saves the reordered playlist back to servertest.ini."""
    # 1. New Mods string (unique mod ids in order)
    mod_ids = []
    seen_mods = set()
    for p in playlist:
        m = p.get("modId")
        if m and m not in seen_mods:
            mod_ids.append(m)
            seen_mods.add(m)
    new_mods = ";".join(mod_ids)

    # 2. New WorkshopItems string (unique workshop ids in order of first appearance)
    ws_ids = []
    seen_ws = set()
    for p in playlist:
        w = p.get("workshopId")
        if w and w not in seen_ws:
            ws_ids.append(w)
            seen_ws.add(w)
    new_ws = ";".join(ws_ids)
    
    ini_mgr = IniManager(manager.server_config_path)
    return ini_mgr.save_ini_vars({
        "Mods": new_mods,
        "WorkshopItems": new_ws
    })

@app.get("/api/map-list")
async def get_map_list():
    """Returns the ordered list of maps from servertest.ini."""
    ini_mgr = IniManager(manager.server_config_path)
    vars_data = ini_mgr.get_ini_vars().get("vars", {})
    map_str = vars_data.get("Map", "")
    return [m.strip() for m in map_str.split(";") if m.strip()]

@app.post("/api/map-list")
async def save_map_list(maps: List[str] = Body(...)):
    """Saves the reordred map list back to servertest.ini."""
    print(f"DEBUG: Saving Map list: {maps}")
    new_map_str = ";".join(maps)
    ini_mgr = IniManager(manager.server_config_path)
    result = ini_mgr.save_ini_vars({"Map": new_map_str})
    print(f"DEBUG: Save result: {result}")
    return result

@app.post("/api/sandbox-vars")
async def update_sandbox_vars(action: SandboxVarsAction):
    ini_path = manager.server_config_path
    base_name = os.path.basename(ini_path).replace(".ini", "")
    lua_path = os.path.join(os.path.dirname(ini_path), f"{base_name}_SandboxVars.lua")
    
    sm = SandboxManager(lua_path)
    if sm.update_vars(action.vars):
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="Failed to update SandboxVars.lua")

def start_server():
    is_dev = os.environ.get('NODE_ENV') == 'development'
    if is_dev:
        # In development, we use string import to enable reload logic
        # Set log_level to warning to reduce noise (avoid "INFO" logs being labeled as Errors)
        uvicorn.run("src.backend_api:app", host="0.0.0.0", port=8000, reload=True, log_level="warning")
    else:
        uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    start_server()
