const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class WorkshopService {
  constructor() {
    this.scannedMods = [];
    this.sortingRules = {};
    this.masterOrder = [];
    this.CATEGORY_TIERS = {
      "preorder": 0,
      "coreRequirement": 1,
      "tweaks": 2,
      "resource": 3,
      "map": 4,
      "vehicle": 5,
      "code": 6,
      "clothes": 7,
      "ui": 8,
      "other": 9,
      "translation": 10,
      "undefined": 11
    };
    this.PREORDER_MODS = {
      "modloadordersorter_b42": 0,
      "modloadordersorter": 0,
      "modmanager": 1,
      "modmanagerserver": 2,
      "modoptions": 3
    };
    this.CRITICAL_DIRS = ['lua', 'scripts', 'maps', 'clothing', 'animsets', 'ui'];
    this.ignoredFingerprints = [];
  }

  setIgnoredFingerprints(fingerprints) {
    this.ignoredFingerprints = fingerprints || [];
  }

  setMasterOrder(order) {
    this.masterOrder = order;
  }

  loadSortingRules(appDataPath) {
    const rulesPath = path.join(appDataPath, 'HellDrinxModManager', 'sorting_rules.txt');
    if (!fs.existsSync(rulesPath)) return;

    try {
      const content = fs.readFileSync(rulesPath, 'utf8');
      const sections = content.split(/^\[(.*)\]/m);

      for (let i = 1; i < sections.length; i += 2) {
        const modId = sections[i].trim();
        const body = sections[i + 1];
        const rules = {};

        const lines = body.split('\n');
        lines.forEach(line => {
          const [key, val] = line.split('=');
          if (key && val) {
            const k = key.trim();
            const v = val.trim();
            if (k === 'loadAfter' || k === 'loadBefore') {
              rules[k] = v.split(',').map(s => s.trim()).filter(Boolean);
            } else {
              rules[k] = v;
            }
          }
        });
        this.sortingRules[modId.toLowerCase()] = rules;
      }
    } catch (e) {
      console.error('[WorkshopService] Error parsing sorting rules:', e);
    }
  }

  normalizeId(id) {
    if (!id) return "";
    return id.replace(/[^a-zA-Z0-9._-]/g, '').trim().toLowerCase();
  }

  getAllFiles(dirPath, baseDir, arrayOfFiles = [], onlyCritical = false) {
    if (!fs.existsSync(dirPath)) return arrayOfFiles;
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
      const fullPath = path.join(dirPath, file);
      const isDir = fs.statSync(fullPath).isDirectory();
      const nameLower = file.toLowerCase();

      if (isDir) {
        if (nameLower !== 'translate' && nameLower !== 'translations') {
          // If at media root and onlyCritical is true, only enter critical subdirs
          if (onlyCritical && path.relative(baseDir, dirPath) === '') {
            if (this.CRITICAL_DIRS.includes(nameLower)) {
              this.getAllFiles(fullPath, baseDir, arrayOfFiles, onlyCritical);
            }
          } else {
            this.getAllFiles(fullPath, baseDir, arrayOfFiles, onlyCritical);
          }
        }
      } else {
        arrayOfFiles.push(path.relative(baseDir, fullPath).replace(/\\/g, '/').toLowerCase());
      }
    });

    return arrayOfFiles;
  }

  sortModIds(modIds) {
    const nodes = Array.from(new Set(modIds));
    const adj = new Map();
    const inDegree = new Map();

    nodes.forEach(n => {
      adj.set(n, []);
      inDegree.set(n, 0);
    });

    const addEdge = (from, to) => {
      if (nodes.includes(from) && nodes.includes(to)) {
        if (!adj.get(from).includes(to)) {
          adj.get(from).push(to);
          inDegree.set(to, (inDegree.get(to) || 0) + 1);
        }
      }
    };

    for (const mid of nodes) {
      const normMid = this.normalizeId(mid);
      const info = this.scannedMods.find(m => this.normalizeId(m.id) === normMid);

      if (info && info.require) {
        info.require.forEach(reqId => {
          const normReq = this.normalizeId(reqId);
          const targetId = nodes.find(n => this.normalizeId(n) === normReq);
          if (targetId) addEdge(targetId, mid);
        });
      }

      const rules = this.sortingRules[normMid];
      if (rules) {
        if (rules.loadAfter) {
          rules.loadAfter.forEach(afterId => {
            const normAfter = this.normalizeId(afterId);
            const targetId = nodes.find(n => this.normalizeId(n) === normAfter);
            if (targetId) addEdge(targetId, mid);
          });
        }
        if (rules.loadBefore) {
          rules.loadBefore.forEach(beforeId => {
            const normBefore = this.normalizeId(beforeId);
            const targetId = nodes.find(n => this.normalizeId(n) === normBefore);
            if (targetId) addEdge(mid, targetId);
          });
        }
      }
    }

    const masterPriority = new Map(this.masterOrder.map((id, index) => [id.toLowerCase(), index]));
    const getCatTier = (mid) => {
      const normMid = this.normalizeId(mid);
      const mod = this.scannedMods.find(m => this.normalizeId(m.id) === normMid);
      const ruleCat = this.sortingRules[normMid]?.category;
      return this.CATEGORY_TIERS[ruleCat || mod?.category || 'undefined'];
    };

    const queue = nodes.filter(n => inDegree.get(n) === 0);
    const result = [];

    while (queue.length > 0) {
      queue.sort((a, b) => {
        const normA = this.normalizeId(a);
        const normB = this.normalizeId(b);

        const preA = this.PREORDER_MODS[normA] ?? 99;
        const preB = this.PREORDER_MODS[normB] ?? 99;
        if (preA !== preB) return preA - preB;

        const tierA = getCatTier(a);
        const tierB = getCatTier(b);
        if (tierA !== tierB) return tierA - tierB;

        const mastA = masterPriority.get(normA) ?? 999999;
        const mastB = masterPriority.get(normB) ?? 999999;
        if (mastA !== mastB) return mastA - mastB;

        return a.localeCompare(b);
      });

      const u = queue.shift();
      result.push(u);

      adj.get(u).forEach(v => {
        inDegree.set(v, inDegree.get(v) - 1);
        if (inDegree.get(v) === 0) queue.push(v);
      });
    }

    const leftover = nodes.filter(n => !result.includes(n));
    return [...result, ...leftover];
  }

  async scanWorkshop(workshopPath, cachePath) {
    try {
      if (!fs.existsSync(workshopPath)) return { error: 'Path not found' };

      const bestVersions = new Map();
      const cacheMap = new Map();
      if (fs.existsSync(cachePath)) {
        try {
          const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
          cached.forEach(m => cacheMap.set(m.id, m));
        } catch (e) { }
      }

      const getScore = (infoPath) => {
        const parentName = path.basename(path.dirname(infoPath)).toLowerCase();
        if (parentName === '42' || parentName.startsWith('42.')) return 100;
        if (parentName === 'common') return 50;
        const verMatch = parentName.match(/(\d+\.?\d*)/);
        if (verMatch) return parseFloat(verMatch[1]);
        return 1;
      };

      const processModBranch = (wsId, modRootPath) => {
        const foundInBranch = [];
        const findRecursive = (currentPath, depth = 0) => {
          if (!fs.existsSync(currentPath) || depth > 4) return;
          let files;
          try {
            files = fs.readdirSync(currentPath, { withFileTypes: true });
          } catch (e) { return; }

          if (files.some(f => f.isFile() && f.name.toLowerCase() === 'mod.info')) {
            foundInBranch.push(path.join(currentPath, 'mod.info'));
          }
          for (const dirent of files) {
            if (dirent.isDirectory()) {
              const dName = dirent.name.toLowerCase();
              if (dName === 'media' || dName === 'translations') continue;
              findRecursive(path.join(currentPath, dirent.name), depth + 1);
            }
          }
        };

        findRecursive(modRootPath, 0);
        if (foundInBranch.length === 0) return;

        let bestInfo = null;
        let bestScore = -1;
        for (const infoPath of foundInBranch) {
          const score = getScore(infoPath);
          if (score > bestScore) {
            bestScore = score;
            bestInfo = infoPath;
          }
        }

        if (bestInfo) {
          try {
            const content = fs.readFileSync(bestInfo, 'utf8');
            const idMatch = content.match(/^id=(.*)/im);
            const nameMatch = content.match(/^name=(.*)/im);

            if (idMatch && nameMatch) {
              const rawId = idMatch[1].trim();
              const normId = this.normalizeId(rawId);
              const modName = nameMatch[1].trim();
              const basePath = path.dirname(bestInfo);

              if (!bestVersions.has(normId) || bestScore > bestVersions.get(normId).score) {
                const posterLine = content.match(/^poster=(.*)/im)?.[1]?.trim();
                let posterUrl = null;
                if (posterLine) {
                  const pAbs = path.join(basePath, posterLine);
                  if (fs.existsSync(pAbs)) {
                    posterUrl = `local-image://${pAbs.replace(/\\/g, '/')}`;
                  }
                }

                if (!posterUrl) {
                  for (const f of ['poster.png', 'preview.png', 'icon.png']) {
                    const fAbs = path.join(basePath, f);
                    if (fs.existsSync(fAbs)) {
                      posterUrl = `local-image://${fAbs.replace(/\\/g, '/')}`;
                      break;
                    }
                  }
                }

                const requireLine = content.match(/^require=(.*)/im)?.[1]?.trim();
                const requirements = requireLine ? requireLine.split(',').map(s => s.trim()).filter(Boolean) : [];

                const maps = [];
                const mediaMapsPath = path.join(basePath, 'media', 'maps');
                if (fs.existsSync(mediaMapsPath)) {
                  try {
                    const mapFolders = fs.readdirSync(mediaMapsPath).filter(f => fs.statSync(path.join(mediaMapsPath, f)).isDirectory());
                    maps.push(...mapFolders);
                  } catch (e) { }
                }

                let category = 'other';
                const nameLower = modName.toLowerCase();
                const idLower = normId.toLowerCase();
                const hasFile = (sub) => fs.existsSync(path.join(basePath, ...sub.split('/')));

                if (maps.length > 0) category = 'map';
                else if (hasFile('media/models_X/vehicles') || hasFile('media/models/vehicles')) category = 'vehicle';
                else if (nameLower.includes('api') || nameLower.includes('framework') || idLower.includes('api') || idLower.includes('lib')) category = 'tweaks';
                else if (hasFile('media/ui') || hasFile('media/textures/ui')) category = 'ui';
                else if (hasFile('media/lua/shared/Translate')) category = 'translation';
                else if (hasFile('media/lua/client') || hasFile('media/lua/server')) category = 'code';

                let mediaFiles = [];
                const cachedMod = cacheMap.get(rawId);
                if (cachedMod && cachedMod.absolute_path === basePath && cachedMod.media_files) {
                  mediaFiles = cachedMod.media_files;
                } else {
                  const mediaPath = path.join(basePath, 'media');
                  if (fs.existsSync(mediaPath)) {
                    // Only collect files from critical directories to match legacy behavior
                    this.getAllFiles(mediaPath, mediaPath, mediaFiles, true);
                  }
                }

                const incompatibleLine = content.match(/^incompatible=(.*)/im)?.[1]?.trim();
                const incompatibilities = incompatibleLine ? incompatibleLine.split(',').map(s => s.trim()).filter(Boolean) : [];

                bestVersions.set(normId, {
                  id: rawId,
                  displayId: rawId,
                  name: modName,
                  workshop_id: wsId,
                  poster_url: posterUrl,
                  require: requirements,
                  incompatible: incompatibilities,
                  media_files: mediaFiles,
                  score: bestScore,
                  absolute_path: basePath,
                  maps: maps,
                  category: category
                });
              }
            }
          } catch (e) { }
        }
      };

      const workshopFolders = fs.readdirSync(workshopPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      for (const wsId of workshopFolders) {
        const wsPath = path.join(workshopPath, wsId);
        const modsDir = path.join(wsPath, 'mods');
        if (fs.existsSync(modsDir)) {
          const subFolders = fs.readdirSync(modsDir).filter(f => fs.statSync(path.join(modsDir, f)).isDirectory());
          for (const sub of subFolders) processModBranch(wsId, path.join(modsDir, sub));
        } else {
          processModBranch(wsId, wsPath);
        }
      }

      const nameDedupMap = new Map();
      for (const mod of bestVersions.values()) {
        const key = `${mod.workshop_id}|${mod.name.toLowerCase().trim()}`;
        if (!nameDedupMap.has(key) || mod.score > nameDedupMap.get(key).score) {
          nameDedupMap.set(key, mod);
        }
      }

      const finalResult = Array.from(nameDedupMap.values());
      this.scannedMods = finalResult;

      try {
        fs.writeFileSync(cachePath, JSON.stringify(finalResult), 'utf8');
      } catch (e) {
        console.error('[WorkshopService] Cache save failed:', e);
      }

      return finalResult;
    } catch (err) {
      console.error('[WorkshopService] Scan error:', err);
      return { error: err.message };
    }
  }

  getAllConflicts(activeModIds) {
    const issues = [];
    const fileToMods = new Map();
    const normalizedActiveIds = activeModIds.map(id => this.normalizeId(id));
    const activeIdSet = new Set(normalizedActiveIds);
    const activeMods = this.scannedMods.filter(m => activeIdSet.has(this.normalizeId(m.id)));

    for (const mod of activeMods) {
      if (mod.require) {
        mod.require.forEach(req => {
          const reqNormId = this.normalizeId(req);
          if (!activeIdSet.has(reqNormId)) {
            const actualMod = this.scannedMods.find(m => this.normalizeId(m.id) === reqNormId);
            issues.push({
              modId: mod.id, modName: mod.name, type: 'missing',
              targetModId: actualMod ? actualMod.id : req,
              detail: `Missing: ${req}`
            });
          }
        });
      }

      if (mod.incompatible) {
        mod.incompatible.forEach(inc => {
          if (activeIdSet.has(this.normalizeId(inc))) {
            issues.push({
              modId: mod.id, modName: mod.name, type: 'conflict', subType: 'rule',
              detail: `Incompatible with: ${inc}`
            });
          }
        });
      }

      if (mod.media_files) {
        mod.media_files.forEach(filePath => {
          // Skip engine-level files that are merged organically by Project Zomboid 
          // and common texture files that are harmless overwrites
          const ignoredFiles = ['sandbox-options.txt', 'fileguidtable.xml', 'mf_ismoodle.lua', 'hat_gasmask_nofilter.xml', 'hat_gasmask.xml', 'kp_extrabodylocations.lua', 'registries.lua', 'sounds_tmrremovemumble.txt', 'null.wav'];
          const ignoredExtensions = ['.png', '.jpg', '.jpeg', '.tga', '.dds', '.fbx', '.x'];
          
          const fileName = path.basename(filePath).toLowerCase();
          const fileExt = path.extname(filePath).toLowerCase();

          if (ignoredFiles.includes(fileName) || ignoredExtensions.includes(fileExt)) return;

          if (!fileToMods.has(filePath)) fileToMods.set(filePath, []);
          fileToMods.get(filePath).push(mod.id);
        });
      }
    }

    const collisionFingerprints = new Map(); // modId::otherId::files -> hash

    for (const [filePath, modsUsing] of fileToMods.entries()) {
      if (modsUsing.length > 1) {
        modsUsing.forEach(mid => {
          const mod = activeMods.find(m => m.id === mid);
          const others = modsUsing.filter(o => o !== mid);

          // Legacy-style grouping: Create a unique fingerprint for this specific set of mod collisions
          others.forEach(otherId => {
            const pairKey = [mid, otherId].sort().join('::');
            if (!collisionFingerprints.has(pairKey)) collisionFingerprints.set(pairKey, new Set());
            collisionFingerprints.get(pairKey).add(filePath);
          });

          issues.push({
            modId: mid, modName: mod ? mod.name : mid, type: 'conflict', subType: 'file',
            detail: `File Conflict: ${path.basename(filePath)} with ${others.join(', ')}`,
            file: filePath, conflictingWith: others
          });
        });
      }
    }

    const active = [];
    const ignored = [];

    // Filter issues by fingerprint whitelist
    issues.forEach(issue => {
      // rule-based incompatibilities don't have fingerprints for now (they are always active)
      if (issue.type === 'missing' || issue.subType === 'rule') {
        active.push(issue);
        return;
      }

      if (!issue.conflictingWith) {
        active.push(issue);
        return;
      }

      const otherId = issue.conflictingWith[0];
      const overlap = Array.from(fileToMods.entries())
        .filter(([_, mods]) => mods.includes(issue.modId) && mods.includes(otherId))
        .map(([fp, _]) => fp);

      const fingerprint = this._getConflictFingerprint(issue.modId, otherId, overlap);
      issue.fingerprint = fingerprint; // Attach for UI

      if (this.ignoredFingerprints.includes(fingerprint)) {
        ignored.push(issue);
      } else {
        active.push(issue);
      }
    });

    return { active, ignored };
  }

  _getConflictFingerprint(modId, otherId, files) {
    const sortedFiles = [...files].sort().join(';');
    const sortedMods = [modId, otherId].sort().join('::');
    const data = `${sortedMods}::${sortedFiles}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async diagnoseConflict(fingerprint, activeModIds, filePath = null) {
    try {
      const { active, ignored } = this.getAllConflicts(activeModIds);
    
    // Find by fingerprint AND file path for precision, fallback to first fingerprint match
    const targetIssue = (active.find(i => i.fingerprint === fingerprint && (!filePath || i.file === filePath)) || 
                        ignored.find(i => i.fingerprint === fingerprint && (!filePath || i.file === filePath))) ||
                        (active.find(i => i.fingerprint === fingerprint) || 
                        ignored.find(i => i.fingerprint === fingerprint));

    if (!targetIssue) return { error: 'Conflict not found or no longer active' };

    const report = {
      issue: targetIssue,
      mods: [],
      snippets: {},
      aiContext: ""
    };

    const modIdsToCheck = [targetIssue.modId, ...(targetIssue.conflictingWith || [])];

    for (const mid of modIdsToCheck) {
      const mod = this.scannedMods.find(m => m.id === mid);
      if (!mod) continue;

      report.mods.push({
        id: mod.id,
        name: mod.name,
        path: mod.absolute_path,
        workshopId: mod.workshop_id
      });

      if (targetIssue.subType === 'file' && targetIssue.file) {
        const ext = path.extname(targetIssue.file).toLowerCase();
        const binaryExts = ['.wav', '.ogg', '.bank', '.mp3', '.png', '.jpg', '.jpeg', '.tga', '.dds', '.fbx', '.x'];
        
        if (binaryExts.includes(ext)) {
          report.snippets[mid] = `[Binary file: ${ext} - Snippets not available for audio/media assets]`;
        } else {
          const fullPath = path.join(mod.absolute_path, 'media', targetIssue.file);
          if (fs.existsSync(fullPath)) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              // For file conflicts, show the first 50 lines as context
              report.snippets[mid] = content.split('\n').slice(0, 50).join('\n');
            } catch (e) {
              report.snippets[mid] = `[Error reading file: ${e.message}]`;
            }
          }
        }
      }
      // Logic conflicts (future) would be handled here
    }

    // Generate AI Context
    let context = `# Mod Conflict Diagnosis\n`;
    context += `**Type**: ${targetIssue.subType === 'file' ? 'File Overwrite' : 'Logic Conflict'}\n`;
    context += `**Detail**: ${targetIssue.detail}\n\n`;
    context += `## Involved Mods\n`;
    report.mods.forEach(m => {
      context += `- **${m.name}** (${m.id}) -> \`${m.path}\`\n`;
    });
    context += `\n## Code Snippets\n`;
    for (const mid of modIdsToCheck) {
      const mod = report.mods.find(m => m.id === mid);
      const snippet = report.snippets[mid];
      if (snippet && mod) {
        const ext = targetIssue.file ? path.extname(targetIssue.file).substring(1) : 'text';
        context += `### Mod: ${mod.name}\n\`\`\`${ext}\n${snippet}\n\`\`\`\n\n`;
      }
    }
    context += `\n## Request for AI\n`;
    context += `The mods above are conflicting. Mod B (the one later in the list) will overwrite the behavior of Mod A. Please analyze if these conflicts are critical and suggest a fix or a way to merge them if possible.`;

    report.aiContext = context;
    return report;
    } catch (e) {
      console.error('Diagnosis Error:', e);
      return { error: e.message };
    }
  }
}

module.exports = new WorkshopService();
