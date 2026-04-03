import os
import re
import shutil
import json
import sys
import zipfile
from datetime import datetime

def get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

BASE_DIR = get_base_dir()

# Default Paths and Data Files
DEFAULT_WORKSHOP = r"C:\Program Files (x86)\Steam\steamapps\workshop\content\108600"
DEFAULT_SERVER_INI = os.path.join(os.environ.get('USERPROFILE', ''), "Zomboid", "Server", "servertest.ini")
TRASH_PATH = os.path.join(BASE_DIR, "src", "trash")
CACHE_FILE = os.path.join(BASE_DIR, "src", "mods_cache.json")
MASTER_ORDER_FILE = os.path.join(BASE_DIR, "src", "master_order.json")
SORTING_RULES_FILE = os.path.join(BASE_DIR, "sorting_rules.txt")
SETTINGS_FILE = os.path.join(BASE_DIR, "src", "settings.json")
PROFILES_DIR = os.path.join(BASE_DIR, "profiles")

CATEGORY_TIERS = {
    "preorder": 0,
    "coreRequirement": 1,
    "tweaks": 2,
    "resource": 3,
    "map": 4,
    "vehicle": 5,
    "code": 6,
    "clothes": 7,
    "ui": 8,
    "other": 9,
    "translation": 10,
    "undefined": 11
}
PREORDER_MODS = ["ModManager", "ModManagerServer", "modoptions"]

class PZModManager:
    def log(self, message):
        log_file = os.path.join(BASE_DIR, "scanner_debug.log")
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"{message}\n")

    def __init__(self):
        self.mods_data = [] 
        self.server_mods = [] 
        self.server_workshop_ids = []
        self.total_mod_folders = 0
        self.trash_data = [] 
        self.master_order = [] 
        self.sorting_rules = {} 
        
        # Settings
        self.workshop_path = DEFAULT_WORKSHOP
        self.server_config_path = DEFAULT_SERVER_INI
        self.load_settings()
        self.load_server_config() # Initial load of server config data

        self._load_master_order()
        self._load_trash_metadata()
        self._load_sorting_rules()
        self.load_server_config()

        # Ensure profiles directory exists
        if not os.path.exists(PROFILES_DIR):
            os.makedirs(PROFILES_DIR)

    def sync_servertest_ini(self):
        """Consolidates workshop scanning and server config loading."""
        self.scan_workshop()
        self.load_server_config()
        self.load_cache() # Ensure memory is updated
        return True

    def load_settings(self):
        if os.path.exists(SETTINGS_FILE):
            try:
                with open(SETTINGS_FILE, "r") as f:
                    data = json.load(f)
                    self.workshop_path = data.get("workshop_path", DEFAULT_WORKSHOP)
                    self.server_config_path = data.get("server_config_path", DEFAULT_SERVER_INI)
            except: pass

    def save_settings(self, workshop_path, server_config_path):
        self.workshop_path = workshop_path
        self.server_config_path = server_config_path
        data = {
            "workshop_path": self.workshop_path,
            "server_config_path": self.server_config_path
        }
        os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
        with open(SETTINGS_FILE, "w") as f:
            json.dump(data, f, indent=4)
        # Re-load server config after path change
        self.load_server_config()

    def scan_workshop(self, progress_callback=None):
        """Variable Workshop and Trash reporting progress to UI."""
        self.log(f"--- Scan Workshop started at {self.workshop_path} ---")
        self.mods_data = []
        self.total_mod_folders = 0
        
        if not os.path.exists(self.workshop_path):
            self.log(f"ERROR: workshop_path does not exist: {self.workshop_path}")
            return None

        # 1. Contagem prévia
        workshop_ids = []
        if os.path.exists(self.workshop_path):
            workshop_ids = [d for d in os.listdir(self.workshop_path) if os.path.isdir(os.path.join(self.workshop_path, d))]
        
        self.log(f"Pastas encontradas no Workshop: {len(workshop_ids)}")
        trash_ids = [d for d in os.listdir(TRASH_PATH) if os.path.isdir(os.path.join(TRASH_PATH, d)) and d != "metadata.json"] if os.path.exists(TRASH_PATH) else []
        total_steps = len(workshop_ids) + len(trash_ids)
        current_step = 0

        # 2. Escanear Workshop
        for wid in workshop_ids:
            try:
                w_path = os.path.join(self.workshop_path, wid)
                mods_dir = os.path.join(w_path, "mods")
                if os.path.exists(mods_dir):
                    # Deep scan: find ALL mod.info files in this workshop item
                    # We store them by ID to handle versioning (pick 42 over common if both exist)
                    wid_mods = self._recursive_find_mods(mods_dir, wid)
                    if wid_mods:
                        self.total_mod_folders += 1
                        # The results are already appended to self.mods_data within the helper
            except Exception as e:
                self.log(f"CRITICAL ERROR in workshop_id {wid}: {str(e)}")
            
            # Feedback de progresso
            current_step += 1
            if progress_callback: progress_callback(current_step, total_steps)
        
        self.log(f"Workshop scan finished. Total mods parsed: {len(self.mods_data)}")

        # 3. Escanear Lixeira (Somar no total)
        for wid in trash_ids:
            try:
                w_path = os.path.join(TRASH_PATH, wid)
                self.total_mod_folders += 1
            except Exception as e:
                self.log(f"CRITICAL ERROR in trash_id {wid}: {str(e)}")
                
            current_step += 1
            if progress_callback: progress_callback(current_step, total_steps)
        
        # 4. Ingestão Automática de Regras (Supreme Power)
        self.log("Ingesting mod rules into sorting_rules.txt...")
        for mod_info in self.mods_data:
            self._ingest_mod_rules(mod_info)
        self._save_sorting_rules()
            
        self.save_cache()
        return None

    def _peek_mod_id_and_score(self, info_path):
        """Quickly peeks mod.info to get ID and version score without full parsing."""
        try:
            with open(info_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                i_match = re.search(r"^id=(.*)", content, re.MULTILINE)
                if i_match:
                    mod_id = i_match.group(1).strip()
                    # Calculate score based on folder name
                    score = 0.0
                    parent_name = os.path.basename(os.path.dirname(info_path))
                    if parent_name == "common": score = 0.5
                    else:
                        ver_match = re.search(r"(\d+\.?\d*)", parent_name)
                        if ver_match: score = float(ver_match.group(1))
                    return mod_id, score
        except: pass
        return None, 0.0

    def _recursive_find_mods(self, mods_dir, workshop_id):
        """Deeply searches for all mod.info files and processes them."""
        found_any = False
        # mod_id -> (score, info_path, base_path)
        best_versions = {}
        
        for root, dirs, files in os.walk(mods_dir):
            if "mod.info" in files:
                info_path = os.path.join(root, "mod.info")
                m_id, score = self._peek_mod_id_and_score(info_path)
                if m_id:
                    # Update if better version found per mod_id
                    if m_id not in best_versions or score > best_versions[m_id][0]:
                        best_versions[m_id] = (score, info_path, root)
        
        for m_id, (score, info_path, base_path) in best_versions.items():
            self._process_single_mod_info(info_path, m_id, workshop_id, base_path)
            found_any = True
        return found_any

    def _process_single_mod_info(self, mod_info_path, mod_id, workshop_id, base_search_path):
        """Fully parses a specific mod.info and adds it to mods_data."""
        mod_name = os.path.basename(os.path.dirname(os.path.dirname(mod_info_path))) # Fallback
        if mod_name == "mods": mod_name = mod_id # In case of root mods
        
        poster_path = None
        requirements = []
        incompatible = []
        load_after = []
        
        # 2. Leitura de Metadados
        if mod_info_path and os.path.exists(mod_info_path):
            try:
                with open(mod_info_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    n_match = re.search(r"^name=(.*)", content, re.MULTILINE)
                    p_match = re.search(r"^poster=(.*)", content, re.MULTILINE)
                    r_match = re.search(r"^require=(.*)", content, re.MULTILINE)
                    d_match = re.search(r"^dependency=(.*)", content, re.MULTILINE) # Suporte adicional
                    inc_match = re.search(r"^incompatible=(.*)", content, re.MULTILINE)
                    lma_match = re.search(r"^loadModAfter=(.*)", content, re.MULTILINE)
                    
                    if n_match: mod_name = n_match.group(1).strip()
                    if p_match:
                        p_abs = os.path.join(base_search_path, p_match.group(1).strip())
                        if os.path.exists(p_abs): poster_path = p_abs
                    
                    # Merge de require e dependency
                    raw_reqs = ""
                    if r_match: raw_reqs += r_match.group(1).strip()
                    if d_match: 
                        if raw_reqs: raw_reqs += ","
                        raw_reqs += d_match.group(1).strip()
                    
                    if raw_reqs:
                        requirements = [r.strip().replace("\\", "") for r in raw_reqs.split(",") if r.strip()]
                        
                    if inc_match:
                        raw_inc = inc_match.group(1).strip()
                        incompatible = [i.strip().replace("\\", "") for i in raw_inc.split(",") if i.strip()]
                    
                    if lma_match:
                        raw_lma = lma_match.group(1).strip()
                        load_after = [l.strip().replace("\\", "") for l in raw_lma.split(",") if l.strip()]
            except Exception as e:
                self.log(f"Failed to read mod.info in {mod_info_path}: {e}")
                
        if not poster_path:
            for fallback in ["poster.png", "preview.png", "icon.png"]:
                fallback_path = os.path.join(base_search_path, fallback)
                if os.path.exists(fallback_path):
                    poster_path = fallback_path
                    break

        # --- HEURÍSTICA DE CATEGORIZAÇÃO (MLOS) ---
        def _check_exists(paths):
            return any(os.path.exists(os.path.join(base_search_path, p.replace("/", os.sep))) for p in paths)
            
        m_n_lower = mod_name.lower()
        m_id_lower = mod_id.lower()
        is_tweak = any(k in m_n_lower or k in m_id_lower for k in ["framework", " api", "_api", "tweak", "interface", "utilit", "bugfix"])
        is_map = _check_exists(["media/maps"])
        is_models = _check_exists(["media/models_X", "media/models"])
        is_textures = _check_exists(["media/textures", "media/texturepacks"])
        is_vehicle = _check_exists(["media/models_X/vehicles", "media/models/vehicles"])
        is_code = _check_exists(["media/lua/client", "media/lua/server", "media/scripts", "media/shared"])
        is_skinned = _check_exists(["media/models_X/Skinned"])
        is_ui = _check_exists(["media/textures/ui", "media/ui"])
        is_translation = _check_exists(["media/lua/shared/Translate"])
        is_resource = _check_exists(["media/resource", "media/textures"])

        cat_enum = 11
        category = "undefined"
        def apply_cat(new_cat_name, condition):
            nonlocal cat_enum, category
            if condition:
                new_val = CATEGORY_TIERS.get(new_cat_name, 11)
                if new_val < cat_enum:
                    cat_enum = new_val
                    category = new_cat_name

        apply_cat("translation", is_translation and not (is_code or is_models or is_textures))
        apply_cat("ui", is_ui)
        apply_cat("clothes", is_skinned)
        apply_cat("code", is_code and not (is_models or is_textures or is_ui or _check_exists(["media/resource"])))
        apply_cat("vehicle", is_vehicle and is_textures)
        apply_cat("map", is_map)
        apply_cat("resource", (is_textures or is_resource) and not (is_code or is_models or is_map or is_ui))
        apply_cat("tweaks", is_tweak)
        
        if mod_id in PREORDER_MODS: apply_cat("preorder", True)
        if category == "undefined": category = "other"
        # ------------------------------------------

        # --- EXHAUSTIVE MAP DETECTION ---
        extracted_maps = []
        # --- EXHAUSTIVE MAP DETECTION ---
        extracted_maps = []
        try:
            # We search in the base folder AND sibling version folders (42, common etc.)
            search_folders = [base_search_path]
            
            # If we are in a versioned subfolder (like 42 or common), check siblings
            parent_dir = os.path.dirname(base_search_path)
            # Only if the parent is within the "mods/" structure
            if os.path.exists(parent_dir) and "mods" in parent_dir:
                search_folders.append(parent_dir)
                for sub in ["common", "42", "41", "42.0", "42.1"]:
                    sub_p = os.path.join(parent_dir, sub)
                    if os.path.exists(sub_p) and os.path.isdir(sub_p):
                        search_folders.append(sub_p)

            for folder in set(search_folders):
                maps_root = os.path.join(folder, "media", "maps")
                if os.path.exists(maps_root):
                    for sub_map in os.listdir(maps_root):
                        if os.path.isdir(os.path.join(maps_root, sub_map)) and sub_map not in extracted_maps:
                            extracted_maps.append(sub_map)
        except: pass
        # --------------------------------
        # --------------------------------

        # --- ANÁLISE PROFUNDA (Critical Files) ---
        media_files = []
        try:
            # Focar apenas em LUA, SCRIPTS e MAPS (Onde ocorrem conflitos reais de lógica)
            critical_dirs = ["lua", "scripts", "maps"]
            media_root = os.path.join(base_search_path, "media")
            if os.path.exists(media_root):
                for sub in os.listdir(media_root):
                    if sub.lower() in critical_dirs:
                        sub_p = os.path.join(media_root, sub)
                        for r, d, f in os.walk(sub_p):
                            for file in f:
                                # Guardar caminho relativo para comparação
                                rel_p = os.path.relpath(os.path.join(r, file), base_search_path).replace("\\", "/")
                                media_files.append(rel_p)
        except: pass
        # ------------------------------------------

        self.mods_data.append({
            "id": mod_id,
            "name": mod_name,
            "workshop_id": workshop_id,
            "poster": poster_path,
            "require": requirements,
            "incompatible": incompatible,
            "loadModAfter": load_after,
            "absolute_path": base_search_path,
            "category": category,
            "cat_enum": cat_enum,
            "media_files": media_files,
            "maps": extracted_maps
        })

    def save_cache(self):
        cache_data = {
            "total_mod_folders": self.total_mod_folders,
            "mods_data": self.mods_data
        }
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache_data, f)

    def load_cache(self):
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.total_mod_folders = data.get("total_mod_folders", 0)
                    self.mods_data = data.get("mods_data", [])
                    return True
            except: pass
        return False

    def load_server_config(self):
        """Reads servertest.ini to identify linked mods."""
        if not os.path.exists(self.server_config_path):
            return "servertest.ini file not found!"
        try:
            self.server_mods = [] 
            with open(self.server_config_path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    if line.startswith("Mods="):
                        line_content = line.replace("Mods=", "").strip()
                        self.server_mods = [m for m in line_content.split(";") if m.strip()]
                        break
            return None
        except Exception as e:
            return str(e)

    def trash_mod(self, mod_id, workshop_id, mod_name):
        src_path = os.path.join(self.workshop_path, workshop_id)
        dest_path = os.path.join(TRASH_PATH, workshop_id)
        if not os.path.exists(TRASH_PATH): os.makedirs(TRASH_PATH)
        try:
            if os.path.exists(src_path): shutil.move(src_path, dest_path)
            
            # Update internal list: remove all mods from this workshop ID
            self.mods_data = [m for m in self.mods_data if m['workshop_id'] != workshop_id]
            self.total_mod_folders = len(set(m['workshop_id'] for m in self.mods_data))
            
            self.trash_data.append({"id": mod_id, "name": mod_name, "workshop_id": workshop_id})
            self._save_trash_metadata()
            self.remove_all_mods_from_workshop_folder(workshop_id)
            self.save_cache()
            return True
        except Exception as e:
            self.log(f"Error in trash_mod: {e}")
            return False

    def remove_all_mods_from_workshop_folder(self, workshop_id):
        if not os.path.exists(self.server_config_path): return
        with open(self.server_config_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            
        ids_to_remove = [m['id'] for m in self.mods_data if m['workshop_id'] == workshop_id]
        
        def clean_line(prefix, targets, content_str):
            regex = rf"^{prefix}=(.*)$"
            match = re.search(regex, content_str, re.MULTILINE)
            if match:
                items = match.group(1).split(";")
                items = [i for i in items if i.strip() and i not in targets]
                return re.sub(regex, f"{prefix}={';'.join(items)}", content_str, flags=re.MULTILINE)
            return content_str

        content = clean_line("Mods", ids_to_remove, content)
        content = clean_line("WorkshopId", [workshop_id], content)
        with open(self.server_config_path, "w", encoding="utf-8") as f: 
            f.write(content)

    def _update_map_line(self, content_str, active_mods_list):
        """Discovers map folders for active mods and updates the Map= line."""
        maps_to_include = []
        for mid in active_mods_list:
            minfo = next((m for m in self.mods_data if m['id'] == mid), None)
            if minfo and minfo.get("maps"):
                maps_to_include.extend(minfo["maps"])
        
        # Unique maps only (PZ crashes on duplicates)
        maps_to_include = list(dict.fromkeys(maps_to_include))

        # Ensure Muldraugh, KY is at the end (mandatory for PZ)
        if "Muldraugh, KY" not in maps_to_include:
            maps_to_include.append("Muldraugh, KY")
        else:
            # Move it to last
            maps_to_include.remove("Muldraugh, KY")
            maps_to_include.append("Muldraugh, KY")

        regex = r"^Map=(.*)$"
        return re.sub(regex, f"Map={';'.join(maps_to_include)}", content_str, flags=re.MULTILINE)

    def sync_servertest_ini(self):
        """Deep scan workshop and synchronize all config lines (Mods, Workshop, Maps)."""
        self.scan_workshop()
        self.load_server_config()
        
        if not os.path.exists(self.server_config_path):
            return {"status": "error", "message": "Config file not found"}
            
        try:
            with open(self.server_config_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                
            # Perform re-sorting
            sorted_mods, error = self._sort_mod_ids(self.server_mods)
            
            # Update all critical lines
            content = re.sub(r"^Mods=.*$", f"Mods={';'.join(sorted_mods)}", content, flags=re.MULTILINE)
            
            # Build workshop items list based on current active mods + any existing IDs
            # This ensures we don't lose IDs that might not have a mod_id detected yet
            wids = set(self.server_workshop_ids)
            for mid in sorted_mods:
                minfo = next((m for m in self.mods_data if m['id'] == mid), None)
                if minfo:
                    wids.add(minfo['workshop_id'])
            
            content = re.sub(r"^WorkshopItems=.*$", f"WorkshopItems={';'.join(self._sort_workshop_ids(list(wids), sorted_mods))}", content, flags=re.MULTILINE)
            content = self._update_map_line(content, sorted_mods)
            
            with open(self.server_config_path, "w", encoding="utf-8") as f:
                f.write(content)
                
            self.load_server_config()
            return {"status": "success", "message": "Sync completed successfully!", "error": error}
        except Exception as e:
            print(f"Sync Error: {e}")
            return {"status": "error", "message": str(e)}

    def activate_mod(self, mod_id, bypass_conflicts=False):
        if not os.path.exists(self.server_config_path): return {"status": "error", "message": "servertest.ini not found"}
        
        # 1. Obter Grafo de Dependências
        dep_status = self.get_dependency_status()
        to_activate = set([mod_id])
        
        # 1.1. Busca recursiva de todas as dependências (ID -> ID)
        queue = [mod_id]
        visited = set()
        while queue:
            current = queue.pop(0)
            if current in visited: continue
            visited.add(current)
            
            # Requerimentos (require=, dependency= e loadAfter)
            reqs = dep_status.get(current, {}).get("depends_on", [])
            for r in reqs:
                if r not in visited:
                    to_activate.add(r)
                    queue.append(r)

        # 1.5. Ativação de "Mods Irmãos" (Mesmo Workshop)
        main_wid = next((m['workshop_id'] for m in self.mods_data if m['id'] == mod_id), None)
        
        if main_wid:
            brothers = [m for m in self.mods_data if m['workshop_id'] == main_wid]
            for b in brothers:
                bid = b['id']
                if bid not in to_activate:
                    breqs = set(b.get('require', [])) | set(b.get('loadModAfter', []))
                    if any(r in to_activate for r in breqs):
                        self.log(f"Auto-activating brother mod: {bid} (Patch/Requirement found in same folder)")
                        to_activate.add(bid)
        
        to_activate_list = list(to_activate)
        
        # 2. Verificar conflitos ANTES de ativar (Skip if bypass_conflicts is True)
        if not bypass_conflicts:
            for mid in to_activate:
                conflict = self.check_conflicts(mid, self.server_mods)
                if conflict: return {"status": "error", **conflict}

        # 3. Atualizar servertest.ini
        try:
            with open(self.server_config_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            def update_line(prefix, items_to_add, content_str):
                regex = rf"^{prefix}=(.*)$"
                match = re.search(regex, content_str, re.MULTILINE)
                current_items = match.group(1).split(";") if match else []
                current_items = [i for i in current_items if i.strip()]
                
                new_items = list(current_items)
                for item in items_to_add:
                    if item not in new_items:
                        new_items.append(item)
                
                sorted_total, error = self._sort_mod_ids(new_items)
                final_ordered = sorted_total if not error else new_items
                return re.sub(regex, f"{prefix}={';'.join(final_ordered)}", content_str, flags=re.MULTILINE), error

            # Ativar Mods (IDs internos)
            content, err_mods = update_line("Mods", to_activate_list, content)
            if err_mods: return {"status": "error", **err_mods}
            
            # Recalcular WorkshopItems e Map baseados na lista final
            regex_mods = r"^Mods=(.*)$"
            match_m = re.search(regex_mods, content, re.MULTILINE)
            if match_m:
                final_mod_ids = [m for m in match_m.group(1).split(";") if m.strip()]
                wids_to_add = []
                for mid in final_mod_ids:
                    mod_info = next((m for m in self.mods_data if m['id'] == mid), None)
                    if mod_info: wids_to_add.append(mod_info['workshop_id'])
                
                # Atualizar WorkshopItems
                content = re.sub(r"^WorkshopItems=.*$", f"WorkshopItems={';'.join(self._sort_workshop_ids(wids_to_add, final_mod_ids))}", content, flags=re.MULTILINE)
                
                # AUTO-UPDATE MAPS!
                content = self._update_map_line(content, final_mod_ids)
            
            with open(self.server_config_path, "w", encoding="utf-8") as f: f.write(content)
            self.load_server_config()
            return {"status": "success"}
        except Exception as e: 
            return {"status": "error", "title": "Unexpected Error", "message": str(e)}

    def remove_specific_mod_id(self, mod_id, workshop_id):
        if not os.path.exists(self.server_config_path): return False
        try:
            with open(self.server_config_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            dep_status = self.get_dependency_status()
            potential_orphans = dep_status.get(mod_id, {}).get("depends_on", [])

            regex_mods = r"^Mods=(.*)$"
            match = re.search(regex_mods, content, re.MULTILINE)
            if match:
                items = [i for i in match.group(1).split(";") if i.strip() and i != mod_id]
                current_active = set(items)
                cleaned_up_ids = []
                
                check_queue = list(potential_orphans)
                while check_queue:
                    dep_id = check_queue.pop(0)
                    is_needed = False
                    for other_active in current_active:
                        if dep_id in dep_status.get(other_active, {}).get("depends_on", []):
                            is_needed = True
                            break
                    
                    if not is_needed and dep_id not in cleaned_up_ids:
                        cleaned_up_ids.append(dep_id)
                        current_active.discard(dep_id)
                        check_queue.extend(dep_status.get(dep_id, {}).get("depends_on", []))
                
                ordered_active, error = self._sort_mod_ids(list(current_active))
                final_list = ordered_active if not error else list(current_active)
                content = re.sub(regex_mods, f"Mods={';'.join(final_list)}", content, flags=re.MULTILINE)

                # Update WorkshopItems
                remaining_wids = set()
                for mid in final_list:
                    minfo = next((m for m in self.mods_data if m['id'] == mid), None)
                    if minfo: remaining_wids.add(minfo['workshop_id'])
                
                content = re.sub(r"^WorkshopItems=.*$", f"WorkshopItems={';'.join(self._sort_workshop_ids(list(remaining_wids), final_list))}", content, flags=re.MULTILINE)
                
                # AUTO-UPDATE MAPS!
                content = self._update_map_line(content, final_list)

                with open(self.server_config_path, "w", encoding="utf-8") as f: f.write(content)
                self.save_cache()
                self.load_server_config()
                return {"status": "success", "cleaned_up": cleaned_up_ids}
        except Exception as e: 
            print(f"Error removing mod: {e}")
            return False

            # Se o workshop principal não tem mais nenhum mod ativo, manda pra lixeira
            # DESATIVADO POR SEGURANÇA: O usuário reportou mods sumindo
            # if workshop_id not in remaining_wids:
            #     self.trash_mod(mod_id, workshop_id, "Volume sem mods ativos")

            with open(self.server_config_path, "w", encoding="utf-8") as f: f.write(content)
            self.save_cache()
            self.load_server_config()
            return {"status": "success", "cleaned_up": cleaned_up_ids}
        except Exception as e: 
            print(f"Error removing mod: {e}")
            return False

    def activate_all(self):
        """Ativa TODOS os mods instalados no Workshop no servertest.ini."""
        all_ids = [m['id'] for m in self.mods_data]
        all_workshop_ids = list(set([m['workshop_id'] for m in self.mods_data]))
        
        try:
            with open(self.server_config_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            def update_line(prefix, items, content_str):
                regex = rf"^{prefix}=(.*)$"
                return re.sub(regex, f"{prefix}={';'.join(items)}", content_str, flags=re.MULTILINE)

            sorted_all, error = self._sort_mod_ids(all_ids)
            # No Ativar Tudo, se houver erro, apenas ativamos sem ordem garantida
            final_all = sorted_all if not error else all_ids
            
            content = update_line("Mods", final_all, content)
            content = update_line("WorkshopItems", self._sort_workshop_ids(all_workshop_ids, final_all), content)
            
            with open(self.server_config_path, "w", encoding="utf-8") as f: f.write(content)
            self.load_server_config()
            return {"status": "success", "warnings": [error] if error else []}
        except: return False

    def deactivate_all(self):
        """Remove TODOS os mods do servertest.ini (limpa as linhas Mods e WorkshopId)."""
        try:
            with open(self.server_config_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            content = re.sub(r"^Mods=.*$", "Mods=", content, flags=re.MULTILINE)
            content = re.sub(r"^WorkshopItems=.*$", "WorkshopItems=", content, flags=re.MULTILINE)
            
            with open(self.server_config_path, "w", encoding="utf-8") as f: f.write(content)
            self.load_server_config()
            return True
        except: return False

    def restore_mod(self, workshop_id):
        src = os.path.join(TRASH_PATH, workshop_id)
        dest = os.path.join(self.workshop_path, workshop_id)
        self.log(f"Restoring Workshop ID {workshop_id}...")
        
        if os.path.exists(src):
            try:
                # Se já existe no destino, removemos o destino primeiro para evitar erro
                if os.path.exists(dest):
                    self.log(f"Cleaning existing destination in {dest}...")
                    shutil.rmtree(dest)
                
                shutil.move(src, dest)
                self.trash_data = [i for i in self.trash_data if i['workshop_id'] != workshop_id]
                self._save_trash_metadata()
                
                # Re-parse the folder to add mods back to active list
                mods_dir = os.path.join(dest, "mods")
                if os.path.exists(mods_dir):
                    for mod_folder in os.listdir(mods_dir):
                        mod_p = os.path.join(mods_dir, mod_folder)
                        if os.path.isdir(mod_p):
                            self._parse_mod_folder(mod_p, workshop_id)
                
                self.total_mod_folders = len(set(m['workshop_id'] for m in self.mods_data))
                self.save_cache()
                self.log(f"Workshop {workshop_id} restored successfully.")
                return True
            except Exception as e:
                self.log(f"Error restoring {workshop_id}: {str(e)}")
                pass
        else:
            self.log(f"Error: Workshop {workshop_id} not found in trash.")
        return False

    def empty_trash(self):
        if os.path.exists(TRASH_PATH):
            for item in os.listdir(TRASH_PATH):
                p = os.path.join(TRASH_PATH, item)
                if os.path.isdir(p): shutil.rmtree(p)
                else: os.remove(p)
            self.trash_data = []
            self._save_trash_metadata()
            self.save_cache()
            return True
        return False

    def _load_trash_metadata(self):
        m_file = os.path.join(TRASH_PATH, "metadata.json")
        if os.path.exists(m_file):
            try:
                with open(m_file, "r") as f: self.trash_data = json.load(f)
            except: self.trash_data = []

    def _save_trash_metadata(self):
        if not os.path.exists(TRASH_PATH): os.makedirs(TRASH_PATH)
        with open(os.path.join(TRASH_PATH, "metadata.json"), "w") as f:
            json.dump(self.trash_data, f)

    def get_dependency_status(self):
        """Calcula quem depende de quem no estado atual do servertest.ini."""
        active_ids = set(self.server_mods)
        dependency_map = {} # mod_id -> { depends_on: [], required_by: [] }
        
        # 1. Mapear todos os mods conhecidos
        id_to_mod = {m['id']: m for m in self.mods_data}
        
        for mod in self.mods_data:
            mid = mod['id']
            if mid not in dependency_map:
                dependency_map[mid] = {"depends_on": set(), "required_by": set()}
            
            # A. Dependências de mod.info (Hard Requirements & LoadAfter)
            reqs = mod.get('require', [])
            lma_list = mod.get('loadModAfter', [])
            
            for r in list(set(reqs) | set(lma_list)):
                dependency_map[mid]["depends_on"].add(r)
                if r not in dependency_map:
                    dependency_map[r] = {"depends_on": set(), "required_by": set()}
                dependency_map[r]["required_by"].add(mid)
            
            # B. Dependências de sorting_rules.txt (Logical)
            # Se A deve carregar DEPOIS de B, então A depende de B
            if mid in self.sorting_rules:
                afters = self.sorting_rules[mid].get('loadAfter', [])
                for b in afters:
                    dependency_map[mid]["depends_on"].add(b)
                    if b not in dependency_map:
                        dependency_map[b] = {"depends_on": set(), "required_by": set()}
                    dependency_map[b]["required_by"].add(mid)
        
        # Converter sets em lists para o retorno JSON da API
        final_map = {}
        for k, v in dependency_map.items():
            final_map[k] = {
                "depends_on": list(v["depends_on"]),
                "required_by": list(v["required_by"])
            }
        
        return final_map

    def _load_sorting_rules(self):
        """Lê o sorting_rules.txt e popula o dicionário de regras."""
        self.sorting_rules = {}
        if not os.path.exists(SORTING_RULES_FILE): return
        
        current_mod = None
        try:
            with open(SORTING_RULES_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line: continue
                    # Seção do mod
                    match_mod = re.match(r"^\[(.*)\]$", line)
                    if match_mod:
                        current_mod = match_mod.group(1).strip()
                        self.sorting_rules[current_mod] = {
                            "loadAfter": [], "loadBefore": [], 
                            "loadFirst": False, "loadLast": False,
                            "incompatibleMods": []
                        }
                        continue
                    # Regras
                    if current_mod and "=" in line:
                        key, val = line.split("=", 1)
                        key = key.strip().lower()
                        vals = [v.strip() for v in val.split(",") if v.strip()]
                        
                        if key == "loadafter": self.sorting_rules[current_mod]["loadAfter"] = vals
                        elif key == "loadbefore": self.sorting_rules[current_mod]["loadBefore"] = vals
                        elif key == "loadfirst": self.sorting_rules[current_mod]["loadFirst"] = (val.strip().lower() == "on")
                        elif key == "loadlast": self.sorting_rules[current_mod]["loadLast"] = (val.strip().lower() == "on")
                        elif key == "incompatiblemods": self.sorting_rules[current_mod]["incompatibleMods"] = vals
                        elif key == "category": self.sorting_rules[current_mod]["category"] = vals[0]
        except Exception as e:
            print(f"Error parsing rules: {e}")

    def _save_sorting_rules(self):
        """Escreve o self.sorting_rules de volta para o sorting_rules.txt mantendo a sintaxe."""
        try:
            lines = []
            # Ordenar por ID para manter o arquivo organizado
            for mod_id in sorted(self.sorting_rules.keys(), key=lambda x: x.lower()):
                rules = self.sorting_rules[mod_id]
                lines.append(f"[{mod_id}]")
                if rules.get("loadFirst"): lines.append("loadFirst=on")
                if rules.get("loadLast"): lines.append("loadLast=on")
                
                if rules.get("loadAfter"): 
                    lines.append(f"loadAfter={','.join(rules['loadAfter'])}")
                if rules.get("loadBefore"): 
                    lines.append(f"loadBefore={','.join(rules['loadBefore'])}")
                if rules.get("incompatibleMods"): 
                    lines.append(f"incompatibleMods={','.join(rules['incompatibleMods'])}")
                if rules.get("category"): 
                    lines.append(f"category={rules['category']}")
                lines.append("") # Linha em branco entre seções
            
            with open(SORTING_RULES_FILE, "w", encoding="utf-8") as f:
                f.write("\n".join(lines))
        except Exception as e:
            self.log(f"Error saving sorting rules: {e}")

    def _normalize_mod_id(self, mod_id):
        """Retorna o mod_id com o casing correto se ele existir no cache, senão retorna o original."""
        if not hasattr(self, '_case_map'):
            self._case_map = {m['id'].lower(): m['id'] for m in self.mods_data}
        return self._case_map.get(mod_id.lower(), mod_id)

    def _ingest_mod_rules(self, mod_info):
        """Mescla informações do mod.info para o sorting_rules.txt se ainda não existirem."""
        mod_id = mod_info['id']
        needs_save = False
        
        if mod_id not in self.sorting_rules:
            self.sorting_rules[mod_id] = {
                "loadAfter": [], "loadBefore": [], 
                "loadFirst": False, "loadLast": False,
                "incompatibleMods": [], "category": mod_info.get('category', 'undefined')
            }
            needs_save = True

        rules = self.sorting_rules[mod_id]
        
        # 1. Ingerir loadModAfter e require (ambos tratamos como loadAfter para o sorting rules)
        # Normalizando os IDs encontrados para o casing correto do sistema
        found_afters = [self._normalize_mod_id(rid) for rid in list(set(mod_info.get('require', []) + mod_info.get('loadModAfter', [])))]
        
        for rid in found_afters:
            if rid not in rules['loadAfter']:
                rules['loadAfter'].append(rid)
                needs_save = True
        
        # 2. Ingerir Incompatibilidades
        found_inc = [self._normalize_mod_id(iid) for iid in mod_info.get('incompatible', [])]
        for iid in found_inc:
            if iid not in rules['incompatibleMods']:
                rules['incompatibleMods'].append(iid)
                needs_save = True
                
        # 3. Atualizar Categoria se estiver undefined
        if rules.get('category') == 'undefined' and mod_info.get('category') != 'undefined':
            rules['category'] = mod_info.get('category')
            needs_save = True
            
        return needs_save

    def get_file_conflicts(self, active_mods):
        """Mapeia colisões de arquivos entre os mods ativados."""
        file_to_mods = {} # path -> list(mod_id)
        conflicts = {}    # mod_id -> list(conflitos)
        
        for mid in active_mods:
            m_info = next((m for m in self.mods_data if m['id'] == mid), None)
            if not m_info: continue
            
            for file_p in m_info.get("media_files", []):
                if file_p not in file_to_mods:
                    file_to_mods[file_p] = []
                file_to_mods[file_p].append(mid)
        
        # Identificar arquivos compartilhados
        for path, mods in file_to_mods.items():
            if len(mods) > 1:
                for m in mods:
                    if m not in conflicts: conflicts[m] = []
                    # Adicionar detalhes do conflito (quais outros mods e qual arquivo)
                    others = [other for other in mods if other != m]
                    conflicts[m].append({"file": path, "with": others})
        
        return conflicts

    def check_conflicts(self, mod_id, active_mods):
        """Checks if the mod to be activated conflicts with any already active (ID or File)."""
        rules = self.sorting_rules.get(mod_id, {})
        incompatible = rules.get("incompatibleMods", [])
        
        # 1. Rule Conflicts (mod.info / manual)
        rule_conflicts = [m for m in incompatible if m in active_mods]
        if rule_conflicts:
            return {
                "title": "🔴 Incompatible Mods (Rules)",
                "message": f"Mod {mod_id} is explicitly incompatible with: {', '.join(rule_conflicts)}.",
                "remediation": "Deactivate conflicting mods before activating this one."
            }
        
        # 2. Physical File Conflicts (Deep Analysis)
        m_info = next((m for m in self.mods_data if m['id'] == mod_id), None)
        if m_info and m_info.get("media_files"):
            current_files = set(m_info["media_files"])
            for other_id in active_mods:
                other_info = next((m for m in self.mods_data if m['id'] == other_id), None)
                if not other_info: continue
                
                # Intersect files
                overlap = current_files.intersection(set(other_info.get("media_files", [])))
                
                # Filter out translation files (harmless overlaps)
                overlap = {f for f in overlap if "Translate/" not in f}

                if overlap:
                    # Show only first 3 to avoid clutter
                    list_overlap = list(overlap)
                    msg = f"File Conflict with {other_id}! Both modify: {', '.join(list_overlap[:3])}"
                    if len(list_overlap) > 3: msg += f" (and {len(list_overlap)-3} more files)"
                    
                    return {
                        "title": "⚠️ File Conflict Detected",
                        "message": msg,
                        "remediation": "These mods modify the same files and may cause errors. Proceed only if you know one should override the other.",
                        "can_bypass": True # Flag to show the 'Proceed Anyway' button
                    }
        
        return None
        
        return None

    def _sort_mod_ids(self, mod_ids):
        """Ordena IDs usando Topological Sort e o Gabarito Mestre como desempate."""
        from collections import defaultdict, deque
        
        # 0. Recarregar regras para garantir frescor
        self._load_sorting_rules()
        
        # 1. Preparar Grafo
        nodes = list(set(mod_ids))
        adj = defaultdict(list)
        in_degree = {n: 0 for n in nodes}
        
        # Mapear IDs para busca rápida
        all_known_ids = set(nodes)
        
        # 2. Adicionar Dependências do mod.info (Load After)
        dep_status = self.get_dependency_status()
        for mid in nodes:
            # Requisitos obrigatórios devem vir ANTES
            reqs = dep_status.get(mid, {}).get("depends_on", [])
            for r in reqs:
                if r in all_known_ids:
                    adj[r].append(mid)
                    in_degree[mid] += 1

        # 3. Adicionar Regras do sorting_rules.txt
        for mid in nodes:
            rules = self.sorting_rules.get(mid, {})
            # loadAfter: A deve vir depois de B (B -> A)
            for after_id in rules.get("loadAfter", []):
                if after_id in all_known_ids:
                    adj[after_id].append(mid)
                    in_degree[mid] += 1
            # loadBefore: A deve vir antes de B (A -> B)
            for before_id in rules.get("loadBefore", []):
                if before_id in all_known_ids:
                    adj[mid].append(before_id)
                    in_degree[before_id] += 1
            # 4. Tratamento de loadFirst e loadLast via Tiers (Fila de Prioridade)
        # Em vez de criar arestas, usaremos Tiers para desempatar a fila do Kahn.
        def get_base_tier(mid):
            rules = self.sorting_rules.get(mid, {})
            if rules.get("loadFirst"): return 0
            if rules.get("loadLast"): return 2
            return 1 # Standard
            
        effective_tier = {mid: get_base_tier(mid) for mid in nodes}
        
        # Herança de Tiers (Retropropagação)
        # Se um mod (loadFirst - Tier 0) DEPENDE de outro mod (Tier 1), o Tier 0 é bloqueado pelo
        # Tier 1 até que este saia da fila. Para que o grupo saia na frente juntos, a
        # prioridade Tier 0 deve ser transferida para trás nas dependências!
        tier0_nodes = [n for n in nodes if effective_tier[n] == 0]
        if tier0_nodes:
            rev_adj = defaultdict(list)
            for u in adj:
                for v in adj[u]:
                    rev_adj[v].append(u)
                    
            queue_t0 = list(tier0_nodes)
            visited_t0 = set(tier0_nodes)
            while queue_t0:
                curr = queue_t0.pop(0)
                for prev in rev_adj[curr]:
                    if effective_tier[prev] > 0:
                        effective_tier[prev] = 0
                        if prev not in visited_t0:
                            visited_t0.add(prev)
                            queue_t0.append(prev)

        # 4.5. Herança de Tiers para loadLast (Tier 2)
        # Se um mod normal DEPENDE de um Tier 2, o Tier 2 deve ser puxado para Tier 1.
        # Mas na verdade o Project Zomboid raramente faz isso. 
        # Geralmente queremos que o Tier 2 FIQUE no final mesmo que outros dependam dele.
        # Porém, se um Tier 2 é DEPENDÊNCIA de um Tier 1, o Tier 1 não pode carregar ANTES do Tier 2.
        # Isso cria o ciclo. Deixaremos o Kahn detectar o ciclo e o usuário resolver.

        # 5. Kahn's Algorithm com Tier-breaking (Estabilidade de Tiers e Categorias)
        master_priority = {mid: i for i, mid in enumerate(self.master_order)}

        cat_tier_cache = {}
        for mid in nodes:
            rules = self.sorting_rules.get(mid, {})
            # Priorizar categoria definida na regra, senão usar o cache detectado
            cat_name = rules.get("category")
            if not cat_name or cat_name == "undefined":
                m = next((mod for mod in self.mods_data if mod['id'] == mid), None)
                cat_name = m.get('category') if m else "undefined"
            
            cat_tier_cache[mid] = CATEGORY_TIERS.get(cat_name, CATEGORY_TIERS["undefined"])
        
        # Fila inicial: mods com in-degree 0
        queue = [n for n in nodes if in_degree[n] == 0]
        sorted_list = []
        
        while queue:
            # Ordenação Multicamadas (Tie-breakers):
            # 1. Base Tier (loadFirst < Standard < loadLast) - Com herança loadFirst
            # 2. Category Tier (Heurística de Conteúdo: Mapas primeiro, UI depois...)
            # 3. Master Order (Gabarito Histórico / Cache de última ordem estável)
            # 4. Ordem Alfabética (Determinismo Absoluto na API)
            queue.sort(key=lambda x: (
                effective_tier[x], 
                cat_tier_cache.get(x, 99),
                master_priority.get(x, 999999), 
                x.lower()
            ))
            
            u = queue.pop(0)
            sorted_list.append(u)
            
            for v in adj[u]:
                in_degree[v] -= 1
                if in_degree[v] == 0:
                    queue.append(v)
        
        # 6. Detecção de Ciclos
        if len(sorted_list) != len(nodes):
            remaining = [n for n in nodes if n not in sorted_list]
            return sorted_list + remaining, {
                "title": "🔄 Loop de Regras Detectado",
                "message": f"Há um conflito de lógica envolvendo: {', '.join(remaining[:3])}.",
                "remediation": "Verifique se um mod 'LoadFirst' depende de um mod comum, ou se há dependências circulares entre mods no mod.info ou sorting_rules.txt."
            }
        
        return sorted_list, None


    def _sort_workshop_ids(self, workshop_ids, guide_mod_ids=None):
        """Ordena Workshop IDs baseado no primeiro mod que aparece deles na Mods=."""
        workshop_priority = {}
        
        # Se temos uma lista guia, usamos ela como prioridade #1
        if guide_mod_ids:
            for i, mid in enumerate(guide_mod_ids):
                m_info = next((m for m in self.mods_data if m['id'] == mid), None)
                if m_info:
                    wid = m_info['workshop_id']
                    if wid not in workshop_priority:
                        workshop_priority[wid] = i
        
        # Como fallback (para mods inativos), usamos o master_order
        for i, mid in enumerate(self.master_order):
            m_info = next((m for m in self.mods_data if m['id'] == mid), None)
            if m_info:
                wid = m_info['workshop_id']
                if wid not in workshop_priority:
                    workshop_priority[wid] = 1000000 + i

        known_ws = [w for w in workshop_ids if w in workshop_priority]
        known_ws.sort(key=lambda w: workshop_priority[w])
        unknown_ws = [w for w in workshop_ids if w not in workshop_priority]
        return list(dict.fromkeys(known_ws + unknown_ws)) # Unique preservando ordem

    def _load_master_order(self):
        if os.path.exists(MASTER_ORDER_FILE):
            try:
                with open(MASTER_ORDER_FILE, "r", encoding="utf-8") as f: self.master_order = json.load(f)
            except: self.master_order = []

    def _save_master_order(self):
        with open(MASTER_ORDER_FILE, "w", encoding="utf-8") as f:
            json.dump(self.master_order, f)

    # --- PROFILES & BACKUP ---

    def list_profiles(self):
        """Returns a list of saved profile names (without .ini extension)."""
        if not os.path.exists(PROFILES_DIR):
            return []
        return [f.replace(".ini", "") for f in os.listdir(PROFILES_DIR) if f.endswith(".ini")]

    def save_profile(self, name):
        """Saves current servertest.ini as a profile."""
        if not os.path.exists(self.server_config_path):
            return {"status": "error", "message": "Active servertest.ini not found"}
        
        try:
            dest = os.path.join(PROFILES_DIR, f"{name}.ini")
            shutil.copy2(self.server_config_path, dest)
            return {"status": "success", "message": f"Profile '{name}' saved successfully"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def load_profile(self, name):
        """Loads a profile into the active servertest.ini."""
        src = os.path.join(PROFILES_DIR, f"{name}.ini")
        if not os.path.exists(src):
            return {"status": "error", "message": f"Profile '{name}' not found"}
        
        try:
            shutil.copy2(src, self.server_config_path)
            self.load_server_config()
            return {"status": "success", "message": f"Profile '{name}' loaded successfully"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def delete_profile(self, name):
        """Deletes a profile file."""
        path = os.path.join(PROFILES_DIR, f"{name}.ini")
        if os.path.exists(path):
            try:
                os.remove(path)
                return {"status": "success"}
            except Exception as e:
                return {"status": "error", "message": str(e)}
        return {"status": "error", "message": "Profile not found"}

    def create_server_backup(self, zomboid_path, backup_dest):
        """Zips Saves and Server folders from Zomboid path to backup_dest."""
        if not os.path.exists(zomboid_path):
            return {"status": "error", "message": "Zomboid directory not found"}
        
        saves_path = os.path.join(zomboid_path, "Saves")
        server_path = os.path.join(zomboid_path, "Server")
        
        # Validation
        missing = []
        if not os.path.exists(saves_path): missing.append("Saves")
        if not os.path.exists(server_path): missing.append("Server")
        
        if missing:
            return {"status": "error", "message": f"Missing folders in Zomboid path: {', '.join(missing)}"}

        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            zip_filename = f"HellDrinx_PZ_Backup_{timestamp}.zip"
            zip_path = os.path.join(backup_dest, zip_filename)
            
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # Add Saves
                for root, dirs, files in os.walk(saves_path):
                    for file in files:
                        abs_p = os.path.join(root, file)
                        rel_p = os.path.relpath(abs_p, zomboid_path)
                        zipf.write(abs_p, rel_p)
                
                # Add Server
                for root, dirs, files in os.walk(server_path):
                    for file in files:
                        abs_p = os.path.join(root, file)
                        rel_p = os.path.relpath(abs_p, zomboid_path)
                        zipf.write(abs_p, rel_p)
            
            return {"status": "success", "message": f"Backup created: {zip_filename}", "path": zip_path}
        except Exception as e:
            return {"status": "error", "message": str(e)}
