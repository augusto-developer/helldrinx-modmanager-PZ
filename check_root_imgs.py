import os

workshop = r'C:\Program Files (x86)\Steam\steamapps\workshop\content\108600'
vols = ['3650035249', '3461263912', '3437629766']

for v in vols:
    vol_path = os.path.join(workshop, v)
    print(f'\n--- Vol {v} ROOT ---')
    if not os.path.exists(vol_path):
        continue
    imgs = [f for f in os.listdir(vol_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    print(f'  [images found in root]: {imgs}')
