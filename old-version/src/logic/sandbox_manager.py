import re
import os
from pathlib import Path

class SandboxManager:
    def __init__(self, lua_path: str):
        self.lua_path = lua_path
        self.default_lua_path = lua_path # Reference
        self.original_types = {}  # Store original Lua types (float vs int)
        self.forced_floats = set() # Track fields that MUST be floats based on comments
        
        # Build 42 Strict Float Registry
        # Fields that MUST be saved as floats (e.g. 1.0) for Lua compatibility
        self.known_floats = {
            "WoundInfectionFactor", "MuscleStrainFactor", "DiscomfortFactor",
            "MinutesPerPage", "FirearmNoiseMultiplier", "FirearmJamMultiplier",
            "FirearmMoodleMultiplier", "FirearmWeatherMultiplier", "FirearmWeatherMultiplier",
            "FirearmUseDamageChance", "LightBulbLifespan", "FarmingSpeedNew", "FarmingAmountNew",
            "HoursForWorldItemRemoval", "FridgeFactor", "FoodRotSpeed",
            "ZombieAttractionMultiplier", "CarGasConsumption", "SirenShutoffHours"
        }
        
        # Build 42 System & Legacy Blacklist (Ignore in UI)
        self.field_blacklist = {
            "VERSION", "WaterShut", "ElecShut", "AlarmDecayModifier",
            "InsaneLootFactor", "ExtremeLootFactor", "RareLootFactor", "NormalLootFactor",
            "CommonLootFactor", "AbundantLootFactor", "Farming", "TimeSinceApo",
            "PlantAbundance", "NightLength", "AnimalMetaStatsModifier"
        }
        
        self.categories = {
            "Time": [
                "DayLength", "StartYear", "StartMonth", "StartDay", "StartTime"
            ],
            "Zombie": [
                "Zombies", "Distribution", "ZombieVoronoiNoise", "ZombieRespawn", "ZombieMigrate",
                {"section": "Zombie Lore"},
                "ZombieLore.Speed", "ZombieLore.SprinterPercentage", "ZombieLore.Strength", "ZombieLore.Toughness",
                "ZombieLore.Transmission", "ZombieLore.Mortality", "ZombieLore.Reanimate", "ZombieLore.Cognition",
                "ZombieLore.DoorOpeningPercentage", "ZombieLore.CrawlUnderVehicle", "ZombieLore.Memory",
                "ZombieLore.Sight", "ZombieLore.Hearing", "ZombieLore.SpottedLogic", "ZombieLore.ThumpNoChasing",
                "ZombieLore.ThumpOnConstruction", "ZombieLore.ActiveOnly", "ZombieLore.TriggerHouseAlarm",
                "ZombieLore.ZombiesDragDown", "ZombieLore.ZombiesCrawlersDragDown", "ZombieLore.ZombiesFenceLunge",
                "ZombieLore.DisableFakeDead", "ZombieLore.ZombiesArmorFactor", "ZombieLore.ZombiesMaxDefense",
                "ZombieLore.ChanceOfAttachedWeapon", "ZombieLore.ZombiesFallDamage", "ZombieLore.PlayerSpawnZombieRemoval",
                {"section": "Advanced zombie settings"},
                "ZombieConfig.PopulationMultiplier", "ZombieConfig.PopulationStartMultiplier",
                "ZombieConfig.PopulationPeakMultiplier", "ZombieConfig.PopulationPeakDay",
                "ZombieConfig.RespawnHours", "ZombieConfig.RespawnUnseenHours", "ZombieConfig.RespawnMultiplier",
                "ZombieConfig.RedistributeHours", "ZombieConfig.FollowSoundDistance", "ZombieConfig.RallyGroupSize",
                "ZombieConfig.RallyGroupSizeVariance", "ZombieConfig.RallyTravelDistance",
                "ZombieConfig.RallyGroupSeparation", "ZombieConfig.RallyGroupRadius", "ZombieConfig.ZombiesCountBeforeDelete"
            ],
            "SandboxLoot": [
                "HoursForLootRespawn", "SeenHoursPreventLootRespawn", "MaxItemsForLootRespawn",
                "ConstructionPreventsLootRespawn", "MaximumLooted", "DaysUntilMaximumLooted",
                "RuralLooted", "MaximumDiminishedLoot", "DaysUntilMaximumDiminishedLoot",
                "MaximumLootedBuildingRooms",
                {"section": "Loot Rarity"},
                "FoodLootNew", "CannedFoodLootNew", "WeaponLootNew", "RangedWeaponLootNew",
                "AmmoLootNew", "MedicalLootNew", "SurvivalGearsLootNew", "MechanicsLootNew",
                "SkillBookLoot", "RecipeResourceLoot", "LiteratureLootNew", "ClothingLootNew",
                "ContainerLootNew", "KeyLootNew", "MediaLootNew", "MementoLootNew",
                "CookwareLootNew", "MaterialLootNew", "FarmingLootNew", "ToolLootNew",
                "OtherLootNew", "GeneratorSpawning", "LootItemRemovalList", "RemoveStoryLoot",
                "RemoveZombieLoot", "RollsMultiplier", "ZombiePopLootEffect"
            ],
            "World": [
                "WaterShutModifier", "ElecShutModifier", "AlarmDecay", "Alarm", "LockedHouses",
                "FireSpread", "AllowExteriorGenerator", "GeneratorTileRange", "GeneratorVerticalPowerRange",
                "FuelStationGasInfinite", "FuelStationGasMin", "FuelStationGasMax", "FuelStationGasEmptyChance",
                "LightBulbLifespan", "FoodRotSpeed", "FridgeFactor", "DaysForRottenFoodRemoval",
                "WorldItemRemovalList", "HoursForWorldItemRemoval", "ItemRemovalListBlacklistToggle",
                {"section": "Basements"},
                "Basement.SpawnFrequency", "MaximumFireFuelHours"
            ],
            "Nature": [
                "NightDarkness", "Temperature", "Rain", "MaxFogIntensity", "MaxRainFxIntensity",
                "ErosionSpeed", "ErosionDays", "FarmingSpeedNew", "CompostTime",
                "FishAbundance", "NatureAbundance", "PlantResilience", "FarmingAmountNew",
                "KillInsideCrops", "PlantGrowingSeasons", "PlaceDirtAboveground",
                "EnableSnowOnGround", "EnableTaintedWaterText", "MaximumRatIndex",
                "DaysUntilMaximumRatIndex", "ClayLakeChance", "ClayRiverChance"
            ],
            "Meta": [
                "Helicopter", "MetaEvent", "SleepingEvent", "GeneratorFuelConsumption",
                "SurvivorHouseChance", "VehicleStoryChance", "ZoneStoryChance", "AnnotatedMapChance",
                "HoursForCorpseRemoval", "DecayingCorpseHealthImpact", "ZombieHealthImpact",
                "BloodLevel", "BloodSplatLifespanDays", "MaggotSpawn", "MetaKnowledge",
                "DayNightCycle", "ClimateCycle", "FogCycle", "ZombieLore.FenceThumpersRequired", "ZombieLore.FenceDamageMultiplier",
                {"section": "In-game Map"},
                "Map.AllowWorldMap", "Map.AllowMiniMap", "Map.MapAllKnown", "Map.MapNeedsLight"
            ],
            "Character": [
                "StatsDecrease", "EndRegen", "Nutrition", "StarterKit", "CharacterFreePoints",
                "ConstructionBonusPoints", "InjurySeverity", "BoneFracture", "MuscleStrainFactor",
                "DiscomfortFactor", "WoundInfectionFactor", "ClothingDegradation", "NoBlackClothes",
                "RearVulnerability", "MultiHitZombies", "FirearmUseDamageChance", "FirearmNoiseMultiplier",
                "FirearmJamMultiplier", "FirearmMoodleMultiplier", "FirearmWeatherMultiplier",
                "FirearmHeadGearEffect", "AttackBlockMovements", "AllClothesUnlocked", "EnablePoisoning",
                "LiteratureCooldown", "NegativeTraitsPenalty", "MinutesPerPage", "LevelForDismantleXPCutoff",
                "LevelForMediaXPCutoff", "EasyClimbing", "SeeNotLearntRecipe",
                {"section": "XP multipliers"},
                "MultiplierConfig.Global", "MultiplierConfig.GlobalToggle",
                "MultiplierConfig.Fitness", "MultiplierConfig.Strength", "MultiplierConfig.Sprinting",
                "MultiplierConfig.Lightfoot", "MultiplierConfig.Nimble", "MultiplierConfig.Sneak",
                "MultiplierConfig.Axe", "MultiplierConfig.Blunt", "MultiplierConfig.SmallBlunt",
                "MultiplierConfig.LongBlade", "MultiplierConfig.SmallBlade", "MultiplierConfig.Spear",
                "MultiplierConfig.Maintenance", "MultiplierConfig.Farming", "MultiplierConfig.Husbandry",
                "MultiplierConfig.Woodwork", "MultiplierConfig.Carving", "MultiplierConfig.Cooking",
                "MultiplierConfig.Electricity", "MultiplierConfig.Doctor", "MultiplierConfig.FlintKnapping",
                "MultiplierConfig.Masonry", "MultiplierConfig.Mechanics", "MultiplierConfig.Blacksmith",
                "MultiplierConfig.Pottery", "MultiplierConfig.Tailoring", "MultiplierConfig.MetalWelding",
                "MultiplierConfig.Aiming", "MultiplierConfig.Reloading", "MultiplierConfig.Fishing",
                "MultiplierConfig.PlantScavenging", "MultiplierConfig.Tracking", "MultiplierConfig.Trapping",
                "MultiplierConfig.Butchering", "MultiplierConfig.Glassmaking"
            ],
            "SandboxVehicles": [
                "EnableVehicles", "VehicleEasyUse", "RecentlySurvivorVehicles", "ZombieAttractionMultiplier",
                "CarSpawnRate", "ChanceHasGas", "InitialGas", "CarGasConsumption", "LockedCar",
                "CarGeneralCondition", "TrafficJam", "CarAlarm", "PlayerDamageFromCrash",
                "CarDamageOnImpact", "SirenShutoffHours", "DamageToPlayerFromHitByACar", "SirenEffectsZombies"
            ],
            "Livestock": [
                "AnimalStatsModifier", "AnimalPregnancyTime", "AnimalEggHatch", "AnimalAgeModifier",
                "AnimalMilkIncModifier", "AnimalWoolIncModifier", "AnimalRanchChance",
                "AnimalGrassRegrowTime", "AnimalMetaPredator", "AnimalMatingSeason",
                "AnimalSoundAttractZombies", "AnimalTrackChance", "AnimalPathChance"
            ]
        }
        
        # Label mapping to match the game image provided by the user
        self.label_map = {
            "DayLength": "Day Length (in real time)",
            "StartYear": "Months since the Apocalypse",
            "StartMonth": "Start Month",
            "StartDay": "Start Day",
            "StartTime": "Start Hour",
            "Zombies": "Zombie Count",
            "Distribution": "Zombie Distribution",
            "ZombieVoronoiNoise": "Voronoi Noise",
            "ZombieRespawn": "Zombie Respawn",
            "ZombieMigrate": "Zombie Migration",
            "ZombieLore.Speed": "Speed",
            "ZombieLore.SprinterPercentage": "Random Sprinter Amount",
            "ZombieLore.Strength": "Strength",
            "ZombieLore.Toughness": "Toughness",
            "ZombieLore.Transmission": "Transmission",
            "ZombieLore.Mortality": "Infection Mortality",
            "ZombieLore.Reanimate": "Reanimate Time",
            "ZombieLore.Cognition": "Cognition",
            "ZombieLore.DoorOpeningPercentage": "Random Door Opening Amount",
            "ZombieLore.CrawlUnderVehicle": "Crawl Under Vehicle",
            "ZombieLore.Memory": "Memory",
            "ZombieLore.Sight": "Sight",
            "ZombieLore.Hearing": "Hearing",
            "ZombieLore.SpottedLogic": "New Stealth System",
            "ZombieLore.ThumpNoChasing": "Environmental Attacks",
            "ZombieLore.ThumpOnConstruction": "Damage Construction",
            "ZombieLore.ActiveOnly": "Day/Night Zombie Speed Effect",
            "ZombieLore.TriggerHouseAlarm": "Zombie House Alarm Triggering",
            "ZombieLore.ZombiesDragDown": "Drag Down",
            "ZombieLore.ZombiesCrawlersDragDown": "Crawlers Drag Down",
            "ZombieLore.ZombiesFenceLunge": "Zombie Lunge",
            "ZombieLore.DisableFakeDead": "Fake Dead Zombie Reanimation",
            "ZombieLore.ZombiesArmorFactor": "Zombie Armor Factor",
            "ZombieLore.ZombiesMaxDefense": "Maximum Zombie Armor Defense",
            "ZombieLore.ChanceOfAttachedWeapon": "Chance Of Attached Weapon",
            "ZombieLore.ZombiesFallDamage": "Zombie Fall Damage Multiplier",
            "ZombieLore.PlayerSpawnZombieRemoval": "Player Spawn Area",
            "ZombieConfig.PopulationMultiplier": "Population Multiplier",
            "ZombieConfig.PopulationStartMultiplier": "Population Start Multiplier",
            "ZombieConfig.PopulationPeakMultiplier": "Population Peak Multiplier",
            "ZombieConfig.PopulationPeakDay": "Population Peak Day",
            "ZombieConfig.RespawnHours": "Respawn Hours",
            "ZombieConfig.RespawnUnseenHours": "Respawn Unseen Hours",
            "ZombieConfig.RespawnMultiplier": "Respawn Multiplier",
            "ZombieConfig.RedistributeHours": "Redistribute Hours",
            "ZombieConfig.FollowSoundDistance": "Follow Sound Distance",
            "ZombieConfig.RallyGroupSize": "Rally Group Size",
            "ZombieConfig.RallyGroupSizeVariance": "Rally Group Size Variance",
            "ZombieConfig.RallyTravelDistance": "Rally Travel Distance",
            "ZombieConfig.RallyGroupSeparation": "Rally Group Separation",
            "ZombieConfig.RallyGroupRadius": "Rally Group Radius",
            "ZombieConfig.ZombiesCountBeforeDelete": "Zombie count before deletion",
            "SeenHoursPreventLootRespawn": "Loot Seen Prevent Hours",
            "HoursForLootRespawn": "Hours for loot respawn",
            "MaxItemsForLootRespawn": "Max items for loot respawn",
            "ConstructionPreventsLootRespawn": "Construction prevents loot respawn",
            "MaximumLooted": "Maximum looted building chance",
            "DaysUntilMaximumLooted": "Days until maximum looted building chance",
            "RuralLooted": "Maximum rural looted building chance",
            "MaximumDiminishedLoot": "Maximum diminished loot percentage",
            "DaysUntilMaximumDiminishedLoot": "Days until maximum diminished loot percentage",
            "MaximumLootedBuildingRooms": "Maximum looted building rooms",
            "FoodLootNew": "Perishable Food",
            "CannedFoodLootNew": "Non-Perishable Food",
            "WeaponLootNew": "Melee Weapons",
            "RangedWeaponLootNew": "Ranged Weapons",
            "AmmoLootNew": "Ammo",
            "MedicalLootNew": "Medical",
            "SurvivalGearsLootNew": "Survival Essentials",
            "MechanicsLootNew": "Mechanics",
            "SkillBookLoot": "Skill Books",
            "RecipeResourceLoot": "Recipe Resources",
            "LiteratureLootNew": "Other Literature",
            "ClothingLootNew": "Clothing",
            "ContainerLootNew": "Bags",
            "KeyLootNew": "Keys",
            "MediaLootNew": "Media",
            "MementoLootNew": "Mementos",
            "CookwareLootNew": "Cooking",
            "MaterialLootNew": "Material",
            "FarmingLootNew": "Farming",
            "ToolLootNew": "Tools",
            "OtherLootNew": "Other",
            "GeneratorSpawning": "Generators",
            "LootItemRemovalList": "Loot Item Removal List",
            "RemoveStoryLoot": "Remove Unwanted Story Loot",
            "RemoveZombieLoot": "Remove Unwanted Zombie Loot",
            "RollsMultiplier": "Rolls Multiplier [!]",
            "ZombiePopLootEffect": "Zombie Population Loot Effect",
            "WaterShutModifier": "Water Shutoff",
            "ElecShutModifier": "Electricity Shutoff",
            "AlarmDecay": "Alarm Battery Decay",
            "Alarm": "House Alarms Frequency",
            "LockedHouses": "Locked Houses Frequency",
            "FireSpread": "Fire Spread",
            "AllowExteriorGenerator": "Generator Working in Exterior",
            "GeneratorTileRange": "Generator tile range",
            "GeneratorVerticalPowerRange": "Generator vertical range",
            "FuelStationGasInfinite": "Infinite Gas Pumps",
            "FuelStationGasMin": "Initial Minimum Gas Pump Amount",
            "FuelStationGasMax": "Initial Maximum Gas Pump Amount",
            "FuelStationGasEmptyChance": "Initial Gas Pump Empty Chance",
            "LightBulbLifespan": "Light Bulb Lifespan",
            "FoodRotSpeed": "Food Spoilage",
            "FridgeFactor": "Refrigeration Effectiveness",
            "DaysForRottenFoodRemoval": "Rotten Food Removal",
            "WorldItemRemovalList": "World Item Removal List",
            "HoursForWorldItemRemoval": "Hours for Removal List",
            "ItemRemovalListBlacklistToggle": "Removal List as Whitelist",
            "Basement.SpawnFrequency": "Basement Spawn Frequency",
            "MaximumFireFuelHours": "Maximum Fire Fuel Hours",
            "NightDarkness": "Darkness during night",
            "Temperature": "Temperature",
            "Rain": "Rain",
            "MaxFogIntensity": "Maximum Fog Intensity",
            "MaxRainFxIntensity": "Maximum Rain FX Intensity",
            "ErosionSpeed": "Erosion Speed",
            "ErosionDays": "Erosion Days",
            "FarmingSpeedNew": "Farming Speed",
            "CompostTime": "Compost Time",
            "FishAbundance": "Fishing Abundance",
            "NatureAbundance": "Nature's Abundance",
            "PlantResilience": "Plant Resilience",
            "FarmingAmountNew": "Farming Abundance",
            "KillInsideCrops": "Kill Crops Grown Inside",
            "PlantGrowingSeasons": "Plant Growing Seasons",
            "PlaceDirtAboveground": "Farms not on Ground Level [!]",
            "EnableSnowOnGround": "Snow on Ground",
            "EnableTaintedWaterText": "Enable 'Tainted Water' tooltip",
            "MaximumRatIndex": "Maximum Vermin Index",
            "DaysUntilMaximumRatIndex": "Days Until Maximum Vermin Index",
            "ClayLakeChance": "Clay chance - Lake",
            "ClayRiverChance": "Clay chance - River",
            "Helicopter": "Helicopter",
            "MetaEvent": "Meta Event",
            "SleepingEvent": "Sleeping Event",
            "GeneratorFuelConsumption": "Generator Fuel Consumption",
            "SurvivorHouseChance": "Randomized Building Chance",
            "VehicleStoryChance": "Randomized Road Stories Chance",
            "ZoneStoryChance": "Randomized Zone Stories Chance",
            "AnnotatedMapChance": "Annotated Map Chance",
            "HoursForCorpseRemoval": "Time Before Corpse Removal",
            "DecayingCorpseHealthImpact": "Decaying Corpse Health Impact",
            "ZombieHealthImpact": "Zombie Health Impact",
            "BloodLevel": "Blood Level",
            "BloodSplatLifespanDays": "Blood Splat Lifespan Days",
            "MaggotSpawn": "Corpse Maggot Spawn",
            "MetaKnowledge": "Media List Meta Knowledge",
            "DayNightCycle": "Day / Night Cycle",
            "ClimateCycle": "Climate Cycle",
            "FogCycle": "Fog Cycle",
            "ZombieLore.FenceThumpersRequired": "Zombies To Damage Fences",
            "ZombieLore.FenceDamageMultiplier": "Fence Damage Multiplier",
            "Map.AllowWorldMap": "Allow World Map",
            "Map.AllowMiniMap": "Allow Mini-Map",
            "Map.MapAllKnown": "All Known On Start",
            "Map.MapNeedsLight": "Light Needed To Read Map",
            "StatsDecrease": "Stats Decrease",
            "EndRegen": "Endurance Regeneration",
            "Nutrition": "Nutrition System",
            "StarterKit": "Starter Kit",
            "CharacterFreePoints": "Free Trait Points",
            "ConstructionBonusPoints": "Player-built Construction Strength",
            "InjurySeverity": "Injury Severity",
            "BoneFracture": "Bone Fracture",
            "MuscleStrainFactor": "Muscle Strain Factor",
            "DiscomfortFactor": "Discomfort Factor",
            "WoundInfectionFactor": "Wound Infection Damage Factor",
            "ClothingDegradation": "Clothing Degradation",
            "NoBlackClothes": "No Black Clothes",
            "RearVulnerability": "Rear Vulnerability",
            "MultiHitZombies": "Weapon Multi Hit",
            "FirearmUseDamageChance": "Firearms Use Damage Chance",
            "FirearmNoiseMultiplier": "Firearm Noise Multiplier",
            "FirearmJamMultiplier": "Firearm Jam Multiplier",
            "FirearmMoodleMultiplier": "Firearm Moodle Multiplier",
            "FirearmWeatherMultiplier": "Firearm Weather Multiplier",
            "FirearmHeadGearEffect": "Firearm Headgear Effect",
            "AttackBlockMovements": "Melee Movement Disruption",
            "AllClothesUnlocked": "All Clothing Unlocked",
            "EnablePoisoning": "Enable Poisoning",
            "LiteratureCooldown": "Literature Cooldown Days",
            "NegativeTraitsPenalty": "Negative Traits Penalty",
            "MinutesPerPage": "Minutes Per Skill Book Page",
            "LevelForDismantleXPCutoff": "Maximum Dismantling XP Level",
            "LevelForMediaXPCutoff": "Maximum Media XP Level",
            "EasyClimbing": "Easy Climbing",
            "SeeNotLearntRecipe": "See Not Known Recipes",
            "MultiplierConfig.Global": "Global Multiplier",
            "MultiplierConfig.GlobalToggle": "Use Global Multiplier",
            "MultiplierConfig.Fitness": "Fitness Multiplier",
            "MultiplierConfig.Strength": "Strength Multiplier",
            "MultiplierConfig.Sprinting": "Sprinting Multiplier",
            "MultiplierConfig.Lightfoot": "Lightfooted Multiplier",
            "MultiplierConfig.Nimble": "Nimble Multiplier",
            "MultiplierConfig.Sneak": "Sneaking Multiplier",
            "MultiplierConfig.Axe": "Axe Multiplier",
            "MultiplierConfig.Blunt": "Long Blunt Multiplier",
            "MultiplierConfig.SmallBlunt": "Short Blunt Multiplier",
            "MultiplierConfig.LongBlade": "Long Blade Multiplier",
            "MultiplierConfig.SmallBlade": "Short Blade Multiplier",
            "MultiplierConfig.Spear": "Spear Multiplier",
            "MultiplierConfig.Maintenance": "Maintenance Multiplier",
            "MultiplierConfig.Farming": "Agriculture Multiplier",
            "MultiplierConfig.Husbandry": "Animal Care Multiplier",
            "MultiplierConfig.Woodwork": "Carpentry Multiplier",
            "MultiplierConfig.Carving": "Carving Multiplier",
            "MultiplierConfig.Cooking": "Cooking Multiplier",
            "MultiplierConfig.Electricity": "Electrical Multiplier",
            "MultiplierConfig.Doctor": "First Aid Multiplier",
            "MultiplierConfig.FlintKnapping": "Knapping Multiplier",
            "MultiplierConfig.Masonry": "Masonry Multiplier",
            "MultiplierConfig.Mechanics": "Mechanics Multiplier",
            "MultiplierConfig.Blacksmith": "Blacksmithing Multiplier",
            "MultiplierConfig.Pottery": "Pottery",
            "MultiplierConfig.Tailoring": "Tailoring",
            "MultiplierConfig.MetalWelding": "Metalworking",
            "MultiplierConfig.Aiming": "Aiming",
            "MultiplierConfig.Reloading": "Reloading",
            "MultiplierConfig.Fishing": "Fishing",
            "MultiplierConfig.PlantScavenging": "Plant Scavenging",
            "MultiplierConfig.Tracking": "Tracking",
            "MultiplierConfig.Trapping": "Trapping",
            "MultiplierConfig.Butchering": "Butchering",
            "MultiplierConfig.Glassmaking": "Glassmaking",
            "EnableVehicles": "Vehicles",
            "VehicleEasyUse": "Easy Use",
            "RecentlySurvivorVehicles": "Recent Survivor Vehicles",
            "ZombieAttractionMultiplier": "Zombie Attraction Multiplier",
            "CarSpawnRate": "Vehicle Spawn Rate",
            "ChanceHasGas": "Chance Has Gas",
            "InitialGas": "Initial Gas",
            "CarGasConsumption": "Gas Consumption",
            "LockedCar": "Locked Vehicle Frequency",
            "CarGeneralCondition": "General Condition",
            "TrafficJam": "Car Wreck Congestion",
            "CarAlarm": "Vehicle Alarms Frequency",
            "PlayerDamageFromCrash": "Player Damage from Crash",
            "CarDamageOnImpact": "Car Damage on Impact",
            "SirenShutoffHours": "Siren Shutoff Hours",
            "DamageToPlayerFromHitByACar": "Player Damage From Vehicle Impact",
            "SirenEffectsZombies": "Vehicle Sirens Attract Zombies",
            "AnimalStatsModifier": "Stats Reduction Speed",
            "AnimalPregnancyTime": "Pregnancy Time",
            "AnimalEggHatch": "Egg Hatch Time",
            "AnimalAgeModifier": "Aging Modifier Speed",
            "AnimalMilkIncModifier": "Milk Increase Speed",
            "AnimalWoolIncModifier": "Wool Increase Speed",
            "AnimalRanchChance": "Animal Spawn Chance",
            "AnimalGrassRegrowTime": "Grass Regrow time",
            "AnimalMetaPredator": "Meta Predator",
            "AnimalMatingSeason": "Breeding Season",
            "AnimalSoundAttractZombies": "Animals Attract Zombies",
            "AnimalTrackChance": "Animal Tracks Chance",
            "AnimalPathChance": "Animal Paths Chance"
        }
        self.tooltip_overrides = {
            "DayLength": "Day Lenght (in real time):\nDefault = 1 Hour, 30 Minutes",
            "StartYear": "How long after the end of the world to begin.\nThis will affect starting world erosion and food spoilage.\nDoes not affect the starting date.\nDefault = 0",
            "StartMonth": "Month in which the game starts.\nDefault = July",
            "StartDay": "Day of the month in which the games starts.",
            "StartTime": "Hour of the day in which the game starts.\nDefault = 9 AM"
        }

    def _get_field_description(self, line: str) -> str:
        """Extracts comment content as tooltip."""
        if "--" in line:
            return line.split("--")[-1].strip()
        return ""

    def get_sandbox_vars(self):
        if not os.path.exists(self.lua_path):
            return {"error": f"File not found: {self.lua_path}"}

        with open(self.lua_path, "r", encoding="utf-8") as f:
            content = f.readlines()

        parsed_vars = {}
        kv_pattern = re.compile(r"^\s*(\w+)\s*=\s*(.*),")
        table_start_pattern = re.compile(r"^\s*(\w+)\s*=\s*{")
        table_end_pattern = re.compile(r"^\s*},")
        
        current_comments = []
        current_table = None

        for line in content:
            stripped = line.strip()
            
            # 1. Collect comments
            if stripped.startswith("--"):
                comment_text = stripped.replace("--", "").strip()
                # Skip separators (e.g. ---, ===, ***) and empty lines
                if comment_text and not all(c in '-=_*' for c in comment_text):
                    current_comments.append(comment_text)
                continue
            
            # 2. Check for table end
            if current_table and table_end_pattern.match(line):
                current_table = None
                continue

            # 3. Check for table start
            ts_match = table_start_pattern.match(line)
            if ts_match:
                current_table = ts_match.group(1)
                continue

            # 4. Check for Key-Value
            match = kv_pattern.match(line)
            if match:
                key_raw = match.group(1)
                value_raw = match.group(2).strip()
                
                # Composite key for nested tables
                # Skip SandboxVars as prefix
                if current_table and current_table != "SandboxVars":
                    full_key = f"{current_table}.{key_raw}"
                else:
                    full_key = key_raw
                
                # Determine type
                if value_raw.lower() == "true":
                    value = True
                elif value_raw.lower() == "false":
                    value = False
                elif value_raw.startswith('"') and value_raw.endswith('"'):
                    value = value_raw[1:-1]
                elif "." in value_raw:
                    try: 
                        value = float(value_raw)
                        self.original_types[full_key] = "float"
                    except: 
                        value = value_raw
                else:
                    try: 
                        value = int(value_raw)
                        self.original_types[full_key] = "int"
                    except: 
                        value = value_raw
                
                # Extract raw default value from comments if present
                raw_default = None
                combined_comments = " ".join(current_comments)
                
                # Dynamic Float Detection: Look for X.X or X.XX in Min/Max/Default within comments
                if re.search(r"(Min|Max|Default)\s*[=:]\s*(-?\d+\.\d+)", combined_comments, re.IGNORECASE):
                    self.forced_floats.add(full_key)

                def_match = re.search(r"Default\s*[=:]\s*([^,\.\n\#\-\-]*)", combined_comments, re.IGNORECASE)
                if def_match:
                    raw_default = def_match.group(1).strip()

                # Use only the first line of comments for the auto-tooltip
                parsed_vars[full_key] = {
                    "value": value,
                    "tooltip": current_comments[0] if current_comments else "",
                    "raw_default": raw_default
                }
                current_comments = []
            elif stripped:
                # Reset comments if we hit a non-empty non-matching line
                if not stripped.startswith("SandboxVars = {"):
                    current_comments = []

        # Group into categories for UI
        categories_data = []
        all_categorized_keys = set()
        
        # 1. Collect all keys already in hardcoded categories
        for items in self.categories.values():
            for item in items:
                if isinstance(item, str):
                    all_categorized_keys.add(item)

        # 2. Build hardcoded categories
        for cat_name, items in self.categories.items():
            fields = []
            for item in items:
                # Handle section headers
                if isinstance(item, dict) and "section" in item:
                    fields.append(item)
                    continue
                
                # Check if item is a field ID
                fid = item
                if fid in parsed_vars and fid not in self.field_blacklist:
                    # Specialized options mapping
                    options = self._get_options_for_field(fid)
                    
                    # Use manual override if exists
                    tooltip = self.tooltip_overrides.get(fid, parsed_vars[fid]["tooltip"])
                    
                    # Convert raw_default to a typed defaultValue if possible
                    raw_def = parsed_vars[fid].get("raw_default")
                    default_value = None
                    if raw_def:
                        if raw_def.lower() == "true": default_value = True
                        elif raw_def.lower() == "false": default_value = False
                        else:
                            try:
                                if "." in raw_def: default_value = float(raw_def)
                                else: default_value = int(raw_def)
                            except:
                                # Map label to ID (e.g. "None" -> 4)
                                if options:
                                    match = next((opt["value"] for opt in options if opt["label"].lower() == raw_def.lower()), None)
                                    if match is not None:
                                        default_value = match

                    fields.append({
                        "id": fid,
                        "name": self.label_map.get(fid, fid),
                        "value": parsed_vars[fid]["value"],
                        "defaultValue": default_value,
                        "tooltip": tooltip,
                        "options": options
                    })
            
            display_name = cat_name
            if cat_name == "SandboxLoot": display_name = "Loot"
            if cat_name == "SandboxVehicles": display_name = "Vehicles"
            
            if fields:
                categories_data.append({"id": cat_name, "name": display_name, "fields": fields})

        # 3. Handle "Mods" category (Smart grouping for remaining keys)
        mods_fields = []
        mod_groups = {} # To group by prefix (e.g., 'RVAddon')
        
        for fid in sorted(parsed_vars.keys()):
            if fid not in all_categorized_keys and fid not in self.field_blacklist:
                if "." in fid:
                    prefix = fid.split(".")[0]
                    if prefix not in mod_groups:
                        mod_groups[prefix] = []
                    mod_groups[prefix].append(fid)
                elif fid.startswith("FR_RVsOnly") or fid.startswith("VRO_"):
                    prefix = "RVsOnly" # Custom group name requested by user
                    if prefix not in mod_groups:
                        mod_groups[prefix] = []
                    mod_groups[prefix].append(fid)
                elif fid.startswith("BAM_"):
                    prefix = "Others" # Standard grouping for BAM and unidentified utilities
                    if prefix not in mod_groups:
                        mod_groups[prefix] = []
                    mod_groups[prefix].append(fid)
                else:
                    mods_fields.append(fid)

        # Build the final Mods tab content
        final_mods_tab = []
        
        # Add non-prefixed "others" first if any
        for fid in mods_fields:
            final_mods_tab.append(self._build_field_obj(fid, parsed_vars))
            
        # Add grouped mod sections
        sorted_prefixes = sorted([p for p in mod_groups.keys() if p != "Others"])
        if "Others" in mod_groups:
            sorted_prefixes.append("Others")

        for prefix in sorted_prefixes:
            section_name = prefix
            final_mods_tab.append({"section": section_name})
            for fid in mod_groups[prefix]:
                # Simplify label if it starts with the prefix/table
                display_name = fid
                
                # Case 1: Standard dot prefix (e.g. ModTable.Setting)
                if "." in fid:
                    p = fid.split(".")[0]
                    display_name = fid[len(p)+1:]
                # Case 2: Custom FR_ or VRO_ prefix (e.g. FR_RVsOnly_Setting or VRO_Setting)
                elif fid.startswith("FR_RVsOnly") or fid.startswith("VRO_"):
                    if fid.startswith("FR_RVsOnly"):
                        display_name = fid[len("FR_RVsOnly"):].lstrip("_")
                    else:
                        display_name = fid[len("VRO_"):].lstrip("_")
                # Case 3: BAM_ prefix (e.g. BAM_Server_Setting)
                elif fid.startswith("BAM_"):
                    display_name = fid[len("BAM_"):].lstrip("_")
                
                if not display_name: display_name = fid # Fallback
                
                field_obj = self._build_field_obj(fid, parsed_vars)
                # Override with simplified name unless manually mapped in label_map
                field_obj["name"] = self.label_map.get(fid, display_name)
                final_mods_tab.append(field_obj)
        
        if final_mods_tab:
            categories_data.append({"id": "Mods", "name": "Mods", "fields": final_mods_tab})

        return {
            "categories": categories_data,
            "vars": parsed_vars,
            "lua_path": str(Path(self.lua_path).name)
        }

    def _build_field_obj(self, fid, parsed_vars):
        """Helper to build consistent field objects for dynamic categorization"""
        options = self._get_options_for_field(fid)
        tooltip = self.tooltip_overrides.get(fid, parsed_vars[fid]["tooltip"])
        return {
            "id": fid,
            "name": self.label_map.get(fid, fid),
            "value": parsed_vars[fid]["value"],
            "tooltip": tooltip,
            "options": options
        }

    def _is_float_field(self, fid: str) -> bool:
        """Determines if a field MUST be saved as a float (e.g. 1.0)"""
        # 1. Explicitly mapped or detected from comments
        if fid in self.known_floats or fid in self.forced_floats:
            return True
        # 2. Pattern based (Factors and Multipliers)
        if any(suffix in fid for suffix in ["Multiplier", "Factor"]):
             return True
        # 3. MultiplierConfig skills are almost always floats
        if fid.startswith("MultiplierConfig.") and not fid.endswith("GlobalToggle"):
            return True
        return False

    def _get_options_for_field(self, fid: str):
        if fid == "DayLength":
            return [
                {"value": 1, "label": "15 Minutes"}, {"value": 2, "label": "30 Minutes"},
                {"value": 3, "label": "1 Hour"}, {"value": 4, "label": "1 Hour, 30 Minutes"},
                {"value": 5, "label": "2 Hours"}, {"value": 6, "label": "3 Hours"},
                {"value": 7, "label": "4 Hours"}, {"value": 8, "label": "5 Hours"},
                {"value": 9, "label": "6 Hours"}, {"value": 10, "label": "7 Hours"},
                {"value": 11, "label": "8 Hours"}, {"value": 12, "label": "9 Hours"},
                {"value": 13, "label": "10 Hours"}, {"value": 14, "label": "11 Hours"},
                {"value": 15, "label": "12 Hours"}, {"value": 16, "label": "13 Hours"},
                {"value": 17, "label": "14 Hours"}, {"value": 18, "label": "15 Hours"},
                {"value": 19, "label": "16 Hours"}, {"value": 20, "label": "17 Hours"},
                {"value": 21, "label": "18 Hours"}, {"value": 22, "label": "19 Hours"},
                {"value": 23, "label": "20 Hours"}, {"value": 24, "label": "21 Hours"},
                {"value": 25, "label": "22 Hours"}, {"value": 26, "label": "23 Hours"},
                {"value": 27, "label": "Real-time"}
            ]
        if fid == "StartMonth":
            return [
                {"value": 1, "label": "January"}, {"value": 2, "label": "February"},
                {"value": 3, "label": "March"}, {"value": 4, "label": "April"},
                {"value": 5, "label": "May"}, {"value": 6, "label": "June"},
                {"value": 7, "label": "July"}, {"value": 8, "label": "August"},
                {"value": 9, "label": "September"}, {"value": 10, "label": "October"},
                {"value": 11, "label": "November"}, {"value": 12, "label": "December"}
            ]
        if fid == "StartYear":
            return [{"value": i, "label": str(i)} for i in range(13)]
        if fid == "StartDay":
            return [{"value": i, "label": str(i)} for i in range(1, 32)]
        if fid == "StartTime":
            return [
                {"value": 1, "label": "7 AM"}, {"value": 2, "label": "9 AM"}, {"value": 3, "label": "12 PM"},
                {"value": 4, "label": "2 PM"}, {"value": 5, "label": "5 PM"}, {"value": 6, "label": "9 PM"},
                {"value": 7, "label": "12 AM"}, {"value": 8, "label": "2 AM"}, {"value": 9, "label": "5 AM"}
            ]
        if fid == "Zombies":
            return [
                {"value": 1, "label": "Insane"}, {"value": 2, "label": "Very High"},
                {"value": 3, "label": "High"}, {"value": 4, "label": "Normal"},
                {"value": 5, "label": "Low"}, {"value": 6, "label": "None"}
            ]
        if fid == "Distribution":
            return [{"value": 1, "label": "Urban Focused"}, {"value": 2, "label": "Uniform"}]
        if fid == "ZombieRespawn":
            return [
                {"value": 1, "label": "High"}, {"value": 2, "label": "Normal"},
                {"value": 3, "label": "Low"}, {"value": 4, "label": "None"}
            ]
        if fid == "ZombieLore.Speed":
            return [
                {"value": 1, "label": "Sprinters"}, {"value": 2, "label": "Fast Shamblers"},
                {"value": 3, "label": "Shamblers"}, {"value": 4, "label": "Random"}
            ]
        if fid == "ZombieLore.Strength":
            return [
                {"value": 1, "label": "Superhuman"}, {"value": 2, "label": "Normal"},
                {"value": 3, "label": "Weak"}, {"value": 4, "label": "Random"}
            ]
        if fid == "ZombieLore.Toughness":
            return [
                {"value": 1, "label": "Tough"}, {"value": 2, "label": "Normal"},
                {"value": 3, "label": "Fragile"}, {"value": 4, "label": "Random"}
            ]
        if fid == "ZombieLore.Transmission":
            return [
                {"value": 1, "label": "Blood and Saliva"}, {"value": 2, "label": "Saliva Only"},
                {"value": 3, "label": "Everyone's Infected"}, {"value": 4, "label": "None"}
            ]
        if fid == "ZombieLore.Mortality":
            return [
                {"value": 1, "label": "Instant"}, {"value": 2, "label": "0-30 Seconds"},
                {"value": 3, "label": "0-1 Minutes"}, {"value": 4, "label": "0-12 Hours"},
                {"value": 5, "label": "2-3 Days"}, {"value": 6, "label": "1-2 Weeks"},
                {"value": 7, "label": "Never"}
            ]
        if fid == "ZombieLore.Reanimate":
            return [
                {"value": 1, "label": "Instant"}, {"value": 2, "label": "0-30 Seconds"},
                {"value": 3, "label": "0-1 Minutes"}, {"value": 4, "label": "0-12 Hours"},
                {"value": 5, "label": "2-3 Days"}, {"value": 6, "label": "1-2 Weeks"}
            ]
        if fid == "ZombieLore.Cognition":
            return [
                {"value": 1, "label": "Navigate and Use Doors"}, {"value": 2, "label": "Navigate"},
                {"value": 3, "label": "Basic Navigation"}, {"value": 4, "label": "Random"}
            ]
        if fid == "ZombieLore.CrawlUnderVehicle":
            return [
                {"value": 1, "label": "Crawlers Only"}, {"value": 2, "label": "Extremely Rare"},
                {"value": 3, "label": "Rare"}, {"value": 4, "label": "Sometimes"},
                {"value": 5, "label": "Often"}, {"value": 6, "label": "Very Often"}, {"value": 7, "label": "Always"}
            ]
        if fid == "ZombieLore.Memory":
            return [
                {"value": 1, "label": "Long"}, {"value": 2, "label": "Normal"}, {"value": 3, "label": "Short"},
                {"value": 4, "label": "None"}, {"value": 5, "label": "Random"},
                {"value": 6, "label": "Random between Normal and None"}
            ]
        if fid in ["ZombieLore.Sight", "ZombieLore.Hearing"]:
            return [
                {"value": 1, "label": "Eagle/Pinpoint"}, {"value": 2, "label": "Normal"},
                {"value": 3, "label": "Poor"}, {"value": 4, "label": "Random"},
                {"value": 5, "label": "Random between Normal and Poor"}
            ]
        if fid == "ZombieLore.ActiveOnly":
            return [{"value": 1, "label": "Both"}, {"value": 2, "label": "Night"}, {"value": 3, "label": "Day"}]
        if fid == "ZombieLore.DisableFakeDead":
            return [
                {"value": 1, "label": "World Zombies"}, {"value": 2, "label": "World and Combat Zombies"},
                {"value": 3, "label": "Never"}
            ]
        if fid == "ZombieLore.PlayerSpawnZombieRemoval":
            return [
                {"value": 1, "label": "Inside the building and around it"}, {"value": 2, "label": "Inside the building"},
                {"value": 3, "label": "Inside the room"}, {"value": 4, "label": "Zombies can spawn anywhere"}
            ]
        if fid == "GeneratorSpawning":
            return [
                {"value": 1, "label": "Never"}, {"value": 2, "label": "Extremely Rare"},
                {"value": 3, "label": "Very Rare"}, {"value": 4, "label": "Rare"},
                {"value": 5, "label": "Sometimes"}, {"value": 6, "label": "Often"}
            ]
        if fid == "AlarmDecay":
            return [
                {"value": 1, "label": "Instant"}, {"value": 2, "label": "0 - 30 Days"},
                {"value": 3, "label": "0 - 2 Months"}, {"value": 4, "label": "0 - 6 Months"},
                {"value": 5, "label": "0 - 1 Year"}, {"value": 6, "label": "0 - 5 Years"}
            ]
        if fid in ["Alarm", "LockedHouses", "Basement.SpawnFrequency"]:
            return [
                {"value": 1, "label": "Never"}, {"value": 2, "label": "Extremely Rare"},
                {"value": 3, "label": "Rare"}, {"value": 4, "label": "Sometimes"},
                {"value": 5, "label": "Often"}, {"value": 6, "label": "Very Often"}
            ]
        if fid == "FoodRotSpeed":
            return [
                {"value": 1, "label": "Very Fast"}, {"value": 2, "label": "Fast"},
                {"value": 3, "label": "Normal"}, {"value": 4, "label": "Slow"},
                {"value": 5, "label": "Very Slow"}
            ]
        if fid == "FridgeFactor":
            return [
                {"value": 1, "label": "Very Low"}, {"value": 2, "label": "Low"},
                {"value": 3, "label": "Normal"}, {"value": 4, "label": "High"},
                {"value": 5, "label": "Very High"}, {"value": 6, "label": "No decay"}
            ]
        if fid == "NightDarkness":
            return [
                {"value": 1, "label": "Pitch Black"}, {"value": 2, "label": "Dark"},
                {"value": 3, "label": "Normal"}, {"value": 4, "label": "Bright"}
            ]
        if fid == "Temperature":
            return [
                {"value": 1, "label": "Very Cold"}, {"value": 2, "label": "Cold"},
                {"value": 3, "label": "Normal"}, {"value": 4, "label": "Hot"}, {"value": 5, "label": "Very Hot"}
            ]
        if fid == "Rain":
            return [
                {"value": 1, "label": "Very Dry"}, {"value": 2, "label": "Dry"},
                {"value": 3, "label": "Normal"}, {"value": 4, "label": "Rainy"}, {"value": 5, "label": "Very Rainy"}
            ]
        if fid == "MaxFogIntensity":
            return [
                {"value": 1, "label": "Normal"}, {"value": 2, "label": "Moderate"},
                {"value": 3, "label": "Low"}, {"value": 4, "label": "None"}
            ]
        if fid == "MaxRainFxIntensity":
            return [
                {"value": 1, "label": "Normal"}, {"value": 2, "label": "Moderate"}, {"value": 3, "label": "Low"}
            ]
        if fid == "ErosionSpeed":
            return [
                {"value": 1, "label": "Very Fast (20 Days)"}, {"value": 2, "label": "Fast (50 Days)"},
                {"value": 3, "label": "Normal (100 Days)"}, {"value": 4, "label": "Slow (200 Days)"},
                {"value": 5, "label": "Very Slow (500 Days)"}
            ]
        if fid == "CompostTime":
            return [
                {"value": 1, "label": "1 Week"}, {"value": 2, "label": "2 Weeks"}, {"value": 3, "label": "3 Weeks"},
                {"value": 4, "label": "4 Weeks"}, {"value": 5, "label": "6 Weeks"}, {"value": 6, "label": "8 Weeks"},
                {"value": 7, "label": "10 Weeks"}, {"value": 8, "label": "12 Weeks"}
            ]
        if fid in ["FishAbundance", "NatureAbundance"]:
            return [
                {"value": 1, "label": "Very Poor"}, {"value": 2, "label": "Poor"},
                {"value": 3, "label": "Normal"}, {"value": 4, "label": "Abundant"}, {"value": 5, "label": "Very Abundant"}
            ]
        if fid == "PlantResilience":
            return [
                {"value": 1, "label": "Very Low"}, {"value": 2, "label": "Low"},
                {"value": 3, "label": "Normal"}, {"value": 4, "label": "High"}, {"value": 5, "label": "Very High"}
            ]
        if fid == "Helicopter":
            return [
                {"value": 1, "label": "Never"}, {"value": 2, "label": "Once"},
                {"value": 3, "label": "Sometimes"}, {"value": 4, "label": "Often"}
            ]
        if fid in ["MetaEvent", "SleepingEvent"]:
            return [{"value": 1, "label": "Never"}, {"value": 2, "label": "Sometimes"}, {"value": 3, "label": "Often"}]
        if fid in ["SurvivorHouseChance", "VehicleStoryChance", "ZoneStoryChance", "CarAlarm"]:
            return [
                {"value": 1, "label": "Never"}, {"value": 2, "label": "Extremely Rare"}, {"value": 3, "label": "Rare"},
                {"value": 4, "label": "Sometimes"}, {"value": 5, "label": "Often"}, {"value": 6, "label": "Very Often"},
                {"value": 7, "label": "Always Tries"}
            ]
        if fid == "RecentlySurvivorVehicles":
            return [
                {"value": 1, "label": "None"}, {"value": 2, "label": "Low"}, {"value": 3, "label": "Normal"}, {"value": 4, "label": "High"}
            ]
        if fid == "CarSpawnRate":
            return [
                {"value": 1, "label": "None"}, {"value": 2, "label": "Very Low"}, {"value": 3, "label": "Low"}, {"value": 4, "label": "Normal"}, {"value": 5, "label": "High"}
            ]
        if fid == "ChanceHasGas":
            return [
                {"value": 1, "label": "Low"}, {"value": 2, "label": "Normal"}, {"value": 3, "label": "High"}
            ]
        if fid == "InitialGas":
            return [
                {"value": 1, "label": "Very Low"}, {"value": 2, "label": "Low"}, {"value": 3, "label": "Normal"}, {"value": 4, "label": "High"}, {"value": 5, "label": "Very High"}, {"value": 6, "label": "Full"}
            ]
        if fid == "LockedCar":
            return [
                {"value": 1, "label": "Never"}, {"value": 2, "label": "Extremely Rare"}, {"value": 3, "label": "Rare"}, {"value": 4, "label": "Sometimes"}, {"value": 5, "label": "Often"}, {"value": 6, "label": "Very Often"}
            ]
        if fid in ["CarGeneralCondition", "CarDamageOnImpact"]:
            return [
                {"value": 1, "label": "Very Low"}, {"value": 2, "label": "Low"}, {"value": 3, "label": "Normal"}, {"value": 4, "label": "High"}, {"value": 5, "label": "Very High"}
            ]
        if fid == "DamageToPlayerFromHitByACar":
            return [
                {"value": 1, "label": "None"}, {"value": 2, "label": "Low"}, {"value": 3, "label": "Normal"}, {"value": 4, "label": "High"}, {"value": 5, "label": "Very High"}
            ]
        if fid in ["AnimalStatsModifier", "AnimalPregnancyTime", "AnimalAgeModifier", "AnimalMilkIncModifier", "AnimalWoolIncModifier", "AnimalEggHatch"]:
            return [
                {"value": 1, "label": "Ultra Fast"}, {"value": 2, "label": "Very Fast"}, {"value": 3, "label": "Fast"},
                {"value": 4, "label": "Normal"}, {"value": 5, "label": "Slow"}, {"value": 6, "label": "Very Slow"}
            ]
        if fid == "AnimalRanchChance":
            return [
                {"value": 1, "label": "Never"}, {"value": 2, "label": "Extremely Rare"}, {"value": 3, "label": "Rare"},
                {"value": 4, "label": "Sometimes"}, {"value": 5, "label": "Often"}, {"value": 6, "label": "Very Often"},
                {"value": 7, "label": "Always"}
            ]
        if fid in ["AnimalTrackChance", "AnimalPathChance"]:
            return [
                {"value": 1, "label": "Never"}, {"value": 2, "label": "Extremely Rare"}, {"value": 3, "label": "Rare"},
                {"value": 4, "label": "Sometimes"}, {"value": 5, "label": "Often"}, {"value": 6, "label": "Very Often"}
            ]
        if fid == "AnnotatedMapChance":
            return [
                {"value": 1, "label": "Never"}, {"value": 2, "label": "Extremely Rare"}, {"value": 3, "label": "Rare"},
                {"value": 4, "label": "Sometimes"}, {"value": 5, "label": "Often"}, {"value": 6, "label": "Very Often"}
            ]
        if fid == "DecayingCorpseHealthImpact":
            return [
                {"value": 1, "label": "None"}, {"value": 2, "label": "Low"},
                {"value": 3, "label": "Normal"}, {"value": 4, "label": "High"}, {"value": 5, "label": "Insane"}
            ]
        if fid == "BloodLevel":
            return [
                {"value": 1, "label": "None"}, {"value": 2, "label": "Low"},
                {"value": 3, "label": "Normal"}, {"value": 4, "label": "High"}, {"value": 5, "label": "Ultra Gore"}
            ]
        if fid == "MaggotSpawn":
            return [
                {"value": 1, "label": "In and Around Bodies"}, {"value": 2, "label": "In Bodies Only"}, {"value": 3, "label": "Never"}
            ]
        if fid == "MetaKnowledge":
            return [
                {"value": 1, "label": "Fully revealed"}, {"value": 2, "label": "Shown as ???"}, {"value": 3, "label": "Completely hidden"}
            ]
        if fid == "DayNightCycle":
            return [{"value": 1, "label": "Normal"}, {"value": 2, "label": "Endless Day"}, {"value": 3, "label": "Endless Night"}]
        if fid == "ClimateCycle":
            return [
                {"value": 1, "label": "Normal"}, {"value": 2, "label": "No Weather"}, {"value": 3, "label": "Endless Rain"},
                {"value": 4, "label": "Endless Storm"}, {"value": 5, "label": "Endless Snow"}, {"value": 6, "label": "Endless Blizzard"}
            ]
        if fid == "FogCycle":
            return [{"value": 1, "label": "Normal"}, {"value": 2, "label": "No Fog"}, {"value": 3, "label": "Endless Fog"}]

        if fid == "StatsDecrease":
            return [
                {"value": 1, "label": "Very Fast"}, {"value": 2, "label": "Fast"},
                {"value": 3, "label": "Normal"}, {"value": 4, "label": "Slow"},
                {"value": 5, "label": "Very Slow"}
            ]
        if fid == "EndRegen":
            return [
                {"value": 1, "label": "Very Fast"}, {"value": 2, "label": "Fast"},
                {"value": 3, "label": "Normal"}, {"value": 4, "label": "Slow"},
                {"value": 5, "label": "Very Slow"}
            ]
        if fid == "ConstructionBonusPoints":
            return [
                {"value": 1, "label": "Very Low"}, {"value": 2, "label": "Low"},
                {"value": 3, "label": "Normal"}, {"value": 4, "label": "High"},
                {"value": 5, "label": "Very High"}
            ]
        if fid == "InjurySeverity":
            return [
                {"value": 1, "label": "Low"}, {"value": 2, "label": "Normal"},
                {"value": 3, "label": "High"}
            ]
        if fid == "ClothingDegradation":
            return [
                {"value": 1, "label": "Disabled"}, {"value": 2, "label": "Slow"},
                {"value": 3, "label": "Normal"}, {"value": 4, "label": "Fast"}
            ]
        if fid == "RearVulnerability":
            return [
                {"value": 1, "label": "Disabled"}, {"value": 2, "label": "Low"},
                {"value": 3, "label": "High"}
            ]
        if fid == "FirearmUseDamageChance":
            return [
                {"value": 1, "label": "Disabled"}, {"value": 2, "label": "Zombies only"},
                {"value": 3, "label": "All types of target"}
            ]
        if fid == "EnablePoisoning":
            return [
                {"value": 1, "label": "True"}, {"value": 2, "label": "False"},
                {"value": 3, "label": "Only bleach poisoning is disabled"}
            ]
        if fid == "NegativeTraitsPenalty":
            return [
                {"value": 1, "label": "None"},
                {"value": 2, "label": "1 point penalty for every 3 negative traits selected"},
                {"value": 3, "label": "1 point penalty for every 2 negative traits selected"},
                {"value": 4, "label": "1 point penalty for every negative trait selected after the first"}
            ]
        return None

    def update_vars(self, new_vars: dict):
        if not os.path.exists(self.lua_path):
            return False

        with open(self.lua_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        new_lines = []
        kv_pattern = re.compile(r"^(\s*)(\w+)(\s*=\s*)(.*),")
        table_start_pattern = re.compile(r"^\s*(\w+)\s*=\s*{")
        table_end_pattern = re.compile(r"^\s*},")
        
        current_table = None
        
        for line in lines:
            # Table tracking
            ts_match = table_start_pattern.match(line)
            if ts_match:
                current_table = ts_match.group(1)
                new_lines.append(line)
                continue
            
            if current_table and table_end_pattern.match(line):
                current_table = None
                new_lines.append(line)
                continue

            match = kv_pattern.search(line)
            if match:
                indent = match.group(1)
                key = match.group(2)
                eq = match.group(3)
                value_raw = match.group(4).strip()
                
                # Composite key check
                if current_table and current_table != "SandboxVars":
                    full_key = f"{current_table}.{key}"
                else:
                    full_key = key
                
                if full_key in new_vars:
                    val = new_vars[full_key]
                    
                    # 1. Coerce strings to types if they look like numbers/bools and are expected
                    if isinstance(val, str):
                        clean_val = val.strip().lower()
                        if clean_val == "true": val = True
                        elif clean_val == "false": val = False
                        else:
                            try:
                                # If it can be a number, make it a number for logic below
                                if "." in val: val = float(val)
                                else: val = int(val)
                            except:
                                pass # Keep as string if not a number

                    # 2. Robust Detection: Original had dot OR is known to be float
                    original_is_float = "." in value_raw or self._is_float_field(full_key)
                    
                    if isinstance(val, bool):
                        val_str = "true" if val else "false"
                    elif original_is_float:
                        # Force decimal even if it's a whole number
                        try:
                            f_val = float(val)
                            # Ensure at least one decimal point
                            if f_val == int(f_val):
                                val_str = f"{f_val:.1f}"
                            else:
                                val_str = str(f_val)
                        except:
                            val_str = str(val)
                    elif isinstance(val, (int, float)):
                        # If it wasn't a float originaly, keep as int
                        val_str = str(int(float(val)))
                    elif isinstance(val, str):
                        # Genuinely a string value
                        val_str = f'"{val}"'
                    else:
                        val_str = str(val)
                    
                    new_lines.append(f"{indent}{key}{eq}{val_str},\n")
                else:
                    new_lines.append(line)
            else:
                new_lines.append(line)

        with open(self.lua_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        
        return True
