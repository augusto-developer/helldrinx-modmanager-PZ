# 🧟 HellDrinx - Project Zomboid Mod Manager

### The ultimate assistant for Project Zomboid server administrators.

Tired of dealing with `servertest.ini` manually? **HellDrinx Mod Manager** was created to automate the most tedious task of running a server: managing, sorting, and cleaning your mods. With a modern, fast, and intuitive interface, you can focus on survival and leave the technicalities to us.

---

## 🚀 Getting Started (Quick Guide)

Follow these steps to get your server running perfectly:

1.  **Open the tool**.
2.  **Click the Gear Icon (Settings)** to configure your `servertest.ini` and Steam Workshop paths.
3.  **Wait for mods to load**. If they don't appear automatically, click **Manual Sync** at the bottom.
4.  **Review your Mods**. You will see the mods currently link to your `.ini`. If your "Active" list is empty, click **Activate All** (your mods are likely in the "Uninstalled" tab).
5.  **Customize your list**. Feel free to remove mods you no longer want; they will be moved to the **Uninstalled** tab to keep your dashboard clean.
6.  **Monitor the Alert Triangle**. Use the issue tracker to stay informed. Always prioritize **Conflicts**; missing dependencies can sometimes be ignored depending on the specific mod requirements.

---

## 🎨 Understanding the UI (Visual Guide)

We use a color and tag system to tell you exactly what's happening with your mods at a glance.

### 🏷️ Mod Tags
*   **CORE**: The main mod from a Steam Workshop item. Usually contains the base logic.
*   **SHARD / SUB-MOD**: Extra mods included in the same Workshop package (e.g., translations, extra maps, or alternative versions).
*   **DEPENDENCY**: Essential mods required by others to function (e.g., "Tsar's Common Library").

### 🌈 Color Guide
*   🟢 **Green**: Mod is active on the server and files are downloaded. All good!
*   ⚪ **Grey**: Mod is downloaded but currently inactive on the server.
*   🟠 **Orange**: Mod is active on the server, but local files were not found. (Check your paths or wait for Steam to finish downloading).
*   🔴 **Red**: Essential dependency is missing or inactive. Action required!

---

## 🛠️ Features to Boost Your Productivity

### One-Click Management
*   **Steam Icon 🌐**: Opens the mod's official Workshop page directly.
*   **Folder Icon 📁**: Opens the exact folder where the mod files are located on your Windows.
*   **REMOVE/ACTIVATE**: Instantly toggles mods. Removed mods are hidden in the **"Uninstalled"** tab to avoid clutter.

### Smart Trash 🧹
Mods you no longer want can be "cleaned." The system moves them to a secure folder, keeping your Steam Workshop directory lean and organized.

### Auto-Sorting ⚡
The assistant analyzes each mod's dependencies and ensures your `servertest.ini` has the **PERFECT** load order, preventing crashes and compatibility errors.

---

## ⚙️ Initial Configuration

Click the **Gear Icon** to set up:
1.  **Workshop Path**: Where Steam downloads your mods (e.g., `.../steamapps/workshop/content/108600`).
2.  **Server Config Path**: Where your server's `.ini` file is located (usually `C:/Users/YOUR_USER/Zomboid/Server`).

*Tip: Once configured, these paths are saved and loaded automatically!*

---

## 📸 Screenshots (Coming Soon)
*[PLACEHOLDER FOR DASHBOARD INTERFACE IMAGES]*

---

## 💎 Credits and Support
Developed by **HellDrinx** for the global Project Zomboid community.

> *"Simplifying management so you have more time to die in Rosewood."*
