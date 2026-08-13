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
      "weapons": 6,
      "code": 7,
      "clothes": 8,
      "items": 9,
      "sound": 10,
      "animations": 11,
      "tiles": 12,
      "traits": 13,
      "npc": 14,
      "ui": 15,
      "other": 16,
      "translation": 17,
      "undefined": 18
    };
    this.PREORDER_MODS = {
      "modloadordersorter_b42": 0,
      "modloadordersorter": 0,
      "modmanager": 1,
      "modmanagerserver": 2,
      "modoptions": 3
    };
    this.CRITICAL_DIRS = ['lua', 'scripts', 'maps', 'clothing', 'animsets', 'ui', 'tiledefinitions', 'sound'];
    this.ignoredFingerprints = [];
    this.SCANNER_VERSION = 7;
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
              // Once we enter a critical folder, we scan EVERYTHING inside it (onlyCritical = false)
              this.getAllFiles(fullPath, baseDir, arrayOfFiles, false);
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

      if (info) {
        if (info.require) {
          info.require.forEach(reqId => {
            const normReq = this.normalizeId(reqId);
            const targetId = nodes.find(n => this.normalizeId(n) === normReq);
            if (targetId) addEdge(targetId, mid);
          });
        }
        if (info.loadAfter) {
          info.loadAfter.forEach(afterId => {
            const normAfter = this.normalizeId(afterId);
            const targetId = nodes.find(n => this.normalizeId(n) === normAfter);
            if (targetId) addEdge(targetId, mid);
          });
        }
        if (info.loadBefore) {
          info.loadBefore.forEach(beforeId => {
            const normBefore = this.normalizeId(beforeId);
            const targetId = nodes.find(n => this.normalizeId(n) === normBefore);
            if (targetId) addEdge(mid, targetId);
          });
        }
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
      let cachedVersion = 0;

      if (fs.existsSync(cachePath)) {
        try {
          const cachedData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
          
          // Handle both old array format and new versioned object format
          const cachedMods = Array.isArray(cachedData) ? cachedData : (cachedData.mods || []);
          cachedVersion = Array.isArray(cachedData) ? 1 : (cachedData.version || 1);

          cachedMods.forEach(m => cacheMap.set(m.id, m));
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

                const authorsLine = content.match(/^authors?=(.*)/im)?.[1]?.trim();
                const authors = authorsLine ? authorsLine.split(',').map(s => s.trim()).filter(Boolean) : [];

                const descriptionLine = content.match(/^description=(.*)/im)?.[1]?.trim();
                const description = descriptionLine || null;

                const pzVersion = content.match(/^(?:pzversion|modversion|version)=(.*)/im)?.[1]?.trim() || null;
                const url = content.match(/^(?:url|link)=(.*)/im)?.[1]?.trim() || null;

                const loadAfterLine = content.match(/^load(?:after)?=(.*)/im)?.[1]?.trim();
                const loadAfter = loadAfterLine ? loadAfterLine.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];

                const loadBeforeLine = content.match(/^load(?:before)?=(.*)/im)?.[1]?.trim();
                const loadBefore = loadBeforeLine ? loadBeforeLine.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];

                const categoryLine = content.match(/^category=(.*)/im)?.[1]?.trim() || '';
                const tagsLine = content.match(/^tags?=(.*)/im)?.[1]?.trim() || '';
                const rawCategoryTokens = `${categoryLine},${tagsLine}`
                  .split(/[,;]/)
                  .map(s => s.trim().toLowerCase())
                  .filter(Boolean);

                const categoriesSet = new Set();

                const mapTokenToCategory = (token) => {
                  if (token.includes('vehicle') || token.includes('car') || token.includes('truck') || token.includes('auto') || token.includes('rv')) return 'vehicle';
                  if (token.includes('map') || token.includes('location') || token.includes('city') || token.includes('town')) return 'map';
                  if (token.includes('weapon') || token.includes('gun') || token.includes('firearm') || token.includes('ammo')) return 'weapons';
                  if (token.includes('clothing') || token.includes('cloth') || token.includes('armor') || token.includes('gear')) return 'clothes';
                  if (token.includes('item') || token.includes('recipe') || token.includes('craft') || token.includes('food')) return 'items';
                  if (token.includes('sound') || token.includes('music') || token.includes('audio') || token.includes('radio')) return 'sound';
                  if (token.includes('anim')) return 'animations';
                  if (token.includes('tile')) return 'tiles';
                  if (token.includes('trait') || token.includes('perk') || token.includes('profession')) return 'traits';
                  if (token.includes('npc') || token.includes('survivor')) return 'npc';
                  if (token.includes('tweak') || token.includes('framework') || token.includes('api') || token.includes('lib')) return 'tweaks';
                  if (token.includes('ui') || token.includes('interface')) return 'ui';
                  if (token.includes('translation') || token.includes('language') || token.includes('traducao') || token.includes('tradução')) return 'translation';
                  return null;
                };

                for (const token of rawCategoryTokens) {
                  const cat = mapTokenToCategory(token);
                  if (cat) categoriesSet.add(cat);
                }

                const maps = [];
                const searchForMaps = (startDir, depth = 0) => {
                  if (!fs.existsSync(startDir) || depth > 5) return;
                  try {
                    const entries = fs.readdirSync(startDir, { withFileTypes: true });
                    for (const ent of entries) {
                      if (ent.isDirectory()) {
                        const full = path.join(startDir, ent.name);
                        const nameLower = ent.name.toLowerCase();

                        if (nameLower === 'maps' && path.basename(path.dirname(full)).toLowerCase() === 'media') {
                          try {
                            const subFolders = fs.readdirSync(full, { withFileTypes: true })
                              .filter(d => d.isDirectory())
                              .map(d => d.name);
                            subFolders.forEach(sf => {
                              if (!maps.includes(sf)) maps.push(sf);
                            });
                          } catch (e) { }
                        } else {
                          searchForMaps(full, depth + 1);
                        }
                      }
                    }
                  } catch (e) { }
                };

                searchForMaps(basePath, 0);
                if (modRootPath && modRootPath !== basePath) {
                  searchForMaps(modRootPath, 0);
                }

                const hasFile = (sub) => fs.existsSync(path.join(basePath, ...sub.split('/')));

                // Fallback to physical folder structure if mod.info has no category/tags
                if (categoriesSet.size === 0) {
                  if (maps.length > 0) categoriesSet.add('map');
                  if (
                    hasFile('media/models_X/vehicles') || 
                    hasFile('media/models/vehicles') || 
                    hasFile('media/scripts/vehicles') || 
                    hasFile('media/lua/shared/Vehicles') || 
                    hasFile('media/textures/vehicles')
                  ) categoriesSet.add('vehicle');

                  if (
                    hasFile('media/models/weapons') || 
                    hasFile('media/models_X/weapons') || 
                    hasFile('media/scripts/weapons')
                  ) categoriesSet.add('weapons');

                  if (
                    hasFile('media/clothing') || 
                    hasFile('media/textures/clothing') || 
                    hasFile('clothing')
                  ) categoriesSet.add('clothes');

                  if (
                    hasFile('media/scripts/items') || 
                    hasFile('media/scripts/recipes')
                  ) categoriesSet.add('items');

                  if (
                    hasFile('media/sound') || 
                    hasFile('media/audio') || 
                    hasFile('media/lua/shared/Radio-Data')
                  ) categoriesSet.add('sound');

                  if (
                    hasFile('media/animsets') || 
                    hasFile('media/anims') || 
                    hasFile('animsets')
                  ) categoriesSet.add('animations');

                  if (
                    hasFile('media/tiledefinitions') || 
                    hasFile('media/textures/tile')
                  ) categoriesSet.add('tiles');

                  if (hasFile('media/lua/shared/NPCs/MainCreationMethods.lua')) categoriesSet.add('traits');
                  if (hasFile('media/lua/shared/NPCs')) categoriesSet.add('npc');
                  if (hasFile('media/ui') || hasFile('media/textures/ui')) categoriesSet.add('ui');
                  if (hasFile('media/lua/client') || hasFile('media/lua/server')) categoriesSet.add('code');
                  if (categoriesSet.size === 0 && hasFile('media/lua/shared/Translate')) categoriesSet.add('translation');
                }

                const detectedCategories = Array.from(categoriesSet);
                const primaryCategory = detectedCategories[0] || 'other';

                let mediaFiles = [];
                const cachedMod = cacheMap.get(rawId);
                
                // Only reuse media_files if the scanner version hasn't changed
                const canReuseMedia = cachedVersion === this.SCANNER_VERSION;

                if (cachedMod && cachedMod.absolute_path === basePath && cachedMod.media_files && canReuseMedia) {
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
                  authors: authors,
                  description: description,
                  pzversion: pzVersion,
                  url: url,
                  loadAfter: loadAfter,
                  loadBefore: loadBefore,
                  media_files: mediaFiles,
                  score: bestScore,
                  absolute_path: basePath,
                  maps: maps,
                  category: primaryCategory,
                  categories: detectedCategories.length > 0 ? detectedCategories : ['other']
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
        const cacheData = {
          version: this.SCANNER_VERSION,
          mods: finalResult
        };
        fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');
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
    const normalizedActiveIds = activeModIds.map(id => this.normalizeId(id));
    const activeIdSet = new Set(normalizedActiveIds);
    const activeMods = this.scannedMods.filter(m => activeIdSet.has(this.normalizeId(m.id)));

    // Map of normalized ID -> Mod object for fast lookup
    const activeModMap = new Map();
    activeMods.forEach(m => activeModMap.set(this.normalizeId(m.id), m));

    // Track added incompatibility pairs to prevent duplicates: "normIdA::normIdB"
    const addedIncompatPairs = new Set();

    for (const mod of activeMods) {
      const normModId = this.normalizeId(mod.id);

      // 1. Missing required dependencies
      if (mod.require && Array.isArray(mod.require)) {
        mod.require.forEach(req => {
          const reqNormId = this.normalizeId(req);
          if (!activeIdSet.has(reqNormId)) {
            const actualMod = this.scannedMods.find(m => this.normalizeId(m.id) === reqNormId);
            issues.push({
              modId: mod.id,
              modName: mod.name,
              type: 'missing',
              targetModId: actualMod ? actualMod.id : req,
              detail: `Missing requirement: ${actualMod ? actualMod.name : req}`
            });
          }
        });
      }

      // 2. Explicit Incompatibilities (Bi-directional)
      if (mod.incompatible && Array.isArray(mod.incompatible)) {
        mod.incompatible.forEach(inc => {
          const incNormId = this.normalizeId(inc);
          if (activeIdSet.has(incNormId)) {
            const targetMod = activeModMap.get(incNormId);
            const targetName = targetMod ? targetMod.name : inc;
            const targetRealId = targetMod ? targetMod.id : inc;

            const pairKey = [normModId, incNormId].sort().join('::');
            const fingerprint = crypto.createHash('sha256').update(`rule::${pairKey}`).digest('hex');

            // Add issue for current mod (Mod A)
            const issueKeyA = `${normModId}::${incNormId}`;
            if (!addedIncompatPairs.has(issueKeyA)) {
              addedIncompatPairs.add(issueKeyA);
              issues.push({
                modId: mod.id,
                modName: mod.name,
                type: 'conflict',
                subType: 'rule',
                detail: `Incompatible with: ${targetName}`,
                conflictingWith: [targetRealId],
                fingerprint
              });
            }

            // Bi-directional enforcement: Add issue for target mod (Mod B) as well
            const issueKeyB = `${incNormId}::${normModId}`;
            if (!addedIncompatPairs.has(issueKeyB)) {
              addedIncompatPairs.add(issueKeyB);
              issues.push({
                modId: targetRealId,
                modName: targetName,
                type: 'conflict',
                subType: 'rule',
                detail: `Incompatible with: ${mod.name}`,
                conflictingWith: [mod.id],
                fingerprint
              });
            }
          }
        });
      }
    }

    const active = [];
    const ignored = [];

    issues.forEach(issue => {
      if (issue.fingerprint && this.ignoredFingerprints.includes(issue.fingerprint)) {
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
}

module.exports = new WorkshopService();
