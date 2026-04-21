import os

workshop = r'C:\Program Files (x86)\Steam\steamapps\workshop\content\108600'
vols = ['3650035249', '3461263912', '3437629766']

for v in vols:
    vol_path = os.path.join(workshop, v)
    mods_dir = os.path.join(vol_path, 'mods')
    print(f'\n--- Vol {v} ---')
    if not os.path.exists(mods_dir):
        print('no mods dir')
        continue
    for m in os.listdir(mods_dir):
        m_path = os.path.join(mods_dir, m)
        if not os.path.isdir(m_path): continue
        info_path = os.path.join(m_path, 'mod.info')
        print(f' Mod folder: {m}')
        if os.path.exists(info_path):
            with open(info_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                print('  [mod.info excerpt]:')
                for line in content.splitlines():
                    if line.startswith('id=') or line.startswith('poster='):
                        print(f'   {line}')
        
        # list images in the folder
        imgs = [f for f in os.listdir(m_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        print(f'  [images found]: {imgs}')
