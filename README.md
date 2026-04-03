# 🧟 HellDrinx - Tool | Mod Manager
**For Project Zomboid**

### The ultimate assistant for Project Zomboid server administrators.

Tired of dealing with `servertest.ini` manually? **HellDrinx Mod Manager** was created to automate the most tedious tasks of running a server: managing, sorting, and cleaning your mods. With a modern, fast, and intuitive interface, you can focus on survival and leave the technicalities to us.

---

## 🚀 Getting Started (Quick Guide)

Follow these steps to get your server running perfectly:

1. **Open the tool.**
2. **Click the Gear Icon (Settings)** to configure your `servertest.ini` and Steam Workshop paths.
3. **Wait for mods to load.** If they don't appear automatically, click **Manual Sync** at the bottom.
4. **Review your Mods.** You will see the mods currently linked to your `.ini`. If your "Active" list is empty, click **Activate All** (your mods are likely in the "Uninstalled" tab).
5. **Customize your list.** Feel free to remove mods you no longer want; they will be moved to the **Uninstalled** tab to keep your dashboard clean.
6. **Monitor the Alert Triangle.** Use the issue tracker to stay informed. Always prioritize **Conflicts**; missing dependencies can sometimes be ignored depending on specific mod requirements.
    * **6.1 Conflict Interpretation:** Pay close attention to conflict warnings. The message in red refers to another mod; consider disabling it if you wish to keep the mod you are currently reviewing.

---

## 🎨 Understanding the UI (Visual Guide)

We use a color and tag system to tell you exactly what's happening with your mods at a glance.

### 🏷️ Mod Tags
* **CORE**: The main mod from a Steam Workshop item. Usually contains the base logic.
* **SHARD / SUB-MOD**: Extra mods included in the same Workshop package (e.g., translations, extra maps, or alternative versions).
* **DEPENDENCY**: Essential mods required by others to function (e.g., "Tsar's Common Library").

### Color Guide
* 🟢 **Green**: Mod is active on the server and files are downloaded. All good!
* ⚪ **Grey**: Mod is downloaded but currently inactive on the server.
* 🟠 **Orange**: Mod is active on the server, but local files were not found. (Check your paths or wait for Steam to finish downloading).
* 🔴 **Red**: Essential dependency is missing or inactive. Action required!

> **💡 Tip:** You can click the icon next to the mod to open its Steam Workshop page. Check the right-hand sidebar on Steam to see if that mod has any mandatory dependencies.
> 
![Example: ](src/assets/requireditems.png)

---

## 🛠️ Features to Boost Your Productivity

### Understanding the Dashboard:
* **Uninstalled Tab**: Always displays mods that are **DOWNLOADED** but **NOT ACTIVATED** on the server.
* **Active Tab**: Displays mods that are downloaded and currently **ENABLED** in your server configuration.

In the **Active** list, click **REMOVE** to send a mod to the **Uninstalled** list. Conversely, click **ACTIVATE** in the **Uninstalled** list to add it to your server.

### Auto-Sorting ⚡
The assistant analyzes each mod's dependencies and ensures your `servertest.ini` has the **PERFECT** load order, preventing crashes and compatibility errors.

### Presets & Backup
* **Presets**: Create presets to test new configurations on your `servertest.ini`.
* **Backup**: Always create backups before performing "science" or making major changes to your server!

---

## ⚙️ Initial Configuration

Click the **Gear Icon** to set up:
1.  **Workshop Path**: Where Steam downloads your mods (e.g., `.../steamapps/workshop/content/108600`).
2.  **Server Config Path**: Where your server's `.ini` file is located (usually `C:/Users/YOUR_USER/Zomboid/Server`).

*Tip: Once configured, these paths are saved and loaded automatically!*

---

## 💎 Credits and Support
Developed by **augusto-developer** with authorization to use the **HellDrinx** trademark, for the global Project Zomboid community.
