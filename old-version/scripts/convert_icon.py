from PIL import Image
import os

def convert_png_to_ico(png_path, ico_path):
    img = Image.open(png_path)
    # Standard ICO sizes
    sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img.save(ico_path, format='ICO', sizes=sizes)
    print(f"Converted {png_path} to {ico_path} with sizes {sizes}")

if __name__ == "__main__":
    build_dir = r"D:\mods_manager\build"
    png_file = os.path.join(build_dir, "icon.png")
    ico_file = os.path.join(build_dir, "helldrinx.ico")
    
    if os.path.exists(png_file):
        convert_png_to_ico(png_file, ico_file)
    else:
        print(f"Error: {png_file} not found")
