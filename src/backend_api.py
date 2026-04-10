import sys
import os
import uvicorn
import asyncio
import urllib.parse

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from src.logic.manager import PZModManager, TRASH_PATH, SORTING_RULES_FILE

app = FastAPI(title="HellDrinx - Tool (ModManager)")
manager = PZModManager()

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

def start_server():
    is_dev = os.environ.get('NODE_ENV') == 'development'
    if is_dev:
        # In development, we use string import to enable reload logic
        uvicorn.run("src.backend_api:app", host="0.0.0.0", port=8000, reload=True)
    else:
        uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    start_server()
