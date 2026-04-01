# Project Zomboid Server | HellDrinx - Tool (ModManager)

A modern desktop assistant to manage your Project Zomboid server mods with ease and performance.

## 🚀 Getting Started

1.  **Install dependencies**:
    From your terminal/command prompt, inside the project folder, run:
    ```bash
    npm install
    pip install -r requirements.txt
    ```

2.  **Run the application**:
    ```bash
    npm run electron:dev
    ```

## ✨ Features

-   **Automatic Mapping**: Scans your Steam Workshop folder and identifies real mod names from `mod.info` files.
-   **Intelligent Sorting**: Automatically sorts your `Mods=` and `WorkshopItems=` lines in `servertest.ini` based on dependencies and custom rules.
-   **Dependency Tracking**: Visual indicators for mod requirements and missing dependencies.
-   **Safe Management**: Move inactive mods to a local Trash folder to keep your main Workshop folder clean.
-   **Premium UI**: Sleek Dark Mode interface built with React, Vite, and Framer Motion.

## 🛠️ Path Configurations

The application targets default paths:
-   **Workshop**: `C:\Program Files (x86)\Steam\steamapps\workshop\content\108600`
-   **Server Config**: `C:\Users\[YourUser]\Zomboid\Server\servertest.ini`

Paths can be customized in the `src/logic/manager.py` file if needed.

## 🏗️ Technical Stack

-   **Backend**: Python (FastAPI)
-   **Frontend**: React (TSX) + Vite
-   **Desktop Wrapper**: Electron
-   **Animations**: Framer Motion
-   **Icons**: Lucide React

---
*Created with focus on performance and reliability for large mod lists.*
