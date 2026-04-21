const fs = require('fs');
const path = require('path');

// Modular Imports
const { iniStructure } = require('../world_config/ini_schema.cjs');
const { 
    categories, 
    labelMap, 
    tooltipOverrides, 
    knownFloats, 
    fieldBlacklist 
} = require('../world_config/sandbox_schema.cjs');
const { getOptionsForField } = require('../world_config/field_options.cjs');

class ConfigService {
    constructor() {
        this.originalTypes = {}; 
        this.forcedFloats = new Set();
        
        // Use modular schemas
        this.iniStructure = iniStructure;
        this.sandboxCategories = categories;
        this.labelMap = labelMap;
        this.tooltipOverrides = tooltipOverrides;
        this.knownFloatKeys = new Set(knownFloats);
        this.fieldBlacklist = new Set(fieldBlacklist);
    }

    readSandboxVars(luaPath) {
        if (!fs.existsSync(luaPath)) {
            return { error: `File not found: ${luaPath}` };
        }

        const content = fs.readFileSync(luaPath, 'utf8').split('\n');
        const parsedVars = {};
        
        const kvRegex = /^\s*(\w+)\s*=\s*(.*),/;
        const tableStartRegex = /^\s*(\w+)\s*=\s*{/;
        const tableEndRegex = /^\s*},/;
        
        let currentComments = [];
        let currentTable = null;

        content.forEach(line => {
            const stripped = line.trim();
            
            // 1. Collect comments
            if (stripped.startsWith("--")) {
                const commentText = stripped.replace(/^--\s*/, '').trim();
                if (commentText && !/^[=-_*]+$/.test(commentText)) {
                    currentComments.push(commentText);
                }
                return;
            }
            
            // 2. Check for table end
            if (currentTable && tableEndRegex.test(line)) {
                currentTable = null;
                return;
            }

            // 3. Check for table start
            const tsMatch = line.match(tableStartRegex);
            if (tsMatch) {
                currentTable = tsMatch[1];
                return;
            }

            // 4. Check for Key-Value
            const kvMatch = line.match(kvRegex);
            if (kvMatch) {
                const keyRaw = kvMatch[1];
                const valueRaw = kvMatch[2].trim();
                
                const fullKey = currentTable && currentTable !== "SandboxVars" 
                    ? `${currentTable}.${keyRaw}` 
                    : keyRaw;
                
                let value;
                if (valueRaw.toLowerCase() === "true") value = true;
                else if (valueRaw.toLowerCase() === "false") value = false;
                else if (valueRaw.startsWith('"') && valueRaw.endsWith('"')) value = valueRaw.slice(1, -1);
                else {
                    const num = Number(valueRaw);
                    if (!isNaN(num) && valueRaw !== "") {
                        value = num;
                        if (valueRaw.includes('.')) this.originalTypes[fullKey] = "float";
                        else this.originalTypes[fullKey] = "int";
                    } else {
                        value = valueRaw;
                    }
                }
                
                // Group comments for float and options detection
                const combinedComments = currentComments.join(' ');
                
                // 1. Dynamic Float Detection (Min: 0,00 or Max: 0.00)
                if (/(Min|Max|Default)\s*[=:]\s*(-?\d+[.,]\d+)/i.test(combinedComments)) {
                    this.forcedFloats.add(fullKey);
                }

                // 2. Dynamic Options Detection (1 = label, 2 = label)
                const dynamicOptions = [];
                // Look for patterns like "1 = Inside" or "2- Outside" or "3 : Anywhere"
                // uses non-greedy lookahead to stop before the next number=pattern or end of string
                const optionRegex = /(\d+)\s*[=:-]\s*(.*?)(?=\s*\d+\s*[=:-]|$|,)/g;
                let optMatch;
                while ((optMatch = optionRegex.exec(combinedComments)) !== null) {
                    const val = parseInt(optMatch[1]);
                    const label = optMatch[2].trim();
                    // Basic sanity check: ignore if label is too short or looks like another setting
                    if (label && !isNaN(val) && label.length >= 2 && !label.includes('=')) {
                        dynamicOptions.push({ value: val, label });
                    }
                }

                // If Min/Max is present, it's a manual input, so ignore dynamic options
                const hasManualConstraints = /(Min|Max)\s*[=:]/i.test(combinedComments);
                const finalDynamicOptions = hasManualConstraints ? [] : dynamicOptions;

                let rawDefault = null;
                const defMatch = combinedComments.match(/Default\s*[=:]\s*([^,.\n#--]*)/i);
                if (defMatch) rawDefault = defMatch[1].trim();

                parsedVars[fullKey] = {
                    value,
                    tooltip: currentComments[0] || "",
                    rawDefault,
                    dynamicOptions: finalDynamicOptions
                };
                currentComments = [];
            } else if (stripped) {
                if (!stripped.startsWith("SandboxVars = {")) {
                    currentComments = [];
                }
            }
        });

        const categoriesData = [];
        const allCategorizedKeys = new Set();
        Object.values(this.sandboxCategories).flat().forEach(item => {
            if (typeof item === 'string') allCategorizedKeys.add(item);
        });

        for (const [catId, items] of Object.entries(this.sandboxCategories)) {
            const fields = [];
            let currentSection = "";

            items.forEach(item => {
                if (typeof item === 'object' && item.section) {
                    currentSection = item.section;
                    return;
                }
                
                if (parsedVars[item] && !this.fieldBlacklist.has(item)) {
                    const hardcodedOptions = getOptionsForField(item);
                    // Use hardcoded options if available, otherwise fallback to dynamic options from comments
                    const finalOptions = (hardcodedOptions && hardcodedOptions.length > 0)
                        ? hardcodedOptions
                        : (parsedVars[item].dynamicOptions && parsedVars[item].dynamicOptions.length > 1 ? parsedVars[item].dynamicOptions : null);

                    fields.push({
                        id: item,
                        name: this.labelMap[item] || item,
                        value: parsedVars[item].value,
                        tooltip: this.tooltipOverrides[item] || parsedVars[item].tooltip,
                        section: currentSection,
                        ...(finalOptions ? { options: finalOptions } : {})
                    });
                }
            });

            if (fields.length > 0) {
                categoriesData.push({ id: catId, name: this.getCategoryName(catId), fields });
            }
        }

        // Handle Mods category
        const modsFields = [];
        Object.keys(parsedVars).sort().forEach(fid => {
            if (!allCategorizedKeys.has(fid) && !this.fieldBlacklist.has(fid)) {
                let section = "General";
                let displayName = fid;

                if (fid.includes('.')) {
                    section = fid.split('.')[0];
                    displayName = fid.split('.')[1];
                } else if (fid.startsWith("FR_RVsOnly")) {
                    section = "Fillibuster Rhymes RVs";
                    displayName = fid.replace("FR_RVsOnly_", "");
                } else if (fid.startsWith("VRO_")) {
                    section = "Vehicle Repair Overhaul";
                    displayName = fid.replace("VRO_", "");
                } else if (fid.includes('_')) {
                    // Generic prefix detection for other mods - use everything before first underscore
                    const parts = fid.split('_');
                    if (parts[0].length >= 2) {
                        section = parts[0];
                        displayName = parts.slice(1).join('_');
                    }
                }

                const obj = this.buildFieldObj(fid, parsedVars);
                obj.name = this.labelMap[fid] || displayName;
                obj.section = section;
                modsFields.push(obj);
            }
        });

        if (modsFields.length > 0) {
            categoriesData.push({ id: "SandboxMods", name: "Mods (Options)", fields: modsFields });
        }

        return { categories: categoriesData, raw: parsedVars };
    }

    buildFieldObj(fid, parsedVars) {
        const options = getOptionsForField(fid);
        return {
            id: fid,
            name: this.labelMap[fid] || fid,
            value: parsedVars[fid].value,
            tooltip: this.tooltipOverrides[fid] || parsedVars[fid].tooltip,
            ...(options && options.length > 0 ? { options } : {})
        };
    }

    getCategoryName(catId) {
        if (catId === "ServerLoot" || catId === "SandboxLoot") return "Loot";
        if (catId === "ServerVehicles" || catId === "SandboxVehicles") return "Vehicles";
        if (catId === "SandboxMods" || catId === "Mods") return "Mods (Options)";
        return catId;
    }

    saveSandboxVars(luaPath, newVars) {
        if (!fs.existsSync(luaPath)) return { error: "File not found" };
        let content = fs.readFileSync(luaPath, 'utf8');

        for (const [key, value] of Object.entries(newVars)) {
            if (key.includes('.')) {
                const [table, field] = key.split('.');
                const tableRegex = new RegExp(`^\\s*${table}\\s*=\\s*{[^}]*}`, 'm');
                const tableMatch = content.match(tableRegex);
                if (tableMatch) {
                    let tableContent = tableMatch[0];
                    const fieldRegex = new RegExp(`^(\\s*)${field}\\s*=\\s*.*?,`, 'm');
                    const fieldVal = this.formatLuaValue(key, value);
                    tableContent = tableContent.replace(fieldRegex, `$1${field} = ${fieldVal},`);
                    content = content.replace(tableRegex, tableContent);
                }
            } else {
                const fieldRegex = new RegExp(`^(\\s*)${key}\\s*=\\s*.*?,`, 'm');
                const fieldVal = this.formatLuaValue(key, value);
                content = content.replace(fieldRegex, `$1${key} = ${fieldVal},`);
            }
        }

        fs.writeFileSync(luaPath, content, 'utf8');
        return { success: true };
    }

    formatLuaValue(key, value) {
        if (typeof value === 'boolean') return value ? "true" : "false";
        
        // Attempt to treat string-numbers as numbers for Lua
        const num = typeof value === 'string' ? parseFloat(value) : value;
        
        if (typeof num === 'number' && !isNaN(num)) {
            // It's a number, return without quotes. 
            // We use toString() to preserve exact precision (1.05, 0.001, etc)
            return num.toString();
        }

        if (typeof value === 'string') return `"${value}"`;
        return value;
    }

    isFloat(key) {
        if (this.knownFloatKeys.has(key) || this.forcedFloats.has(key)) return true;
        if (key.includes("Multiplier") || key.includes("Factor")) return true;
        if (key.startsWith("MultiplierConfig.") && !key.endsWith("GlobalToggle")) return true;
        return false;
    }

    readIniVars(iniPath) {
        if (!fs.existsSync(iniPath)) return { error: "File not found" };
        const content = fs.readFileSync(iniPath, 'utf8').split('\n');
        const vars = {};
        const discoveredDefaults = {};
        let lastDefault = null;
        
        const kvRegex = /^\s*([\w.-]+)\s*=\s*(.*)/;
        content.forEach(line => {
            const stripped = line.trim();
            if (stripped.startsWith("#")) {
                const defMatch = stripped.match(/Default:\s*([^\s#]+)/i);
                if (defMatch) lastDefault = defMatch[1];
                return;
            }
            const match = line.match(kvRegex);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim();
                vars[key] = value;
                if (lastDefault !== null) {
                    const cleanDef = lastDefault.toLowerCase();
                    if (cleanDef === "true") discoveredDefaults[key] = true;
                    else if (cleanDef === "false") discoveredDefaults[key] = false;
                    else discoveredDefaults[key] = lastDefault;
                    lastDefault = null;
                }
            } else if (stripped) {
                lastDefault = null;
            }
        });

        const categoriesData = [];
        for (const [catId, fields] of Object.entries(this.iniStructure)) {
            const catFields = fields.map(fDef => {
                const rawVal = vars[fDef.id] !== undefined ? vars[fDef.id] : null;
                let typedVal = rawVal;
                if (rawVal === null) {
                    typedVal = fDef.type === "boolean" ? false : 0;
                } else if (fDef.type === "boolean") {
                    typedVal = rawVal.toLowerCase() === "true";
                } else if (fDef.type === "number") {
                    const num = parseFloat(rawVal);
                    typedVal = isNaN(num) ? 0 : num;
                }
                return {
                    ...fDef,
                    value: typedVal,
                    defaultValue: discoveredDefaults[fDef.id] || null
                };
            });
            categoriesData.push({ id: catId, name: catId, fields: catFields });
            if (catId === "Backups") {
                categoriesData.push({ id: 'Mods', name: 'Mods', fields: [] });
                categoriesData.push({ id: 'Map', name: 'Map', fields: [] });
            }
        }
        return { categories: categoriesData, raw: vars };
    }

    buildMapList(iniVars) {
        const mapLine = iniVars['Map'] || 'Muldraugh, KY';
        return mapLine.split(';').filter(Boolean);
    }

    buildWorkshopPlaylist(iniVars, scannedMods) {
        const wsLine = iniVars['WorkshopItems'] || '';
        const modLine = iniVars['Mods'] || '';
        const wsIds = wsLine.split(';').filter(Boolean);
        const modIds = modLine.split(';').filter(Boolean);
        
        return wsIds.map((wsId, idx) => {
            const matchingMod = scannedMods.find(m => m.workshop_id === wsId);
            return {
                workshopId: wsId,
                modId: modIds[idx] || '',
                name: matchingMod ? matchingMod.name : `Workshop Item ${wsId}`,
                thumbnail: matchingMod ? matchingMod.thumbnail : null
            };
        });
    }

    saveIniVars(iniPath, newVars) {
        if (!fs.existsSync(iniPath)) return { error: "File not found" };
        let content = fs.readFileSync(iniPath, 'utf8');
        for (const [key, value] of Object.entries(newVars)) {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (content.match(regex)) {
                content = content.replace(regex, `${key}=${value}`);
            } else {
                content += `\n${key}=${value}`;
            }
        }
        fs.writeFileSync(iniPath, content, 'utf8');
        return { success: true };
    }

    // --- PRESET IMPORT & BACKUP LOGIC ---

    importIniPreset(sourcePath, targetPath, mode) {
        try {
            if (!fs.existsSync(sourcePath)) return { error: "Source file not found" };
            if (!fs.existsSync(targetPath)) return { error: "Target file not found" };

            if (mode === 'full') {
                fs.copyFileSync(sourcePath, targetPath);
                return { success: true };
            }

            // SOFT MODE: Only sync mods, workshop items and map
            const sourceContent = fs.readFileSync(sourcePath, 'utf8');
            let targetContent = fs.readFileSync(targetPath, 'utf8');
            
            const fieldsToSync = ['Mods', 'WorkshopItems', 'Map'];
            fieldsToSync.forEach(field => {
                const regex = new RegExp(`^${field}=(.*)$`, 'm');
                const match = sourceContent.match(regex);
                if (match) {
                    const newVal = match[1].trim();
                    if (targetContent.match(regex)) {
                        targetContent = targetContent.replace(regex, `${field}=${newVal}`);
                    } else {
                        targetContent += `\n${field}=${newVal}`;
                    }
                }
            });

            fs.writeFileSync(targetPath, targetContent, 'utf8');
            return { success: true };
        } catch (e) {
            return { error: e.message };
        }
    }

    importSandboxPreset(sourcePath, targetPath) {
        try {
            if (!fs.existsSync(sourcePath)) return { error: "Source file not found" };
            if (!fs.existsSync(targetPath)) return { error: "Target file not found" };

            fs.copyFileSync(sourcePath, targetPath);
            return { success: true };
        } catch (e) {
            return { error: e.message };
        }
    }

    async createMultiBackup(sourceDirs, zipPath) {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);

        try {
            // Join multiple paths with quotes and commas
            const paths = sourceDirs.map(d => `'${d}'`).join(',');
            const cmd = `powershell -Command "Compress-Archive -Path ${paths} -DestinationPath '${zipPath}' -Force"`;
            await execPromise(cmd);
            return { success: true };
        } catch (e) {
            console.error('Multi-backup failed:', e);
            return { error: `PowerShell Backup failed: ${e.message}` };
        }
    }
}

module.exports = new ConfigService();
