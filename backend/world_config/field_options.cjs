/**
 * Project Zomboid Field Options
 * Defines dropdown options for various configuration fields.
 */

const lootOptions = [
    { value: 1, label: "None" }, { value: 2, label: "Extremely Rare" }, { value: 3, label: "Very Rare" },
    { value: 4, label: "Rare" }, { value: 5, label: "Sometimes" }, { value: 6, label: "Often" }, { value: 7, label: "Abundant" }
];

const frequencyOptions = [
    { value: 1, label: "Never" }, { value: 2, label: "Extremely Rare" }, { value: 3, label: "Very Rare" },
    { value: 4, label: "Rare" }, { value: 5, label: "Sometimes" }, { value: 6, label: "Often" }
];

const shutoffOptions = [
    { value: -1, label: "Instant" }, { value: 0, label: "0-30 days" }, { value: 30, label: "0-2 months" },
    { value: 180, label: "0-6 months" }, { value: 360, label: "0-1 year" }, { value: 1800, label: "0-5 years" }, { value: 2147483647, label: "Never" }
];

const rarityOptions = [
    { value: 1, label: "Never" }, { value: 2, label: "Extremely Rare" }, { value: 3, label: "Rare" }, 
    { value: 4, label: "Sometimes" }, { value: 5, label: "Often" }, { value: 6, label: "Very Often" }, { value: 7, label: "Always Tries" }
];

const basicIntensityOptions = [
    { value: 1, label: "Normal" }, { value: 2, label: "Moderate" }, { value: 3, label: "Low" }, { value: 4, label: "None" }
];

module.exports = {
    getOptionsForField(fid) {
        if (fid === "DayLength") {
            const labels = [
                "15 Minutes", "30 Minutes", "1 Hour", "1 Hour, 30 Minutes",
                "2 Hours", "3 Hours", "4 Hours", "5 Hours", "6 Hours",
                "7 Hours", "8 Hours", "9 Hours", "10 Hours", "11 Hours",
                "12 Hours", "13 Hours", "14 Hours", "15 Hours", "16 Hours",
                "17 Hours", "18 Hours", "19 Hours", "20 Hours", "21 Hours",
                "22 Hours", "23 Hours"
            ];
            const opts = labels.map((l, i) => ({ value: i + 1, label: l }));
            opts.push({ value: 27, label: "Real-time" });
            return opts;
        }

        if (fid === "StartTime") {
            return [
                { value: 1, label: "7 AM" }, { value: 2, label: "9 AM" }, { value: 3, label: "12 PM" },
                { value: 4, label: "2 PM" }, { value: 5, label: "5 PM" }, { value: 6, label: "9 PM" },
                { value: 7, label: "12 AM" }, { value: 8, label: "2 AM" }, { value: 9, label: "5 AM" }
            ];
        }

        if (["TimeSinceApo", "StartYear"].includes(fid)) {
            return Array.from({ length: 13 }, (_, i) => ({ value: i, label: i.toString() }));
        }

        if (fid === "StartDay") {
            return Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: (i + 1).toString() }));
        }

        if (fid === "StartMonth") {
            return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => ({ value: i + 1, label: m }));
        }

        if (fid === "Zombies") return [{ value: 1, label: "Insane" }, { value: 2, label: "Very High" }, { value: 3, label: "High" }, { value: 4, label: "Normal" }, { value: 5, label: "Low" }, { value: 6, label: "None" }];
        if (fid === "Distribution") return [{ value: 1, label: "Urban Focused" }, { value: 2, label: "Uniform" }];
        if (fid === "ZombieRespawn") return [{ value: 1, label: "High" }, { value: 2, label: "Normal" }, { value: 3, label: "Low" }, { value: 4, label: "None" }];
        if (fid === "ZombieLore.Speed") return [{ value: 1, label: "Sprinters" }, { value: 2, label: "Fast Shamblers" }, { value: 3, label: "Shamblers" }, { value: 4, label: "Random" }];
        if (fid === "ZombieLore.Transmission") return [{ value: 1, label: "Blood and Saliva" }, { value: 2, label: "Saliva Only" }, { value: 3, label: "Everyone's Infected" }, { value: 4, label: "None" }];
        if (fid === "ZombieLore.Mortality") return [{ value: 1, label: "Instant" }, { value: 2, label: "0-30 Seconds" }, { value: 3, label: "0-1 Minutes" }, { value: 4, label: "0-12 Hours" }, { value: 5, label: "2-3 Days" }, { value: 6, label: "1-2 Weeks" }, { value: 7, label: "Never" }];
        if (fid === "ZombieLore.Cognition") return [{ value: 1, label: "Navigate and Use Doors" }, { value: 2, label: "Navigate" }, { value: 3, label: "Basic Navigation" }, { value: 4, label: "Random" }];
        
        // Only apply loot options to actual rarity settings (integers)
        const isRarityLoot = fid === "GeneratorSpawning"; 
        
        if (isRarityLoot) return lootOptions;
        if (fid === "Alarm" || fid === "LockedHouses" || fid === "Basement.SpawnFrequency") return frequencyOptions;
        if (fid === "WaterShutModifier" || fid === "ElecShutModifier") return shutoffOptions;

        // Livestock / Animals Options
        const animalOptions = [
            { value: 1, label: "Ultra Fast" }, { value: 2, label: "Very Fast" }, { value: 3, label: "Fast" },
            { value: 4, label: "Normal" }, { value: 5, label: "Slow" }, { value: 6, label: "Very Slow" }
        ];

        if ([
            "AnimalStatsModifier", "AnimalPregnancyTime", "AnimalAgeModifier", 
            "AnimalMilkIncModifier", "AnimalWoolIncModifier", "AnimalEggHatch"
        ].includes(fid)) return animalOptions;

        if (fid === "AnimalRanchChance") return [
            ...rarityOptions.slice(0, 6),
            { value: 7, label: "Always" }
        ];

        if (fid === "AnimalTrackChance" || fid === "AnimalPathChance") return rarityOptions;
        
        if (fid === "NightDarkness") return [{ value: 1, label: "Pitch Black" }, { value: 2, label: "Dark" }, { value: 3, label: "Normal" }, { value: 4, label: "Bright" }];
        if (fid === "Temperature") return [{ value: 1, label: "Very Cold" }, { value: 2, label: "Cold" }, { value: 3, label: "Normal" }, { value: 4, label: "Hot" }, { value: 5, label: "Very Hot" }];
        if (fid === "Rain") return [{ value: 1, label: "Very Dry" }, { value: 2, label: "Dry" }, { value: 3, label: "Normal" }, { value: 4, label: "Rainy" }, { value: 5, label: "Very Rainy" }];
        if (fid === "MaxFogIntensity") return basicIntensityOptions;
        if (fid === "MaxRainFxIntensity") return [{ value: 1, label: "Normal" }, { value: 2, label: "Moderate" }, { value: 3, label: "Low" }];
        if (fid === "ErosionSpeed") return [{ value: 1, label: "Very Fast (20 Days)" }, { value: 2, label: "Fast (50 Days)" }, { value: 3, label: "Normal (100 Days)" }, { value: 4, label: "Slow (200 Days)" }, { value: 5, label: "Very Slow (500 Days)" }];
        if (fid === "CompostTime") return [{ value: 1, label: "1 Week" }, { value: 2, label: "2 Weeks" }, { value: 3, label: "3 Weeks" }, { value: 4, label: "4 Weeks" }, { value: 5, label: "6 Weeks" }, { value: 6, label: "8 Weeks" }, { value: 7, label: "10 Weeks" }, { value: 8, label: "12 Weeks" }];
        if (fid === "FishAbundance" || fid === "NatureAbundance") return [{ value: 1, label: "Very Poor" }, { value: 2, label: "Poor" }, { value: 3, label: "Normal" }, { value: 4, label: "Abundant" }, { value: 5, label: "Very Abundant" }];
        if (fid === "PlantResilience") return [{ value: 1, label: "Very Low" }, { value: 2, label: "Low" }, { value: 3, label: "Normal" }, { value: 4, label: "High" }, { value: 5, label: "Very High" }];
        if (fid === "Helicopter") return [{ value: 1, label: "Never" }, { value: 2, label: "Once" }, { value: 3, label: "Sometimes" }, { value: 4, label: "Often" }];
        if (fid === "MetaEvent" || fid === "SleepingEvent") return [{ value: 1, label: "Never" }, { value: 2, label: "Sometimes" }, { value: 3, label: "Often" }];
        
        if (["SurvivorHouseChance", "VehicleStoryChance", "ZoneStoryChance", "CarAlarm", "AnnotatedMapChance"].includes(fid)) return rarityOptions;
        
        if (fid === "RecentlySurvivorVehicles") return [{ value: 1, label: "None" }, { value: 2, label: "Low" }, { value: 3, label: "Normal" }, { value: 4, label: "High" }];
        if (fid === "CarSpawnRate") return [{ value: 1, label: "None" }, { value: 2, label: "Very Low" }, { value: 3, label: "Low" }, { value: 4, label: "Normal" }, { value: 5, label: "High" }];
        if (fid === "ChanceHasGas") return [{ value: 1, label: "Low" }, { value: 2, label: "Normal" }, { value: 3, label: "High" }];
        if (fid === "InitialGas") return [{ value: 1, label: "Very Low" }, { value: 2, label: "Low" }, { value: 3, label: "Normal" }, { value: 4, label: "High" }, { value: 5, label: "Very High" }, { value: 6, label: "Full" }];
        if (fid === "LockedCar") return frequencyOptions;
        if (fid === "CarGeneralCondition" || fid === "CarDamageOnImpact" || fid === "DamageToPlayerFromHitByACar") return [{ value: 1, label: "Very Low" }, { value: 2, label: "Low" }, { value: 3, label: "Normal" }, { value: 4, label: "High" }, { value: 5, label: "Very High" }];
        if (fid === "MaggotSpawn") return [{ value: 1, label: "In and Around Bodies" }, { value: 2, label: "In Bodies Only" }, { value: 3, label: "Never" }];
        if (fid === "MetaKnowledge") return [{ value: 1, label: "Fully revealed" }, { value: 2, label: "Shown as ???" }, { value: 3, label: "Completely hidden" }];
        if (fid === "DayNightCycle") return [{ value: 1, label: "Normal" }, { value: 2, label: "Endless Day" }, { value: 3, label: "Endless Night" }];
        if (fid === "ClimateCycle") return [{ value: 1, label: "Normal" }, { value: 2, label: "No Weather" }, { value: 3, label: "Endless Rain" }, { value: 4, label: "Endless Storm" }, { value: 5, label: "Endless Snow" }, { value: 6, label: "Endless Blizzard" }];
        if (fid === "FogCycle") return [{ value: 1, label: "Normal" }, { value: 2, label: "No Fog" }, { value: 3, label: "Endless Fog" }];
        if (fid === "StatsDecrease" || fid === "EndRegen") return [{ value: 1, label: "Very Fast" }, { value: 2, label: "Fast" }, { value: 3, label: "Normal" }, { value: 4, label: "Slow" }, { value: 5, label: "Very Slow" }];
        if (fid === "ConstructionBonusPoints") return [{ value: 1, label: "Very Low" }, { value: 2, label: "Low" }, { value: 3, label: "Normal" }, { value: 4, label: "High" }, { value: 5, label: "Very High" }];
        if (fid === "InjurySeverity") return [{ value: 1, label: "Low" }, { value: 2, label: "Normal" }, { value: 3, label: "High" }];
        if (fid === "ClothingDegradation") return [{ value: 1, label: "Disabled" }, { value: 2, label: "Slow" }, { value: 3, label: "Normal" }, { value: 4, label: "Fast" }];
        if (fid === "RearVulnerability") return [{ value: 1, label: "Disabled" }, { value: 2, label: "Low" }, { value: 3, label: "High" }];
        if (fid === "FirearmUseDamageChance") return [{ value: 1, label: "Disabled" }, { value: 2, label: "Zombies only" }, { value: 3, label: "All types of target" }];
        if (fid === "EnablePoisoning") return [{ value: 1, label: "True" }, { value: 2, label: "False" }, { value: 3, label: "Only bleach poisoning is disabled" }];
        if (fid === "NegativeTraitsPenalty") return [
            { value: 1, label: "None" },
            { value: 2, label: "1 point penalty for every 3 negative traits selected" },
            { value: 3, label: "1 point penalty for every 2 negative traits selected" },
            { value: 4, label: "1 point penalty for every negative trait selected after the first" }
        ];

        return null;
    }
};
