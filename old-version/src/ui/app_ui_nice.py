from nicegui import ui, app
import os
from src.logic.manager import PZModManager
from PIL import Image
import base64
from io import BytesIO
import asyncio

class NiceModManager:
    def __init__(self):
        self.manager = PZModManager()
        self.image_cache = {}
        self.active_mods = []
        self.trash_mods = []
        self.container = None # Será definido no run_ui
        
        # Estilo Customizado (Dark Premium)
        ui.query('body').style('background-color: #0f172a; color: #f8fafc; font-family: "Outfit", sans-serif;')
        ui.add_head_html('<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">')

    def get_base64_image(self, path, size=(120, 120)):
        if not path or not os.path.exists(path):
            return None
        cache_key = f"{path}_{size[0]}"
        if cache_key in self.image_cache:
            return self.image_cache[cache_key]
        
        try:
            img = Image.open(path)
            img.thumbnail(size)
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            result = f"data:image/png;base64,{img_str}"
            self.image_cache[cache_key] = result
            return result
        except Exception:
            return None

    async def run_sync(self, progress_bar, status_label):
        """Executa a sincronização 0-100% com feedback visual."""
        status_label.set_text("Iniciando descoberta de pastas...")
        progress_bar.set_value(0)
        
        def update_ui(current, total):
            progress_bar.set_value(current / total)
            status_label.set_text(f"Lendo Mods: {current} de {total}")

        await asyncio.to_thread(self.manager.scan_workshop, update_ui)
        await asyncio.to_thread(self.manager.load_server_config)
        
        status_label.set_text("Sincronização Concluída!")
        await asyncio.sleep(0.5)
        self.refresh_lists()

    def refresh_lists(self):
        if not self.container: return
        self.container.clear()
        
        self.active_mods = [m for m in self.manager.mods_data if m['id'] in self.manager.server_mods]
        self.trash_mods = self.manager.trash_data
        
        w_groups = {}
        for m in self.active_mods:
            wid = m['workshop_id']
            if wid not in w_groups: w_groups[wid] = []
            w_groups[wid].append(m)

        with self.container:
            with ui.tabs().classes('w-full bg-slate-900 shadow-xl rounded-lg') as tabs:
                active_tab = ui.tab('Ativos no Servidor', icon='settings')
                trash_tab = ui.tab('Lixeira / Inativos', icon='delete_sweep')
            
            with ui.tab_panels(tabs, value=active_tab).classes('w-full bg-transparent mt-4'):
                with ui.tab_panel(active_tab):
                    if not w_groups:
                        ui.label('Nenhum mod ativo encontrado.').classes('text-slate-400 italic text-center w-full py-10')
                    else:
                        for wid, mods in w_groups.items():
                            self.render_mod_group(wid, mods, is_trash=False)
                
                with ui.tab_panel(trash_tab):
                    if not self.trash_mods:
                        ui.label('A lixeira está vazia.').classes('text-slate-400 italic text-center w-full py-10')
                    else:
                        for item in self.trash_mods:
                            self.render_mod_group(item['workshop_id'], [item], is_trash=True)

    def render_mod_group(self, workshop_id, mods, is_trash):
        mods_with_img = [m for m in mods if m.get('poster')]
        mods_no_img = [m for m in mods if not m.get('poster')]
        
        if mods_with_img:
            for i, main_mod in enumerate(mods_with_img):
                sub = mods_no_img if i == 0 else []
                self.create_mod_card(main_mod, sub, is_trash)
        elif mods_no_img:
            self.create_mod_card(mods_no_img[0], mods_no_img[1:], is_trash)

    def create_mod_card(self, main_mod, sub_mods, is_trash):
        with ui.card().classes('w-full mb-4 bg-slate-800/40 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 shadow-lg p-0 overflow-hidden'):
            with ui.row().classes('w-full items-center no-wrap gap-0'):
                # Poster Section
                b64 = self.get_base64_image(main_mod.get('poster'))
                if b64:
                    ui.image(b64).classes('w-32 h-32 object-cover border-r border-slate-700/40')
                else:
                    with ui.column().classes('w-32 h-32 bg-slate-700/30 items-center justify-center border-r border-slate-700/40'):
                        ui.icon('broken_image', color='slate-500').classes('text-3xl')
                
                # Content Section
                with ui.column().classes('flex-grow p-4 gap-1'):
                    ui.label(main_mod['name']).classes('text-xl font-bold text-slate-100 leading-tight mb-1')
                    with ui.row().classes('gap-3'):
                        ui.label(f"ID: {main_mod['id']}").classes('text-xs text-blue-400 font-mono')
                        ui.label(f"Volume: {main_mod['workshop_id']}").classes('text-xs text-slate-400 font-mono')
                    
                    if sub_mods:
                         ui.label(f"+{len(sub_mods)} sub-mods agrupados").classes('text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-1')

                # Actions Section
                with ui.row().classes('p-4 items-center gap-2'):
                    if is_trash:
                        ui.button(icon='history', on_click=lambda: self.restore(main_mod)).props('flat round color=green').tooltip('Restaurar Volume')
                    else:
                        ui.button(icon='delete_outline', color='red-400', on_click=lambda: self.delete_volume(main_mod)).props('flat round').tooltip('Mover para Lixeira')
                        if sub_mods:
                            with ui.expansion('', icon='expand_more').classes('bg-transparent border-none shadow-none text-slate-400'):
                                with ui.column().classes('w-full bg-slate-900/50 p-2 rounded-lg'):
                                    for sm in sub_mods:
                                        with ui.row().classes('w-full items-center justify-between border-b border-slate-800 last:border-0 py-1 px-2'):
                                            ui.label(sm['name']).classes('text-xs text-slate-300')
                                            ui.button(icon='close', on_click=lambda m=sm: self.delete_specific(m, main_mod['workshop_id'])).props('flat round dense color=red-300').classes('scale-75')

    async def delete_volume(self, mod):
        # Diálogo de confirmação simplificado com notify para manter fluidez
        if self.manager.trash_mod(mod['id'], mod['workshop_id'], mod['name']):
            ui.notify(f"Volume {mod['workshop_id']} arquivado", type='warning', position='top')
            self.refresh_lists()

    async def delete_specific(self, mod, workshop_id):
        if self.manager.remove_specific_mod_id(mod['id'], workshop_id):
            ui.notify(f"Mod {mod['name']} desativado", type='info', position='top')
            self.refresh_lists()

    async def restore(self, mod):
        if self.manager.restore_mod(mod['workshop_id']):
            ui.notify(f"Mod {mod['workshop_id']} restaurado com sucesso!", type='positive', position='top')
            self.refresh_lists()

    def empty_trash_confirm(self):
        if self.manager.empty_trash():
            ui.notify("Lixeira esvaziada permanentemente", type='info')
            self.refresh_lists()

def run_ui():
    nm = NiceModManager()
    
    with ui.column().classes('w-full max-w-5xl mx-auto p-6 gap-6'):
        # Header Premium
        with ui.row().classes('w-full items-center justify-between bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl'):
            with ui.column().classes('gap-0'):
                ui.label('Project Zomboid').classes('text-blue-500 font-bold text-xs uppercase tracking-[0.2em]')
                ui.label('HellDrinx - Tool (ModManager)').classes('text-4xl font-extrabold text-white tracking-tight')
            
            with ui.row().classes('items-center gap-3'):
                ui.button('SINCRONIZAR', icon='sync', on_click=lambda: nm.run_sync(pb, sl)).props('rounded-pill elevated color=blue-700').classes('px-6 font-bold')
                ui.button(icon='delete_forever', color='red-500', on_click=nm.empty_trash_confirm).props('round flat').tooltip('Limpar Lixeira')

        # Status & Progress Area
        with ui.card().classes('w-full bg-slate-900/50 border-none shadow-none p-4'):
            with ui.row().classes('w-full items-center justify-between mb-2'):
                sl = ui.label('Preparado').classes('text-slate-400 text-sm font-medium')
                ui.label('v2.0 Performance Edition').classes('text-slate-700 text-[10px] font-bold')
            pb = ui.linear_progress(value=0).classes('w-full h-1.5 rounded-full bg-slate-800')

        # List Container
        nm.container = ui.column().classes('w-full gap-2')
        
        # Auto-start flow
        async def init_flow():
            await asyncio.sleep(0.3)
            await nm.run_sync(pb, sl)
        
        app.on_startup(init_flow)

    ui.run(
        title="HellDrinx - Tool (ModManager)", 
        native=True, 
        window_size=(1100, 950), 
        dark=True,
        reload=False # Evita recarregamento desnecessário no modo nativo
    )

if __name__ in {"__main__", "__mp_main__"}:
    run_ui()
