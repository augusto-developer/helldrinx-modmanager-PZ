<div align="center">
  <h1>🧟 HellDrinx Mod Manager</h1>
  <p><strong>Advanced Mod Management & Conflict Resolution for Project Zomboid</strong></p>

  ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
  ![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)
  ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
</div>

<br/>

Welcome to the official technical documentation for the **HellDrinx Mod Manager**. This project aims to provide a robust, high-performance, and visually appealing tool to manage complex mod collections for the game Project Zomboid.

---

## 📑 Table of Contents
<details>
<summary>Click to expand</summary>

- [🏗️ System Architecture](#️-system-architecture)
- [🔍 Deep Dive: Core Logic](#-deep-dive-core-logic)
  - [1. Mod Capture and Parse Engine](#1-mod-capture-and-parse-engine-workshopcjs)
  - [2. Dependency Management and Sorting](#2-dependency-management-and-sorting-kahns-algorithm)
  - [3. Conflicts Engine and Deep Audit](#3-conflicts-engine-and-deep-audit-getallconflicts)
  - [4. AI-Powered Diagnosis](#4-ai-powered-diagnosis-diagnoseconflict)
- [🛠️ Quick Contribution Guide](#️-quick-contribution-guide)

</details>

---

## 🏗️ System Architecture

The project adopts a modern Desktop architecture divided into three primary layers to ensure security, performance, and a stunning UI:

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React, Vite, Tailwind | Utilizes modern design practices (glassmorphism, fluid animations) for a premium UX. Global state is efficiently managed, allowing hundreds of mods to be updated in real-time. |
| **Bridge** | Electron IPC | Acts as a container, providing local OS APIs to the web interface securely via `contextBridge`. It routes frontend requests directly to our Node.js services. |
| **Backend** | Node.js (CommonJS) | The heart of the project. Built for fast file I/O processing and graph calculations. It scans mods, parses syntax, sorts algorithms, and detects conflicts with surgical precision. |

> [!NOTE]  
> The primary backend services are located in `backend/services`:
> - `workshop.cjs` (Mod management, parsing, and conflicts)
> - `world_config.cjs` (Server/Sandbox options and `.ini` parsing)

---

## 🔍 Deep Dive: Core Logic

### 1. Mod Capture and Parse Engine (`workshop.cjs`)

The identification and assimilation of local mods is executed by the `scanWorkshop()` function in the `WorkshopService`.

#### 📂 The Scanning Flow
Instead of reading a static database, the engine actively queries the user's file system using `fs.readdirSync`:
- **Deep Metadata Scan:** When finding a Workshop Item folder, it triggers a recursive search (`findRecursive`). This handles single Steam items containing multiple smaller mods, separated by game versions (e.g., `42.1`, `common`).
- **Version Scoring:** The engine automatically picks the best version of a mod based on folder naming (e.g., `42` gets a score of `100`, `common` gets `50`).

#### 📝 Deep Parse of `mod.info`
Every PZ mod dictates its fundamental rules through the `mod.info` file. The engine extracts data via Regular Expressions:
* `id`: The internal identifier (the most critical one).
* `require`: Hard-requirements of the mod.
* `incompatible`: Explicit definitions of incompatible mods.

> [!TIP]
> **ID Normalization:** To prevent folder collisions, the `normalizeId()` function intercepts ID strings, removes dirty characters, and casts them to lowercase to ensure absolute consistency.

#### 🤖 Categorization Heuristics: The MLOS System
The Engine categorizes mods via **Machine Logic Overlay Scanning (MLOS)**, checking the internal folder structure to apply `CATEGORY_TIERS`:

* 🗺️ **Map:** Presence of the `media/maps` folder.
* 🚗 **Vehicle:** 3D files located under `media/models/vehicles`.
* ⚙️ **Tweaks / API:** Detected by keywords like `api`, `framework`, or `lib`.
* 🖼️ **UI:** Has `media/ui` or `media/textures/ui` folders.
* 🌐 **Translation:** Has `media/lua/shared/Translate`.
* 👑 **Pre-Order Mods:** Core APIs (`modoptions`, `modloadordersorter_b42`) gain a Master Tier flag to always load first.

---

### 2. Dependency Management and Sorting (Kahn's Algorithm)

The engine reorganizes lists of hundreds of mods to ensure that fundamental mods load first and patches load after what they modify, preventing circular blocks. This is handled by `sortModIds(modIds)`.

#### 🕸️ Mapping the Directed Graph
The engine creates a **Directed Acyclic Graph (DAG)** mapping connections (`Mod A -> depends_on -> Mod B`) using an adjacency map (`adj`) and an in-degree map (`inDegree`). It collects dependencies from:
- `require` in `mod.info`.
- `sorting_rules.txt` (Logical rules applied via `loadAfter` and `loadBefore` tags).

#### ⚖️ Topological Sorting & Tie-Breaking
With the DAG created, we execute the sorting through **Kahn's Algorithm**. The algorithm finds nodes with **In-Degree = 0**. If there are multiple mods competing to load, the engine injects a Multi-Layer Tie-Breaker Chamber:

1. **Pre-Order System:** Master mods forced to load first.
2. **Category Tier (MLOS):** The enum generated in the heuristic parse.
3. **Master Priority:** The user's saved historical order.
4. **Alphabetical Order:** The absolute fallback (`localeCompare`) to maintain determinism.

---

### 3. Conflicts Engine and Deep Audit (`getAllConflicts`)

When activating hundreds of mods, logic overlaps are guaranteed. The native HellDrinx Conflicts Engine exists to veto failures *before* the game starts.

#### 🔴 A. Rule Conflicts (Hard-Coded)
The engine checks `mod.info` metadata looking for the **`incompatibleMods`** flag. If a mod explicitly prohibits working in the presence of another active mod, it throws a `rule` conflict.

#### 🗂️ B. File Conflicts (Overwrites / Deep Audit)
Most PZ mods consist of parallel Lua scripts. If Mod A and Mod B contain **the exact same path and file**, only **one of them will win (Block Winner)**.
The `getAllFiles()` function collects all files from critical directories (`lua`, `scripts`, `maps`), deliberately ignoring engine-level files (like `sandbox-options.txt`) and common textures (`.png`, `.jpg`) to prevent "False Positives".

> [!IMPORTANT]
> **SHA-256 Fingerprinting and "Whitelist Bypass"**
> Many conflicts are intentional (e.g., a Patch overwriting a master mod). To prevent bombarding the user, the `_getConflictFingerprint` function creates a `crypto.createHash('sha256')` signature based on the conflicting Mod IDs and the exact overlapping files. 
> When the user clicks "Ignore", this hash is saved in `ignoredFingerprints`. On subsequent syncs, the engine silently bypasses this collision.

---

### 4. AI-Powered Diagnosis (`diagnoseConflict`)

**The Ultimate Diagnostic Tool.** 

When a file conflict is detected, the engine doesn't just block it. It invokes the `diagnoseConflict` method. This method:
1. Finds the overlapping Lua/Script files.
2. Extracts the **first 50 lines of code** (snippets) from both conflicting mods.
3. Structures a highly detailed prompt (`aiContext`).

This prompt can be fed directly to an AI (like Claude or ChatGPT) to automatically generate a patch or explain if the logic overwrite is safe, giving users unprecedented power to resolve complex mod collisions!

---

## 🛠️ Quick Contribution Guide

### 1. Modifying the Engine (`backend/services/workshop.cjs`)

If you are going to edit how mods are read, sorted, or fingerprinted, `workshop.cjs` is your entry point. 

> [!WARNING]  
> Maintain clean, pragmatic code without over-engineering. Remember that file I/O operations (`fs.readdirSync`, `fs.readFileSync`) are performed **synchronously** here to guarantee deterministic memory loading during the Mod Scan phase. Do not convert them to async unless strictly necessary for UI unblocking outside the core algorithm.
