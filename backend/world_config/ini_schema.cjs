/**
 * Project Zomboid Server Configuration (INI) Schema
 * Defines categories and fields for the .ini file.
 */

module.exports = {
    iniStructure: {
        "Details": [
            {id: "DefaultPort", name: "DefaultPort", type: "number", tooltip: "The port used for server connections (P2P)."},
            {id: "PublicName", name: "PublicName", type: "string", tooltip: "The name of your server as it appears in the server browser."},
            {id: "PublicDescription", name: "PublicDescription", type: "textarea", tooltip: "A detailed description of your server shown in the lobby."},
            {id: "Public", name: "Public", type: "boolean", tooltip: "If true, the server will be visible in the public server list."},
            {id: "Password", name: "Password", type: "string", tooltip: "Required password for players to join the server."},
            {id: "PauseEmpty", name: "PauseEmpty", type: "boolean", tooltip: "If true, the server time pauses when no players are online."},
            {id: "ResetID", name: "ResetID", type: "number", tooltip: "Unique ID used to force a map reset if changed."}
        ],
        "Steam": [
            {id: "UDPPort", name: "UDPPort", type: "number", tooltip: "UDP port used for Steam communication."},
            {id: "MaxAccountsPerUser", name: "MaxAccountsPerUser", type: "number", tooltip: "Maximum number of accounts a single Steam user can have on the server (0 = unlimited)."},
            {id: "SteamScoreboard", name: "SteamScoreboard", type: "boolean", tooltip: "Toggles the Steam-integrated scoreboard feature."},
            {id: "SteamVAC", name: "SteamVAC", type: "boolean", tooltip: "Enable Steam Valve Anti-Cheat."}
        ],
        "Backups": [
            {id: "BackupsCount", name: "BackupsCount", type: "number"},
            {id: "BackupsOnStart", name: "BackupsOnStart", type: "boolean"},
            {id: "BackupsOnVersionChange", name: "BackupsOnVersionChange", type: "boolean"},
            {id: "BackupsPeriod", name: "BackupsPeriod", type: "number"}
        ],
        "Players": [
            {id: "MaxPlayers", name: "MaxPlayers", type: "number", tooltip: "Maximum number of players allowed on the server at once."},
            {id: "Open", name: "Open", type: "boolean", tooltip: "If true, the server is open to anyone. If false, only whitelisted players can join."},
            {id: "DropOffWhiteListAfterDeath", name: "DropOffWhiteListAfterDeath", type: "boolean", tooltip: "If true, players are automatically removed from the whitelist upon death."},
            {id: "DisplayUserName", name: "DisplayUserName", type: "boolean", tooltip: "Toggles whether usernames are displayed above players' heads."},
            {id: "ShowFirstAndLastName", name: "ShowFirstAndLastName", type: "boolean", tooltip: "Toggles whether player character first and last names are displayed."},
            {id: "SpawnItems", name: "SpawnItems", type: "string", tooltip: "List of items players will spawn with (e.g., Base.Axe;Base.Hammer)."},
            {id: "PingLimit", name: "PingLimit", type: "number", tooltip: "Maximum allowed ping before a player is kicked. 0 disables the limit."},
            {id: "ServerPlayerID", name: "ServerPlayerID", type: "string", tooltip: "Unique ID for the server, used for player identification across sessions."},
            {id: "SleepAllowed", name: "SleepAllowed", type: "boolean", tooltip: "If true, players are allowed to sleep in multiplayer."},
            {id: "SleepNeeded", name: "SleepNeeded", type: "boolean", tooltip: "If true, players will eventually become tired and need sleep."},
            {id: "PlayerRespawnWithSelf", name: "PlayerRespawnWithSelf", type: "boolean", tooltip: "If true, players respawn at their character's death location."},
            {id: "PlayerRespawnWithOther", name: "PlayerRespawnWithOther", type: "boolean", tooltip: "If true, players can choose to respawn at another player's location."},
            {id: "RemovePlayerCorpsesOnCorpseRemoval", name: "RemovePlayerCorpsesOnCorpseRemoval", type: "boolean", tooltip: "If true, player bodies are removed alongside zombie bodies based on the removal timer."},
            {id: "TrashDeleteAll", name: "TrashDeleteAll", type: "boolean", tooltip: "Enable or disable the 'Delete All' button in containers."},
            {id: "PVPMeleeWhileHitReaction", name: "PVPMeleeWhileHitReaction", type: "boolean", tooltip: "Allows players to be hit by melee attacks even while in a hit reaction animation."},
            {id: "MouseOverToSeeDisplayName", name: "MouseOverToSeeDisplayName", type: "boolean", tooltip: "If true, other players' names only appear when you hover your mouse over them."},
            {id: "UsernameDisguises", name: "UsernameDisguises", type: "boolean", tooltip: "Allows players to hide or change their displayed username."},
            {id: "HideDisguisedUserName", name: "HideDisguisedUserName", type: "boolean", tooltip: "If true, the real username is hidden when a disguise is active."},
            {id: "HidePlayersBehindYou", name: "HidePlayersBehindYou", type: "boolean", tooltip: "Characters positioned behind your view will not be rendered to improve performance or realism."},
            {id: "PlayerBumpPlayer", name: "PlayerBumpPlayer", type: "boolean", tooltip: "If true, players will physically collide with each other when running/walking."},
            {id: "MapRemotePlayerVisibility", name: "MapRemotePlayerVisibility", type: "number", tooltip: "0: Invisible, 1: Teammates only, 2: All players invisible, 3: All visible."},
            {id: "AllowCoop", name: "AllowCoop", type: "boolean", tooltip: "Enables or disables cooperative features/modes."}
        ],
        "Admin": [
            {id: "ClientCommandFilter", name: "ClientCommandFilter", type: "string", tooltip: "Semicolon-separated list of commands that will not be written to the cmd.txt server log."},
            {id: "ClientActionLogs", name: "ClientActionLogs", type: "string", tooltip: "Semicolon-separated list of actions that will be written to the ClientActionLogs.txt server log."},
            {id: "PerkLogs", name: "PerkLogs", type: "boolean", tooltip: "Track changes in player perk levels in PerkLog.txt server log."},
            {id: "HideAdminsInPlayerList", name: "HideAdminsInPlayerList", type: "boolean", tooltip: "Hides admins in the player list."},
            {id: "DisableRadioStaff", name: "DisableRadioStaff", type: "boolean", tooltip: "Disables radio transmissions from players with 'staff' access level."},
            {id: "DisableRadioAdmin", name: "DisableRadioAdmin", type: "boolean", tooltip: "Disables radio transmissions from players with 'admin' access level."},
            {id: "DisableRadioGM", name: "DisableRadioGM", type: "boolean", tooltip: "Disables radio transmissions from players with 'gm' access level."},
            {id: "DisableRadioOverseer", name: "DisableRadioOverseer", type: "boolean", tooltip: "Disables radio transmissions from players with 'overseer' access level."},
            {id: "DisableRadioModerator", name: "DisableRadioModerator", type: "boolean", tooltip: "Disables radio transmissions from players with 'moderator' access level."},
            {id: "DisableRadioInvisible", name: "DisableRadioInvisible", type: "boolean", tooltip: "Disables radio transmissions from players with 'invisible' access level."}
        ],
        "Fire": [
            {id: "NoFire", name: "NoFire", type: "boolean", tooltip: "If true, all forms of fire are disabled - except for campfires."}
        ],
        "PVP": [
            {id: "PVP", name: "PVP", type: "boolean", tooltip: "Players can hurt and kill other players."},
            {id: "SafetySystem", name: "SafetySystem", type: "boolean", tooltip: "Players can enter and leave PVP on an individual basis."},
            {id: "ShowSafety", name: "ShowSafety", type: "boolean", tooltip: "Display a skull icon over the head of players who have entered PVP mode."},
            {id: "SafetyToggleTimer", name: "SafetyToggleTimer", type: "number", tooltip: "The time it takes for a player to enter and leave PVP mode."},
            {id: "SafetyCooldownTimer", name: "SafetyCooldownTimer", type: "number", tooltip: "The delay before a player can enter or leave PVP mode again."},
            {id: "PVPMeleeDamageModifier", name: "PVPMeleeDamageModifier", type: "number", isFloat: true},
            {id: "PVPFirearmDamageModifier", name: "PVPFirearmDamageModifier", type: "number", isFloat: true}
        ],
        "ServerLoot": [
            {id: "SafehousePreventsLootRespawn", name: "SafehousePreventsLootRespawn", type: "boolean", tooltip: "If true, loot will not respawn inside claimed safehouses."},
            {id: "ItemNumbersLimitPerContainer", name: "ItemNumbersLimitPerContainer", type: "number", tooltip: "Limits how many items can be inside a single container. 0 means no limit."}
        ],
        "War": [
            {id: "War", name: "War", type: "boolean", tooltip: "Enables or disables the PvP war feature."},
            {id: "WarStartDelay", name: "WarStartDelay", type: "number", tooltip: "The delay in hours before a war can begin after being declared."},
            {id: "WarDuration", name: "WarDuration", type: "number", tooltip: "The duration of the war period in hours."},
            {id: "WarSafehouseHitPoints", name: "WarSafehouseHitPoints", type: "number", tooltip: "The health of safehouses during war time."}
        ],
        "Faction": [
            {id: "Faction", name: "Faction", type: "boolean", tooltip: "Enables or disables the faction system."},
            {id: "FactionDaySurvivedToCreate", name: "FactionDaySurvivedToCreate", type: "number", tooltip: "Number of days a character must survive before they can create a faction."},
            {id: "FactionPlayersRequiredForTag", name: "FactionPlayersRequiredForTag", type: "number", tooltip: "Number of players required in a faction before a faction tag is displayed."}
        ],
        "Safehouse": [
            {id: "AdminSafehouse", name: "AdminSafehouse", type: "boolean", tooltip: "If true, only admins can claim safehouses."},
            {id: "PlayerSafehouse", name: "PlayerSafehouse", type: "boolean", tooltip: "Allows players to claim buildings as safehouses."},
            {id: "SafehouseAllowTrepass", name: "SafehouseAllowTrepass", type: "boolean", tooltip: "Allows non-members to enter safehouses."},
            {id: "SafehouseAllowFire", name: "SafehouseAllowFire", type: "boolean", tooltip: "Allows fire to spread into safehouses."},
            {id: "SafehouseAllowLoot", name: "SafehouseAllowLoot", type: "boolean", tooltip: "Allows players to loot safehouses they don't belong to."},
            {id: "SafehouseAllowRespawn", name: "SafehouseAllowRespawn", type: "boolean", tooltip: "Allows players to respawn in their safehouses."},
            {id: "SafehouseDaySurvivedToClaim", name: "SafehouseDaySurvivedToClaim", type: "number", tooltip: "Number of days a character must survive before they can claim a safehouse."},
            {id: "SafeHouseRemovalTime", name: "SafeHouseRemovalTime", type: "number", tooltip: "Hours of player inactivity before a safehouse is automatically removed."},
            {id: "DisableSafehouseWhenPlayerConnected", name: "DisableSafehouseWhenPlayerConnected", type: "boolean", tooltip: "If true, safehouse protections are disabled when any member is online."},
            {id: "SafehouseAllowNonResidential", name: "SafehouseAllowNonResidential", type: "boolean", tooltip: "Allows players to claim non-residential buildings (e.g., warehouses) as safehouses."},
            {id: "SafehouseDisableDisguises", name: "SafehouseDisableDisguises", type: "boolean", tooltip: "If true, character names are revealed even if they are wearing disguises inside a safehouse."}
        ],
        "Chat": [
            {id: "GlobalChat", name: "GlobalChat", type: "boolean", tooltip: "Toggles global chat visibility for all players."},
            {id: "AnnounceDeath", name: "AnnounceDeath", type: "boolean", tooltip: "Announces player deaths in the global chat."},
            {id: "AnnounceAnimalDeath", name: "AnnounceAnimalDeath", type: "boolean", tooltip: "Announces animal deaths in the global chat."},
            {id: "ServerWelcomeMessage", name: "ServerWelcomeMessage", type: "textarea", tooltip: "Message displayed to players when they join the server."},
            {id: "ChatMessageCharacterLimit", name: "ChatMessageCharacterLimit", type: "number", tooltip: "Maximum number of characters allowed in a single chat message."},
            {id: "ChatMessageSlowModeTime", name: "ChatMessageSlowModeTime", type: "number", tooltip: "Cooldown time between chat messages in seconds."}
        ],
        "RCON": [
            {id: "RCONPort", name: "RCONPort", type: "number", tooltip: "Port used for Remote Console (RCON) connections."},
            {id: "RCONPassword", name: "RCONPassword", type: "string", tooltip: "Password required for RCON access."}
        ],
        "Discord": [
            {id: "DiscordEnable", name: "DiscordEnable", type: "boolean", tooltip: "Enables or disables Discord integration."},
            {id: "DiscordToken", name: "DiscordToken", type: "string", tooltip: "Your Discord bot token string."},
            {id: "DiscordChatChannel", name: "DiscordChatChannel", type: "string", tooltip: "The ID of the Discord channel where chat messages will be mirrored."},
            {id: "DiscordLogChannel", name: "DiscordLogChannel", type: "string", tooltip: "The ID of the Discord channel where server logs will be sent."},
            {id: "DiscordCommandChannel", name: "DiscordCommandChannel", type: "string", tooltip: "The ID of the Discord channel used for remote commands."}
        ],
        "UPnP": [
            {id: "UPnP", name: "UPnP", type: "boolean", tooltip: "Enables or disables UPnP for automatic port forwarding."}
        ],
        "Other": [
            {id: "DoLuaChecksum", name: "DoLuaChecksum", type: "boolean", tooltip: "Checks Lua files for integrity to prevent cheating."},
            {id: "AllowDestructionBySledgehammer", name: "AllowDestructionBySledgehammer", type: "boolean", tooltip: "Allows players to destroy structures using sledgehammers."},
            {id: "SledgehammerOnlyInSafehouse", name: "SledgehammerOnlyInSafehouse", type: "boolean", tooltip: "Allows sledgehammer destruction only inside claimed safehouses."},
            {id: "SaveWorldEveryMinutes", name: "SaveWorldEveryMinutes", type: "number", tooltip: "Interval in minutes for automatic world saving. Default: 0 (disabled)."},
            {id: "FastForwardMultiplier", name: "FastForwardMultiplier", type: "number", isFloat: true, tooltip: "Multiplier for time progression speed when all players are sleeping. Min: 1.0, Max: 100.0, Default: 40.0."},
            {id: "AllowNonAsciiUsername", name: "AllowNonAsciiUsername", type: "boolean", tooltip: "Allows usernames with non-ASCII characters to join the server."}
        ],
        "ServerVehicles": [
            {id: "SpeedLimit", name: "SpeedLimit", type: "number", isFloat: true, tooltip: "Maximum speed allowed for vehicles in the world. Min: 10,00, Max: 150,00, Default: 70,00."},
            {id: "CarEngineAttractionModifier", name: "CarEngineAttractionModifier", type: "number", isFloat: true, tooltip: "Multiplier for how much noise vehicle engines attract zombies. Min: 0,00, Max: 10,00, Default: 1,00."}
        ],
        "Voice": [
            {id: "VoiceEnable", name: "VoiceEnable", type: "boolean", tooltip: "Enables or disables VOIP (Voice over IP) features."},
            {id: "VoiceMinDistance", name: "VoiceMinDistance", type: "number", isFloat: true, tooltip: "Minimum distance within which voice chat is heard at full volume."},
            {id: "VoiceMaxDistance", name: "VoiceMaxDistance", type: "number", isFloat: true, tooltip: "Maximum distance beyond which voice chat cannot be heard."},
            {id: "Voice3D", name: "Voice3D", type: "boolean", tooltip: "Enables 3D positional audio for voice chat."}
        ]
    }
};
