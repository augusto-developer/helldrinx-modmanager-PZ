# HellDrinx Mod Manager (Refactored)

I’m happy to announce the new **Mod Manager**, completely refactored.

This project was rebuilt to be more complete, modular, and easier to maintain — allowing new features to be added over time with minimal friction.

I sincerely hope this tool makes your life easier. ❤️

---

✨ Features

* Manage your world settings with ease
* Import presets from other players or collections and start playing instantly
* No more stress organizing mod load order — the tool does it for you
* Full control to manually adjust load order when needed
* Automatic mod conflict detection with alerts and diagnostics

---

## How to Use

### 🟢 1. For Beginners

1. Open the tool and click the **gear icon** in the bottom-left corner
2. Select the two required paths:

   * Workshop folder
   * `.ini` file
3. If your mods don’t load immediately, click **SYNC**

> **Note:**
> Mods will only appear in the **Active Mods** tab if they are listed in your `.ini` file under:
>
> ```
> Mods=
> ```

---

### Loading a Preset (Recommended)

Using a preset helps avoid common setup issues.

A preset is simply an `.ini` file used as a base configuration.

#### Example:

```
HellDrinx FULL [42_16+] - v2_2.ini
```

#### Steps:

1. Click **PRESETS**
2. Click **CHOOSE FILE**
3. Select either:

   * FULL preset
   * SOFT preset

Optional:

* You can also import files like:

```
HellDrinx FULL [42_16+] - v2_2_SandboxVars.lua
```

4. Click **Save Preset**

   > It’s recommended to create a backup before saving

Start your server and you're ready to go.

---

### 🔵 2. For Advanced Server Creators

All beginner steps still apply, but here are some additional features:

#### Conflict Detection

* Click the **notification bell** to view detected mod conflicts
* A new tab will open showing a detailed diagnosis

#### AI-Assisted Debugging

* Click **View Diagnosis**
* Then click **COPY AI REPORT**
* This copies a ready-to-use report you can send to an AI to:

  * Understand the issue
  * Get suggestions for fixing it

#### Handling False Positives

* If you find an incorrect warning:

  * Please report it
  * Click **IGNORE** to dismiss it

---

### 🔧 Manual Mod Ordering

* Go to **World → MODS**
* You can manually reorder mods as needed

> By default, the tool organizes mods automatically in the best possible way.
> However, it may occasionally make mistakes, so manual control is always available.

---

### Automatic Workshop ID Sync

When you move a mod:

* Its corresponding `workshopitem ID` is automatically updated

---

## Final Notes

This tool was built to simplify mod management and reduce friction when setting up servers.

If you encounter issues, have suggestions, or find false positives, feel free to contribute or reach out.

---

Enjoy your game and happy modding.
