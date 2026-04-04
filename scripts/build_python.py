import PyInstaller.__main__
import os
import sys

# Get absolute paths
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)
script_path = os.path.join(project_dir, 'src', 'backend_api.py')

PyInstaller.__main__.run([
    script_path,
    '--name=ModManagerEngine',
    '--onedir',
    '--windowed',
    '--noconfirm',
    '--clean',
    '--add-data=src;src', # Include the logic and source files
    '--distpath=dist-python',
    '--workpath=build-python',
    '--icon=build/helldrinx.ico',
    '--version-file=scripts/pyinstaller_version.txt',
])
