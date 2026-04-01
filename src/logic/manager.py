import os
import re
import shutil
import json

# Default Paths and Data Files
DEFAULT_WORKSHOP = r"C:\Program Files (x86)\Steam\steamapps\workshop\content\108600"
DEFAULT_SERVER_INI = os.path.join(os.environ.get('USERPROFILE', ''), "Zomboid", "Server", "servertest.ini")
TRASH_PATH = os.path.join(os.getcwd(), "src", "trash")
CACHE_FILE = os.path.join(os.getcwd(), "src", "mods_cache.json")
MASTER_ORDER_FILE = os.path.join(os.getcwd(), "src", "master_order.json")
SORTING_RULES_FILE = os.path.join(os.getcwd(), "sorting_rules.txt")
SETTINGS_FILE = os.path.join(os.getcwd(), "src", "settings.json")

class PZModManager:
    def log(self, message):
        log_file = os.path.join(os.getcwd(), "scanner_debug.log")
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"{message}\n")

    def __init__(self):
        self.mods_data = [] 
        self.server_mods = [] 
        self.total_mod_folders = 0
        self.trash_data = [] 
        self.master_order = [] 
        self.sorting_rules = {} 
        
        # Settings
        self.workshop_path = DEFAULT_WORKSHOP
        self.server_config_path = DEFAULT_SERVER_INI
        self.load_settings()

        self._load_master_order()
        self._load_trash_metadata()
        self._load_sorting_rules()
        self.load_server_config()

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
                has_mod = False
                mods_dir = os.path.join(w_path, "mods")
                if os.path.exists(mods_dir):
                    for mod_folder in os.listdir(mods_dir):
                        mod_path = os.path.join(mods_dir, mod_folder)
                        if os.path.isdir(mod_path):
                            has_mod = True
                            self._parse_mod_folder(mod_path, wid)
                if has_mod: 
                    self.total_mod_folders += 1
                else:
                    self.log(f"Warning: Workshop ID {wid} does not contain a valid /mods folder.")
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
            
        self.save_cache()
        return None

    def _parse_mod_folder(self, mod_path, workshop_id):
        mod_folder = os.path.basename(mod_path)
        mod_id, mod_name, poster_path = mod_folder, mod_folder, None
        mod_info_path = os.path.join(mod_path, "mod.info")
        requirements = []
        
        if os.path.exists(mod_info_path):
            try:
                with open(mod_info_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    n_match = re.search(r"^name=(.*)", content, re.MULTILINE)
                    i_match = re.search(r"^id=(.*)", content, re.MULTILINE)
                    p_match = re.search(r"^poster=(.*)", content, re.MULTILINE)
                    r_match = re.search(r"^require=(.*)", content, re.MULTILINE)
                    
                    if n_match: mod_name = n_match.group(1).strip()
                    if i_match: mod_id = i_match.group(1).strip()
                    if p_match:
                        p_abs = os.path.join(mod_path, p_match.group(1).strip())
                        if os.path.exists(p_abs): poster_path = p_abs
                    
                    if r_match:
                        raw_reqs = r_match.group(1).strip()
                        # PZ requirements can be separated by comma or just be one. 
                        # Sometimes they have a leading backslash like \damnlib
                        requirements = [r.strip().replace("\\", "") for r in raw_reqs.split(",") if r.strip()]
            except Exception as e:
                self.log(f"Failed to read mod.info in {mod_path}: {e}")
        
        self.mods_data.append({
            "id": mod_id,
            "name": mod_name,
            "workshop_id": workshop_id,
            "poster": poster_path,
            "require": requirements
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
        src_path = os.path.join(WORKSHOP_PATH, workshop_id)
        dest_path = os.path.join(TRASH_PATH, workshop_id)
        if not os.path.exists(TRASH_PATH): os.makedirs(TRASH_PATH)
        try:
            if os.path.exists(src_path): shutil.move(src_path, dest_path)
            self.trash_data.append({"id": mod_id, "name": mod_name, "workshop_id": workshop_id})
            self._save_trash_metadata()
            self.remove_all_mods_from_workshop_folder(workshop_id)
            self.save_cache()
            return True
        except: return False

    def remove_all_mods_from_workshop_folder(self, workshop_id):
        if not os.path.exists(SERVER_CONFIG_FILE): return
        with open(SERVER_CONFIG_FILE, "r", encoding="utf-8", errors="ignore") as f:
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

    def activate_mod(self, mod_id):
        if not os.path.exists(self.server_config_path): return {"status": "error", "message": "servertest.ini not found"}
        
        # 1. Obter dependências
        dep_status = self.get_dependency_status()
        to_activate = [mod_id]
        
        # Busca recursiva simples de todas as dependências
        queue = [mod_id]
        visited = set()
        while queue:
            current = queue.pop(0)
            if current in visited: continue
            visited.add(current)
            reqs = dep_status.get(current, {}).get("depends_on", [])
            for r in reqs:
                if r not in visited:
                    to_activate.append(r)
                    queue.append(r)

        # 1.5. Ativação Inteligente de "Mods Irmãos" (Mesmo Workshop)
        # Se um mod no mesmo Workshop Id requer este mod, ativamos também (Patch/Tradução)
        target_workshop_id = None
        for m in self.mods_data:
            if m['id'] == mod_id:
                target_workshop_id = m['workshop_id']
                break
        
        if target_workshop_id:
            for m in self.mods_data:
                mid = m['id']
                if m['workshop_id'] == target_workshop_id and mid not in to_activate:
                    # Se o mod irmão requer o mod atual ou algum que já está sendo ativado
                    # PZ usa require=modid1,modid2
                    reqs = m.get('require', [])
                    if any(r in to_activate for r in reqs):
                        to_activate.append(mid)
                        # Nota: Não precisamos processar recursivamente aqui pois assumimos 
                        # que o irmão depende de algo já na lista.
        
        # 2. Verificar conflitos ANTES de ativar
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
                
                # AQUI ESTÁ O SEGREDO: SEMPRE RE-ORDENAR TUDO
                sorted_total, error = self._sort_mod_ids(new_items)
                if error:
                    # Se houver erro de ciclo, retornamos a lista sem ordem mas com os novos
                    return re.sub(regex, f"{prefix}={';'.join(new_items)}", content_str, flags=re.MULTILINE), error
                
                return re.sub(regex, f"{prefix}={';'.join(sorted_total)}", content_str, flags=re.MULTILINE), None

            # Ativar Mods (IDs internos) - ORDENADO POR REGRAS
            sorted_to_activate, error = self._sort_mod_ids(to_activate)
            if error: return {"status": "error", **error}
            
            content, err_mods = update_line("Mods", to_activate, content)
            if err_mods: return {"status": "error", **err_mods}
            
            # Ativar Workshop IDs correspondentes
            # Pegamos a lista final de mods que resultou do update_line
            regex_mods = r"^Mods=(.*)$"
            match_m = re.search(regex_mods, content, re.MULTILINE)
            if match_m:
                final_mod_ids = match_m.group(1).split(";")
                wids_to_add = []
                for mid in final_mod_ids:
                    mod_info = next((m for m in self.mods_data if m['id'] == mid), None)
                    if mod_info: wids_to_add.append(mod_info['workshop_id'])
                
                content = re.sub(r"^WorkshopItems=.*$", f"WorkshopItems={';'.join(self._sort_workshop_ids(wids_to_add, final_mod_ids))}", content, flags=re.MULTILINE)
            
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

            # Descobrir dependências antes de remover
            dep_status = self.get_dependency_status()
            potential_orphans = dep_status.get(mod_id, {}).get("depends_on", [])

            # Remover o Mod ID principal
            regex_mods = r"^Mods=(.*)$"
            match = re.search(regex_mods, content, re.MULTILINE)
            if match:
                items = match.group(1).split(";")
                items = [i for i in items if i.strip() and i != mod_id]
                content = re.sub(regex_mods, f"Mods={';'.join(items)}", content, flags=re.MULTILINE)

            # Verificação recursiva de limpeza (Smart Cleanup)
            # Removemos a dependência apenas se ninguém mais ativo precisar dela
            current_active = set(items) if match else set()
            cleaned_up_ids = []
            
            check_queue = list(potential_orphans)
            while check_queue:
                dep_id = check_queue.pop(0)
                # Alguém ATIVO depende deste cara?
                is_needed = False
                for other_active in current_active:
                    if dep_id in dep_status.get(other_active, {}).get("depends_on", []):
                        is_needed = True
                        break
                
                if not is_needed and dep_id not in cleaned_up_ids:
                    # Pode remover!
                    cleaned_up_ids.append(dep_id)
                    current_active.discard(dep_id)
                    # E checar o que ESTE cara dependia
                    check_queue.extend(dep_status.get(dep_id, {}).get("depends_on", []))
            
            # Atualizar linha final de mods com limpezas - ORDENADO POR REGRAS
            ordered_active, error = self._sort_mod_ids(list(current_active))
            # Se houver erro de ciclo aqui, apenas removemos (não bloqueamos a deleção)
            final_list = ordered_active if not error else list(current_active)
            content = re.sub(regex_mods, f"Mods={';'.join(final_list)}", content, flags=re.MULTILINE)

            # Verificar Workshop IDs que sobraram
            remaining_wids = set()
            for mid in current_active:
                minfo = next((m for m in self.mods_data if m['id'] == mid), None)
                if minfo: remaining_wids.add(minfo['workshop_id'])
            
            regex_w = r"^WorkshopItems=(.*)$"
            match_w = re.search(regex_w, content, re.MULTILINE)
            if match_w:
                current_wids = match_w.group(1).split(";")
                # Filtrar e Ordenar Workshop IDs
                new_wids = [w for w in current_wids if w.strip() and (w in remaining_wids)]
                content = re.sub(regex_w, f"WorkshopItems={';'.join(self._sort_workshop_ids(new_wids, final_list))}", content, flags=re.MULTILINE)

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
            
            # A. Dependências de mod.info (Hard)
            reqs = mod.get('require', [])
            for r in reqs:
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
        except Exception as e:
            print(f"Error parsing rules: {e}")

    def check_conflicts(self, mod_id, active_mods):
        """Verifica se o mod a ser ativado colide com algum já ativo."""
        rules = self.sorting_rules.get(mod_id, {})
        incompatible = rules.get("incompatibleMods", [])
        
        conflicts = [m for m in incompatible if m in active_mods]
        if conflicts:
            return {
                "title": "🔴 Mods Incompatíveis",
                "message": f"O Mod que você tentou ativar ({mod_id}) não funciona junto com: {', '.join(conflicts)}.",
                "remediation": "Desative os mods conflitantes antes de tentar ativar este."
            }
        
        # Também verificar se o mod_id é uma dependência de ALGUÉM que é incompatível? 
        # Geralmente a regra é no mod "filho", mas vamos manter simples por enquanto.
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
        def get_tier(mid):
            rules = self.sorting_rules.get(mid, {})
            if rules.get("loadFirst"): return 0
            if rules.get("loadLast"): return 2
            return 1 # Standard
            
        # 5. Kahn's Algorithm com Tier-breaking (Estabilidade de Tiers)
        master_priority = {mid: i for i, mid in enumerate(self.master_order)}
        
        # Fila inicial: mods com in-degree 0
        queue = [n for n in nodes if in_degree[n] == 0]
        sorted_list = []
        
        while queue:
            # Ordenação Multicamadas:
            # 1. Tier (First < Middle < Last)
            # 2. Master Order (Gabarito Original)
            queue.sort(key=lambda x: (get_tier(x), master_priority.get(x, 999999)))
            
            u = queue.pop(0)
            sorted_list.append(u)
            
            for v in adj[u]:
                in_degree[v] -= 1
                if in_degree[v] == 0:
                    queue.append(v)
        
        # 6. Detecção de Ciclos
        if len(sorted_list) != len(nodes):
            # Encontrar quem sobrou (participa de um loop)
            remaining = [n for n in nodes if n not in sorted_list]
            return sorted_list + remaining, {
                "title": "🔄 Loop de Regras Detectado",
                "message": f"Há um conflito de lógica: {', '.join(remaining[:3])}. O sistema organizou o possível, mas verifique o sorting_rules.txt por ciclos.",
                "remediation": "Pode ocorrer se um mod normal depender de um mod 'LoadLast'."
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
        # ... logic as before ...
        if os.path.exists(MASTER_ORDER_FILE):
            try:
                with open(MASTER_ORDER_FILE, "r", encoding="utf-8") as f: self.master_order = json.load(f)
            except: self.master_order = []

    def _save_master_order(self):
        # ... logic as before ...
        with open(MASTER_ORDER_FILE, "w", encoding="utf-8") as f:
            json.dump(self.master_order, f)
