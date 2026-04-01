import customtkinter as ctk
from src.logic.manager import PZModManager
from tkinter import messagebox
from PIL import Image
import os
import threading

# Configuração Global - Otimizada para Performance
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

class LoadingOverlay(ctk.CTkFrame):
    def __init__(self, parent):
        super().__init__(parent, fg_color="#000000", corner_radius=0)
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        content = ctk.CTkFrame(self, fg_color="transparent")
        content.grid(row=0, column=0)

        ctk.CTkLabel(content, text="Sincronizando Banco de Dados...", font=ctk.CTkFont(size=20, weight="bold")).pack(pady=(0, 20))
        
        self.progress_bar = ctk.CTkProgressBar(content, width=400, height=15)
        self.progress_bar.set(0)
        self.progress_bar.pack(pady=10)
        
        self.status_label = ctk.CTkLabel(content, text="Aguardando...", font=ctk.CTkFont(size=12), text_color="gray")
        self.status_label.pack()

    def update_progress(self, current, total):
        pct = current / total
        self.progress_bar.set(pct)
        self.status_label.configure(text=f"Carregando: {current} de {total} ({int(pct*100)}%)")

class ModGroupFrame(ctk.CTkFrame):
    def __init__(self, parent, main_mod, sub_mods, is_trash, on_delete_total, on_delete_specific, on_restore, get_image_func, trash_icon):
        # Simplificação Máxima: Removido border_width e corner_radius excessivos
        super().__init__(parent, fg_color="#1E1E1E", corner_radius=2)
        
        self.main_mod = main_mod
        self.sub_mods = sub_mods
        self.is_trash = is_trash
        self.on_delete_total = on_delete_total
        self.on_delete_specific = on_delete_specific
        self.on_restore = on_restore
        self.get_image_func = get_image_func
        self.trash_icon = trash_icon
        self.expanded = False

        # --- Header (Grid Único sem Aninhamento para Performance) ---
        self.grid_columnconfigure(1, weight=1)

        # 1. Poster
        poster_path = main_mod.get('poster')
        poster = get_image_func(poster_path, size=(80, 80))
        if poster:
            ctk.CTkLabel(self, image=poster, text="").grid(row=0, column=0, rowspan=2, padx=10, pady=10)
        else:
            placeholder = ctk.CTkFrame(self, width=80, height=80, fg_color="#2A2A2A", corner_radius=0)
            placeholder.grid(row=0, column=0, rowspan=2, padx=10, pady=10)
            ctk.CTkLabel(placeholder, text="No Icon", font=ctk.CTkFont(size=9)).place(relx=0.5, rely=0.5, anchor="center")

        # 2. Informações
        ctk.CTkLabel(self, text=main_mod['name'], font=ctk.CTkFont(size=15, weight="bold")).grid(row=0, column=1, sticky="sw")
        
        id_info = f"ID: {main_mod['id']} | Workshop: {main_mod['workshop_id']}"
        if sub_mods: id_info += f" (+{len(sub_mods)} extras)"
        
        ctk.CTkLabel(self, text=id_info, font=ctk.CTkFont(size=11), 
                     text_color="#FFD700" if sub_mods else "gray").grid(row=1, column=1, sticky="nw")

        # 3. Ações
        if is_trash:
            ctk.CTkButton(self, text="🔄", width=35, height=35, fg_color="#228B22", 
                         command=lambda: on_restore(main_mod)).grid(row=0, column=2, rowspan=2, padx=5)
        else:
            btn_trash = ctk.CTkButton(self, image=trash_icon, text="" if trash_icon else "🗑️", width=35, height=35, fg_color="#CD5C5C", 
                                     command=lambda: on_delete_total(main_mod))
            btn_trash.grid(row=0, column=2, rowspan=2, padx=5)

        if sub_mods:
            self.toggle_btn = ctk.CTkButton(self, text="▼", width=30, height=35, fg_color="#333333", 
                                           command=self.toggle_expand)
            self.toggle_btn.grid(row=0, column=3, rowspan=2, padx=(5, 10))
        else:
            self.toggle_btn = None

        self.sub_frame = ctk.CTkFrame(self, fg_color="#161616", corner_radius=0)

    def toggle_expand(self):
        if self.expanded:
            self.sub_frame.grid_forget()
            self.toggle_btn.configure(text="▼")
        else:
            self.sub_frame.grid(row=2, column=0, columnspan=4, sticky="ew", padx=10, pady=(0, 10))
            self.render_sub_mods()
            self.toggle_btn.configure(text="▲")
        self.expanded = not self.expanded

    def render_sub_mods(self):
        for widget in self.sub_frame.winfo_children(): widget.destroy()
        for mod in self.sub_mods:
            row = ctk.CTkFrame(self.sub_frame, fg_color="transparent")
            row.pack(fill="x", padx=10, pady=2)
            ctk.CTkLabel(row, text=mod['name'], font=ctk.CTkFont(size=13)).pack(side="left")
            if not self.is_trash:
                ctk.CTkButton(row, image=self.trash_icon, text="", width=25, height=25, fg_color="transparent", 
                              command=lambda m=mod: self.on_delete_specific(m, self.main_mod['workshop_id'])).pack(side="right")

class App(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("HellDrinx - Tool (ModManager)")
        self.geometry("1000x850")
        self.manager = PZModManager()
        self.image_cache = {}
        
        # Paginação
        self.page_size = 30
        self.current_offset_active = 0
        self.render_queue_active = []
        self.render_queue_trash = []
        self.is_syncing = False

        # Ícone
        trash_img_path = os.path.join("src", "assets", "trash.png")
        if os.path.exists(trash_img_path):
            try:
                pil_trash = Image.open(trash_img_path)
                self.trash_icon = ctk.CTkImage(light_image=pil_trash, dark_image=pil_trash, size=(22, 22))
            except: self.trash_icon = None
        else:
            self.trash_icon = None

        # Grid
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)

        ctk.CTkLabel(self, text="PZ Server Mod Manager", font=ctk.CTkFont(size=22, weight="bold")).grid(row=0, column=0, pady=15)

        self.status_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.status_frame.grid(row=1, column=0, sticky="ew", padx=20)
        self.status_frame.grid_columnconfigure(1, weight=1)
        ctk.CTkButton(self.status_frame, text="Sincronizar", command=self.refresh_all, width=120).grid(row=0, column=0, padx=(0, 10))
        self.status_text = ctk.CTkLabel(self.status_frame, text="Pronto", text_color="gray")
        self.status_text.grid(row=0, column=1, sticky="w")
        self.counter_text = ctk.CTkLabel(self.status_frame, text="0 mods", font=ctk.CTkFont(weight="bold"), text_color="#FFB90F")
        self.counter_text.grid(row=0, column=2)

        self.tabview = ctk.CTkTabview(self, command=self.on_tab_change)
        self.tabview.grid(row=2, column=0, sticky="nsew", padx=20, pady=10)
        self.tabview.add("Ativos no Servidor")
        self.tabview.add("Lixeira / Inativos")

        self.tab_active = ctk.CTkScrollableFrame(self.tabview.tab("Ativos no Servidor"), fg_color="transparent")
        self.tab_active.pack(fill="both", expand=True)
        self.tab_trash = ctk.CTkScrollableFrame(self.tabview.tab("Lixeira / Inativos"), fg_color="transparent")
        self.tab_trash.pack(fill="both", expand=True)

        self.footer = ctk.CTkFrame(self, fg_color="transparent")
        self.footer.grid(row=3, column=0, sticky="ew", padx=20, pady=5)
        ctk.CTkLabel(self.footer, text="UI Otimizada (High Performance)", text_color="#444444").pack(side="left")

        # Scroll Infinite Bind
        self.tab_active._scrollbar.configure(command=self.on_scroll_active)
        self.tab_trash._scrollbar.configure(command=self.on_scroll_trash)

        # Loading Overlay
        self.overlay = LoadingOverlay(self)
        self.overlay.place(relx=0, rely=0, relwidth=1, relheight=1)

        self.after(200, self.refresh_all)

    def on_scroll_active(self, *args):
        self.tab_active._parent_canvas.yview(*args)
        self.check_scroll_bottom()

    def on_scroll_trash(self, *args):
        self.tab_trash._parent_canvas.yview(*args)
        self.check_scroll_bottom()

    def check_scroll_bottom(self):
        tab = self.tabview.get()
        scroll_pos = self.tab_active._scrollbar.get() if tab == "Ativos no Servidor" else self.tab_trash._scrollbar.get()
        if scroll_pos[1] > 0.85:
            self.load_next_page('active' if tab == "Ativos no Servidor" else 'trash')

    def get_mod_image(self, path, size=(80, 80)):
        if not path: return None
        cache_key = f"{path}_{size[0]}"
        if cache_key in self.image_cache: return self.image_cache[cache_key]
        try:
            img = ctk.CTkImage(light_image=Image.open(path), dark_image=Image.open(path), size=size)
            self.image_cache[cache_key] = img
            return img
        except: return None

    def refresh_all(self):
        if self.is_syncing: return
        self.is_syncing = True
        self.overlay.place(relx=0, rely=0, relwidth=1, relheight=1)
        
        # Sincronização em Thread para não travar o movimento da janela
        def run_sync():
            self.manager.scan_workshop(progress_callback=self.overlay.update_progress)
            self.manager.load_server_config()
            self.after(0, self.on_sync_finished)

        threading.Thread(target=run_sync, daemon=True).start()

    def on_sync_finished(self):
        self.is_syncing = False
        self.update_ui()
        self.overlay.place_forget()

    def update_ui(self):
        for w in self.tab_active.winfo_children(): w.destroy()
        for w in self.tab_trash.winfo_children(): w.destroy()
        self.render_queue_active = []
        self.render_queue_trash = []
        self.current_offset_active = 0

        active_list = [m for m in self.manager.mods_data if m['id'] in self.manager.server_mods]
        self.counter_text.configure(text=f"{self.manager.total_mod_folders} mods")

        w_groups = {}
        for m in active_list:
            wid = m['workshop_id']
            if wid not in w_groups: w_groups[wid] = []
            w_groups[wid].append(m)

        for wid, mods in w_groups.items():
            mods_with_img = [m for m in mods if m['poster']]
            mods_no_img = [m for m in mods if not m['poster']]
            if mods_with_img:
                for i, mh in enumerate(mods_with_img):
                    self.render_queue_active.append((mh, mods_no_img if i == 0 else []))
            else:
                self.render_queue_active.append((mods_no_img[0], mods_no_img[1:]))

        for it in self.manager.trash_data: self.render_queue_trash.append((it, []))

        self.load_next_page('active')
        self.load_next_page('trash')

    def load_next_page(self, type):
        queue = self.render_queue_active if type == 'active' else self.render_queue_trash
        offset = self.current_offset_active if type == 'active' else 0 # Simplificado o trash para exemplo
        parent = self.tab_active if type == 'active' else self.tab_trash
        
        batch = queue[offset : offset + self.page_size]
        if not batch: return

        for header, sub in batch:
            ModGroupFrame(parent, header, sub, type=='trash', self.on_delete_total, self.on_delete_specific, self.on_restore, self.get_mod_image, self.trash_icon).pack(fill="x", pady=4)
        
        if type == 'active': self.current_offset_active += self.page_size

    def on_tab_change(self):
        self.check_scroll_bottom()

    def on_delete_total(self, mod):
        if messagebox.askyesno("Remover", f"Remover volume {mod['workshop_id']}?"):
            if self.manager.trash_mod(mod['id'], mod['workshop_id'], mod['name']): self.refresh_all()

    def on_delete_specific(self, m, wid):
        if messagebox.askyesno("Remover", f"Retirar {m['name']}?"):
            if self.manager.remove_specific_mod_id(m['id'], wid): self.refresh_all()

    def on_restore(self, mod):
        if self.manager.restore_mod(mod['workshop_id']): self.refresh_all()

def run_app():
    App().mainloop()
