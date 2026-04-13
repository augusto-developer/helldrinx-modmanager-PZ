import re
import os

class IniManager:
    def __init__(self, ini_path: str):
        self.ini_path = ini_path
        
        # UI Structure definition
        self.structure = {
            "Details": [
                {"id": "DefaultPort", "name": "DefaultPort", "type": "number", "tooltip": "The port used for server connections (P2P)."},
                {"id": "PublicName", "name": "PublicName", "type": "string", "tooltip": "The name of your server as it appears in the server browser."},
                {"id": "PublicDescription", "name": "PublicDescription", "type": "textarea", "tooltip": "A detailed description of your server shown in the lobby."},
                {"id": "Public", "name": "Public", "type": "boolean", "tooltip": "If true, the server will be visible in the public server list."},
                {"id": "Password", "name": "Password", "type": "string", "tooltip": "Required password for players to join the server."},
                {"id": "PauseEmpty", "name": "PauseEmpty", "type": "boolean", "tooltip": "If true, the server time pauses when no players are online."},
                {"id": "ResetID", "name": "ResetID", "type": "number", "tooltip": "Unique ID used to force a map reset if changed."}
            ],
            "Steam": [
                {"id": "UDPPort", "name": "UDPPort", "type": "number", "tooltip": "UDP port used for Steam communication."},
                {"id": "MaxAccountsPerUser", "name": "MaxAccountsPerUser", "type": "number", "tooltip": "Maximum number of accounts a single Steam user can have on the server (0 = unlimited)."},
                {"id": "SteamScoreboard", "name": "SteamScoreboard", "type": "boolean", "tooltip": "Toggles the Steam-integrated scoreboard feature."}
            ],
            "Backups": [
                {"id": "BackupsCount", "name": "BackupsCount", "type": "number"},
                {"id": "BackupsOnStart", "name": "BackupsOnStart", "type": "boolean"},
                {"id": "BackupsOnVersionChange", "name": "BackupsOnVersionChange", "type": "boolean"},
                {"id": "BackupsPeriod", "name": "BackupsPeriod", "type": "number"}
            ],
            "Players": [
                {"id": "MaxPlayers", "name": "MaxPlayers", "type": "number", "tooltip": "Maximum number of players allowed on the server at once."},
                {"id": "Open", "name": "Open", "type": "boolean", "tooltip": "If true, the server is open to anyone. If false, only whitelisted players can join."},
                {"id": "DropOffWhiteListAfterDeath", "name": "DropOffWhiteListAfterDeath", "type": "boolean", "tooltip": "If true, players are automatically removed from the whitelist upon death."},
                {"id": "DisplayUserName", "name": "DisplayUserName", "type": "boolean", "tooltip": "Toggles whether usernames are displayed above players' heads."},
                {"id": "ShowFirstAndLastName", "name": "ShowFirstAndLastName", "type": "boolean", "tooltip": "Toggles whether player character first and last names are displayed."},
                {"id": "SpawnItems", "name": "SpawnItems", "type": "string", "tooltip": "List of items players will spawn with (e.g., Base.Axe;Base.Hammer)."},
                {"id": "PingLimit", "name": "PingLimit", "type": "number", "tooltip": "Maximum allowed ping before a player is kicked. 0 disables the limit."},
                {"id": "ServerPlayerID", "name": "ServerPlayerID", "type": "string", "tooltip": "Unique ID for the server, used for player identification across sessions."},
                {"id": "SleepAllowed", "name": "SleepAllowed", "type": "boolean", "tooltip": "If true, players are allowed to sleep in multiplayer."},
                {"id": "SleepNeeded", "name": "SleepNeeded", "type": "boolean", "tooltip": "If true, players will eventually become tired and need sleep."},
                {"id": "PlayerRespawnWithSelf", "name": "PlayerRespawnWithSelf", "type": "boolean", "tooltip": "If true, players respawn at their character's death location."},
                {"id": "PlayerRespawnWithOther", "name": "PlayerRespawnWithOther", "type": "boolean", "tooltip": "If true, players can choose to respawn at another player's location."},
                {"id": "RemovePlayerCorpsesOnCorpseRemoval", "name": "RemovePlayerCorpsesOnCorpseRemoval", "type": "boolean", "tooltip": "If true, player bodies are removed alongside zombie bodies based on the removal timer."},
                {"id": "TrashDeleteAll", "name": "TrashDeleteAll", "type": "boolean", "tooltip": "Enable or disable the 'Delete All' button in containers."},
                {"id": "PVPMeleeWhileHitReaction", "name": "PVPMeleeWhileHitReaction", "type": "boolean", "tooltip": "Allows players to be hit by melee attacks even while in a hit reaction animation."},
                {"id": "MouseOverToSeeDisplayName", "name": "MouseOverToSeeDisplayName", "type": "boolean", "tooltip": "If true, other players' names only appear when you hover your mouse over them."},
                {"id": "UsernameDisguises", "name": "UsernameDisguises", "type": "boolean", "tooltip": "Allows players to hide or change their displayed username."},
                {"id": "HideDisguisedUserName", "name": "HideDisguisedUserName", "type": "boolean", "tooltip": "If true, the real username is hidden when a disguise is active."},
                {"id": "HidePlayersBehindYou", "name": "HidePlayersBehindYou", "type": "boolean", "tooltip": "Characters positioned behind your view will not be rendered to improve performance or realism."},
                {"id": "PlayerBumpPlayer", "name": "PlayerBumpPlayer", "type": "boolean", "tooltip": "If true, players will physically collide with each other when running/walking."},
                {"id": "MapRemotePlayerVisibility", "name": "MapRemotePlayerVisibility", "type": "number", "tooltip": "0: Invisible, 1: Teammates only, 2: All players invisible, 3: All visible."},
                {"id": "AllowCoop", "name": "AllowCoop", "type": "boolean", "tooltip": "Enables or disables cooperative features/modes."}
            ],
            "Admin": [
                {"id": "ClientCommandFilter", "name": "ClientCommandFilter", "type": "string", "tooltip": "Semicolon-separated list of commands that will not be written to the cmd.txt server log."},
                {"id": "ClientActionLogs", "name": "ClientActionLogs", "type": "string", "tooltip": "Semicolon-separated list of actions that will be written to the ClientActionLogs.txt server log."},
                {"id": "PerkLogs", "name": "PerkLogs", "type": "boolean", "tooltip": "Track changes in player perk levels in PerkLog.txt server log."},
                {"id": "AdminSafehouse", "name": "AdminSafehouse", "type": "boolean", "tooltip": "If true, only admins can claim safehouses."},
                {"id": "HideAdminsInPlayerList", "name": "HideAdminsInPlayerList", "type": "boolean", "tooltip": "Hides admins in the player list."},
                {"id": "DisableRadioStaff", "name": "DisableRadioStaff", "type": "boolean", "tooltip": "Disables radio transmissions from players with 'staff' access level."},
                {"id": "DisableRadioAdmin", "name": "DisableRadioAdmin", "type": "boolean", "tooltip": "Disables radio transmissions from players with 'admin' access level."},
                {"id": "DisableRadioGM", "name": "DisableRadioGM", "type": "boolean", "tooltip": "Disables radio transmissions from players with 'gm' access level."},
                {"id": "DisableRadioOverseer", "name": "DisableRadioOverseer", "type": "boolean", "tooltip": "Disables radio transmissions from players with 'overseer' access level."},
                {"id": "DisableRadioModerator", "name": "DisableRadioModerator", "type": "boolean", "tooltip": "Disables radio transmissions from players with 'moderator' access level."},
                {"id": "DisableRadioInvisible", "name": "DisableRadioInvisible", "type": "boolean", "tooltip": "Disables radio transmissions from players with 'invisible' access level."}
            ],
            "Fire": [
                {"id": "NoFire", "name": "NoFire", "type": "boolean", "tooltip": "If true, all forms of fire are disabled - except for campfires."}
            ],
            "PVP": [
                {"id": "PVP", "name": "PVP", "type": "boolean", "tooltip": "Players can hurt and kill other players."},
                {"id": "SafetySystem", "name": "SafetySystem", "type": "boolean", "tooltip": "Players can enter and leave PVP on an individual basis. A player can only hurt another player when at least one of them is in PVP mode. When deactivated (false), players are free to hurt each other at any time if PVP is enabled."},
                {"id": "ShowSafety", "name": "ShowSafety", "type": "boolean", "tooltip": "Display a skull icon over the head of players who have entered PVP mode."},
                {"id": "SafetyToggleTimer", "name": "SafetyToggleTimer", "type": "number", "tooltip": "The time it takes for a player to enter and leave PVP mode. Min: 0 Max: 1000 Default: 2"},
                {"id": "SafetyCooldownTimer", "name": "SafetyCooldownTimer", "type": "number", "tooltip": "The delay before a player can enter or leave PVP mode again, having recently done so. Min: 0 Max: 1000 Default: 3"},
                {"id": "PVPMeleeDamageModifier", "name": "PVPMeleeDamageModifier", "type": "number", "is_float": True, "tooltip": "Damage multiplier for PVP melee attacks. Min: 0.00 Max: 500.00 Default: 30.00"},
                {"id": "PVPFirearmDamageModifier", "name": "PVPFirearmDamageModifier", "type": "number", "is_float": True, "tooltip": "Damage multiplier for PVP ranged attacks. Min: 0.00 Max: 500.00 Default: 50.00"}
            ],
            "ServerLoot": [
                {"id": "SafehousePreventsLootRespawn", "name": "SafehousePreventsLootRespawn", "type": "boolean", "tooltip": "Items will not respawn in buildings that players have claimed as a safehouse"},
                {"id": "ItemNumbersLimitPerContainer", "name": "ItemNumbersLimitPerContainer", "type": "number", "tooltip": "Maximum number of items that can be placed in a container. Zero means there is no limit. (PLEASE NOTE: This includes individual small items such as nails. A limit of 50 will mean only 50 nails can be stored.) Min: 0 Max: 9000 Default: 0"}
            ],
            "War": [
                {"id": "War", "name": "War", "type": "boolean", "tooltip": "Toggle for War mode."},
                {"id": "WarStartDelay", "name": "WarStartDelay", "type": "number", "tooltip": "Time in seconds before the war starts. Min: 60 Max: 2147483647 Default: 600"},
                {"id": "WarDuration", "name": "WarDuration", "type": "number", "tooltip": "War duration in seconds. Min: 60 Max: 2147483647 Default: 3600"},
                {"id": "WarSafehouseHitPoints", "name": "WarSafehouseHitPoints", "type": "number", "tooltip": "Safehouse hit points limit. Min: 0 Max: 2147483647 Default: 3"}
            ],
            "Faction": [
                {"id": "Faction", "name": "Faction", "type": "boolean", "tooltip": "Players can create factions when true"},
                {"id": "FactionDaySurvivedToCreate", "name": "FactionDaySurvivedToCreate", "type": "number", "tooltip": "Players must survive this number of in-game days before being allowed to create a faction Min: 0 Max: 2147483647 Default: 0"},
                {"id": "FactionPlayersRequiredForTag", "name": "FactionPlayersRequiredForTag", "type": "number", "tooltip": "Number of players required as faction members before the faction owner can create a group tag Min: 1 Max: 2147483647 Default: 1"}
            ],
            "Safehouse": [
                {"id": "AdminSafehouse", "name": "AdminSafehouse", "type": "boolean", "tooltip": "Only admins can claim safehouses"},
                {"id": "PlayerSafehouse", "name": "PlayerSafehouse", "type": "boolean", "tooltip": "Both admins and players can claim safehouses"},
                {"id": "SafehouseAllowTrepass", "name": "SafehouseAllowTrepass", "type": "boolean", "tooltip": "Allow non-members to enter a safehouse without being invited"},
                {"id": "SafehouseAllowFire", "name": "SafehouseAllowFire", "type": "boolean", "tooltip": "Allow fire to damage safehouses"},
                {"id": "SafehouseAllowLoot", "name": "SafehouseAllowLoot", "type": "boolean", "tooltip": "Allow non-members to take items from safehouses"},
                {"id": "SafehouseAllowRespawn", "name": "SafehouseAllowRespawn", "type": "boolean", "tooltip": "Players will respawn in a safehouse that they were a member of before they died"},
                {"id": "SafehouseDaySurvivedToClaim", "name": "SafehouseDaySurvivedToClaim", "type": "number", "tooltip": "Players must have survived this number of in-game days before they are allowed to claim a safehouse Min: 0 Max: 2147483647 Default: 0"},
                {"id": "SafeHouseRemovalTime", "name": "SafeHouseRemovalTime", "type": "number", "tooltip": "Players are automatically removed from a safehouse they have not visited for this many real-world hours Min: 0 Max: 2147483647 Default: 144"},
                {"id": "DisableSafehouseWhenPlayerConnected", "name": "DisableSafehouseWhenPlayerConnected", "type": "boolean", "tooltip": "Safehouse acts like a normal house if a member of the safehouse is connected (so secure when players are offline)"},
                {"id": "SafehouseAllowNonResidential", "name": "SafehouseAllowNonResidential", "type": "boolean", "tooltip": "Governs whether players can claim non-residential buildings."},
                {"id": "SafehouseDisableDisguises", "name": "SafehouseDisableDisguises", "type": "boolean", "tooltip": "SafehouseDisableDisguises toggle."}
            ],
            "Chat": [
                {"id": "GlobalChat", "name": "GlobalChat", "type": "boolean", "tooltip": "Toggles global chat on or off."},
                {"id": "AnnounceDeath", "name": "AnnounceDeath", "type": "boolean", "tooltip": "If checked, every time a player dies a global message will be displayed in the chat"},
                {"id": "AnnounceAnimalDeath", "name": "AnnounceAnimalDeath", "type": "boolean", "tooltip": "If checked, every time an animal dies a global message will be displayed in the chat"},
                {"id": "ServerWelcomeMessage", "name": "ServerWelcomeMessage", "type": "textarea", "tooltip": "The first welcome message visible in the chat panel. This will be displayed immediately after player login. you can use RGB colours to chance the colour of the welcome message. You can also use < LINE>, without the space, to create a separate lines within your text. Use: \\<RGB:1,0,0> This message will show up red!"},
                {"id": "ChatMessageCharacterLimit", "name": "ChatMessageCharacterLimit", "type": "number", "tooltip": "Min: 64 Max: 1024 Default: 200"},
                {"id": "ChatMessageSlowModeTime", "name": "ChatMessageSlowModeTime", "type": "number", "tooltip": "Min: 1 Max: 30 Default: 3"}
            ],
            "RCON": [
                {"id": "RCONPort", "name": "RCONPort", "type": "number", "tooltip": "The port for the RCON (Remote Console) Min: 0 Max: 65535 Default: 27015"},
                {"id": "RCONPassword", "name": "RCONPassword", "type": "string", "tooltip": "RCON password (Pick a strong password)"}
            ],
            "Discord": [
                {"id": "DiscordEnable", "name": "DiscordEnable", "type": "boolean", "tooltip": "Enables global text chat integration with a Discord channel"},
                {"id": "DiscordToken", "name": "DiscordToken", "type": "string", "tooltip": "Discord bot access token"},
                {"id": "DiscordChatChannel", "name": "DiscordChatChannel", "type": "string", "tooltip": "The Discord chat channel name"},
                {"id": "DiscordLogChannel", "name": "DiscordLogChannel", "type": "string", "tooltip": "The Discord logs channel name"},
                {"id": "DiscordCommandChannel", "name": "DiscordCommandChannel", "type": "string", "tooltip": "The Discord commands channel name"}
            ],
            "UPnP": [
                {"id": "UPnP", "name": "UPnP", "type": "boolean", "tooltip": "Attempt to configure a UPnP-enabled internet gateway to automatically setup port forwarding rules. The server will fall back to default ports if this fails"}
            ],
            "Other": [
                {"id": "DoLuaChecksum", "name": "DoLuaChecksum", "type": "boolean", "tooltip": "Kick clients whose game files don't match the server's."},
                {"id": "AllowDestructionBySledgehammer", "name": "AllowDestructionBySledgehammer", "type": "boolean", "tooltip": "Allow players to destroy world objects with sledgehammers"},
                {"id": "SledgehammerOnlyInSafehouse", "name": "SledgehammerOnlyInSafehouse", "type": "boolean", "tooltip": "Allow players to destroy world objects only in their safehouse (require AllowDestructionBySledgehammer to true)."},
                {"id": "SaveWorldEveryMinutes", "name": "SaveWorldEveryMinutes", "type": "number", "tooltip": "Loaded parts of the map are saved after this set number of real-world minutes have passed. (The map is usually saved only after clients leave a loaded area) Min: 0 Max: 2147483647 Default: 0"},
                {"id": "FastForwardMultiplier", "name": "FastForwardMultiplier", "type": "number", "is_float": True, "tooltip": "Governs how fast time passes while players sleep. Value multiplies the speed of the time that passes during sleeping. Min: 1.00 Max: 100.00 Default: 40.00"},
                {"id": "AllowNonAsciiUsername", "name": "AllowNonAsciiUsername", "type": "boolean", "tooltip": "Allow use of non-ASCII (cyrillic etc) characters in usernames"}
            ],
            "ServerVehicles": [
                {"id": "SpeedLimit", "name": "SpeedLimit", "type": "number", "is_float": True, "tooltip": "Maximum speed limit for vehicles. Min: 10.00 Max: 150.00 Default: 70.00"},
                {"id": "CarEngineAttractionModifier", "name": "CarEngineAttractionModifier", "type": "number", "is_float": True, "tooltip": "Multiplier for zombie attraction to car engines. Min: 0.00 Max: 10.00 Default: 0.50"}
            ],
            "Voice": [
                {"id": "VoiceEnable", "name": "VoiceEnable", "type": "boolean", "tooltip": "VOIP is enabled when checked"},
                {"id": "VoiceMinDistance", "name": "VoiceMinDistance", "type": "number", "is_float": True, "tooltip": "The minimum tile distance over which VOIP sounds can be heard. Min: 0.00 Max: 100000.00 Default: 10.00"},
                {"id": "VoiceMaxDistance", "name": "VoiceMaxDistance", "type": "number", "is_float": True, "tooltip": "The maximum tile distance over which VOIP sounds can be heard. Min: 0.00 Max: 100000.00 Default: 100.00"},
                {"id": "Voice3D", "name": "Voice3D", "type": "boolean", "tooltip": "Toggle directional audio for VOIP"}
            ]
        }

    def get_ini_vars(self):
        if not os.path.exists(self.ini_path):
            return {"error": f"File not found: {self.ini_path}"}

        try:
            with open(self.ini_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.readlines()
        except Exception as e:
            return {"error": f"Failed to read file: {str(e)}"}

        parsed_vars = {}
        discovered_defaults = {}
        last_default = None
        kv_pattern = re.compile(r"^\s*([\w\.\-]+)\s*=\s*(.*)")

        for line in content:
            stripped = line.strip()
            # Detect defaults in comments
            if stripped.startswith("#"):
                # Look for "Default: XXX"
                def_match = re.search(r"Default:\s*([^\s#]+)", stripped, re.IGNORECASE)
                if def_match:
                    last_default = def_match.group(1)
                continue
            
            match = kv_pattern.match(line)
            if match:
                key = match.group(1).strip()
                value = match.group(2).strip()
                parsed_vars[key] = value
                if last_default is not None:
                    # Convert booleans if found in comments
                    clean_def = last_default.lower()
                    if clean_def == "true": 
                        discovered_defaults[key] = True
                    elif clean_def == "false":
                        discovered_defaults[key] = False
                    else:
                        discovered_defaults[key] = last_default
                    last_default = None
            elif stripped:
                # Reset if non-empty non-kv line appears between comment and kv
                last_default = None

        # Build UI Categories
        categories_data = []
        for cat_name, fields in self.structure.items():
            cat_fields = []
            for f_def in fields:
                fid = f_def["id"]
                ftype = f_def["type"]
                raw_val = parsed_vars.get(fid, "")

                # Convert to typed value
                typed_val = raw_val
                if ftype == "boolean":
                    typed_val = str(raw_val).lower() == "true"
                elif ftype == "number":
                    try:
                        if raw_val:
                            typed_val = float(raw_val)
                        else:
                            typed_val = 0
                    except:
                        typed_val = 0
                
                # Use discovered default if available
                processed_default = discovered_defaults.get(fid)
                # Keep as string to preserve formatting like .0
                
                # Type conversion for final field output
                cat_fields.append({
                    "id": fid,
                    "name": f_def["name"],
                    "value": typed_val,
                    "defaultValue": processed_default,
                    "type": ftype,
                    "tooltip": f_def.get("tooltip", "")
                })
            
            display_name = cat_name
            if cat_name == "ServerLoot": display_name = "Loot"
            if cat_name == "ServerVehicles": display_name = "Vehicles"
            
            categories_data.append({
                "id": cat_name,
                "name": display_name,
                "fields": cat_fields
            })

        return {
            "categories": categories_data,
            "vars": parsed_vars
        }

    def save_ini_vars(self, updates: dict):
        if not os.path.exists(self.ini_path):
            return {"status": "error", "message": "File not found"}

        try:
            with open(self.ini_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
        except Exception as e:
            return {"status": "error", "message": f"Read error: {str(e)}"}

        new_lines = []
        handled_keys = set()

        # Update existing lines
        for line in lines:
            stripped = line.strip()
            # Preserve comments and empty lines
            if stripped.startswith("#") or not stripped:
                new_lines.append(line)
                continue
            
            match = re.match(r"^\s*([\w\.\-]+)\s*=", line)
            if match:
                key = match.group(1)
                if key in updates:
                    val = updates[key]
                    # Format value for INI (True/False instead of true/false)
                    if isinstance(val, bool):
                        str_val = "true" if val else "false"
                    else:
                        # Check if it should be forced as float
                        is_forced_float = False
                        for cat_fields in self.structure.values():
                            for f in cat_fields:
                                if f["id"] == key and f.get("is_float"):
                                    is_forced_float = True
                                    break
                        
                        if is_forced_float:
                            try:
                                f_val = float(val)
                                # Force at least one decimal
                                str_val = f"{f_val:.1f}" if f_val == int(f_val) else str(f_val)
                            except:
                                str_val = str(val)
                        else:
                            # Standard saving (ints remain ints)
                            try:
                                # if it's a number, convert to int to be safe if it's not a float field
                                if str(val).replace('.','',1).isdigit():
                                    str_val = str(int(float(val)))
                                else:
                                    str_val = str(val)
                            except:
                                str_val = str(val)
                    
                    new_lines.append(f"{key}={str_val}\n")
                    handled_keys.add(key)
                else:
                    new_lines.append(line)
            else:
                new_lines.append(line)

        # Add any new keys that weren't in the file (though unlikely for server settings)
        for key, val in updates.items():
            if key not in handled_keys:
                str_val = "true" if val else "false" if isinstance(val, bool) else str(val)
                new_lines.append(f"{key}={str_val}\n")

        try:
            with open(self.ini_path, "w", encoding="utf-8") as f:
                f.writelines(new_lines)
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": f"Write error: {str(e)}"}
