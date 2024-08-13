import { IPokemon, ITrainer } from '../types/pokemon';
import { Chance } from 'chance';
// import { updatePlayer } from './database';
import {
    getPokemon, getMoves, getAbilities,
} from './pokedex';
import { getRndInteger } from './utils';
import event from '../../data/event';
import Logger from './logger';

const fs = require('fs');

const regions: any[] = [];
const locations: any[] = [];
let currentEvent: any = null;
let encounters: number[] = [];

export function initializeWorld() {
    Logger.info('Loading world...');
    const regionsFiles = fs.readdirSync('./data/regions');

    for (const i in regionsFiles) {
        const content = fs.readFileSync(`./data/regions/${regionsFiles[i]}`, 'utf8');
        const region = JSON.parse(content);
        regions[region.id] = region;
    }

    const locationsFiles = fs.readdirSync('./data/locations/');
    for (const i in locationsFiles) {
        const content = fs.readFileSync(`./data/locations/${locationsFiles[i]}`, 'utf8');
        const location = JSON.parse(content);
        locations[location.id] = location;
        if (location.event === undefined) {
            encounters = encounters.concat(location.encounters.map((x: any) => x.id));
        }
    }

    currentEvent = event;

    Logger.info('World loaded');
}

export function getLocations(): any[] {
    return locations;
}

function getPokemonLocation(id: number, forme: any) {
    for (let i = 0; i < locations.length; i++) {
        if (locations[i].encounters.find((x: any) => x.id === id && ((forme === undefined && x.special === null) || (forme !== undefined && x.special === forme)))) {
            return locations[i].name;
        }
    }
    return undefined;
}

function generateRarity(forceMinRarity = 0, forceMaxRarity = 5, betterRarityOdds = 0) {
    const chance = new Chance();

    const chances = [0, 1, 2, 3, 4, 5].filter((x) => x >= forceMinRarity && x <= forceMaxRarity);
    const weights = [700, 500, 300, 250, 100, 1].slice(forceMinRarity, forceMaxRarity + 1);

    let rarity = chance.weighted(chances, weights);

    if (betterRarityOdds > 0) {
        if (chance.weighted([true, false], [betterRarityOdds, 100 - betterRarityOdds])) {
            if (rarity < 5) {
                rarity += 1;
            }
        }
    }

    const ivs = [31, 31, 31, 31, 31, 31];
    // sumOfIvs >= 186 pokemonIvRarity = 5;
    // sumOfIvs >= 150 pokemonIvRarity = 4;
    // sumOfIvs >= 100 pokemonIvRarity = 3;
    // sumOfIvs >= 60 pokemonIvRarity = 2;
    // sumOfIvs >= 45 pokemonIvRarity = 1;
    // pokemonIvRarity = 0;

    if (rarity === 5) {
        // 0 to remove
    } else if (rarity === 4) {
        const numberToRemove = chance.integer({ min: 1, max: 36 });
        for (let i = 0; i < numberToRemove; i++) {
            const toRemove = chance.weighted([0, 1, 2, 3, 4, 5], [ivs[0] === 0 ? 0 : 1, ivs[1] === 0 ? 0 : 1, ivs[2] === 0 ? 0 : 1, ivs[3] === 0 ? 0 : 1, ivs[4] === 0 ? 0 : 1, ivs[5] === 0 ? 0 : 1]);
            ivs[toRemove]--;
        }
        // min 1
        // max 36 to remove
    } else if (rarity === 3) {
        const numberToRemove = chance.integer({ min: 37, max: 86 });
        for (let i = 0; i < numberToRemove; i++) {
            const toRemove = chance.weighted([0, 1, 2, 3, 4, 5], [ivs[0] === 0 ? 0 : 1, ivs[1] === 0 ? 0 : 1, ivs[2] === 0 ? 0 : 1, ivs[3] === 0 ? 0 : 1, ivs[4] === 0 ? 0 : 1, ivs[5] === 0 ? 0 : 1]);
            ivs[toRemove]--;
        }
        // min 37
        // max 86 to remove
    } else if (rarity === 2) {
        const numberToRemove = chance.integer({ min: 87, max: 126 });
        for (let i = 0; i < numberToRemove; i++) {
            const toRemove = chance.weighted([0, 1, 2, 3, 4, 5], [ivs[0] === 0 ? 0 : 1, ivs[1] === 0 ? 0 : 1, ivs[2] === 0 ? 0 : 1, ivs[3] === 0 ? 0 : 1, ivs[4] === 0 ? 0 : 1, ivs[5] === 0 ? 0 : 1]);
            ivs[toRemove]--;
        }
        // min 87
        // max 126 to remove
    } else if (rarity === 1) {
        const numberToRemove = chance.integer({ min: 127, max: 141 });
        for (let i = 0; i < numberToRemove; i++) {
            const toRemove = chance.weighted([0, 1, 2, 3, 4, 5], [ivs[0] === 0 ? 0 : 1, ivs[1] === 0 ? 0 : 1, ivs[2] === 0 ? 0 : 1, ivs[3] === 0 ? 0 : 1, ivs[4] === 0 ? 0 : 1, ivs[5] === 0 ? 0 : 1]);
            ivs[toRemove]--;
        }
        // min 127
        // max 141 to remove
    } else if (rarity === 0) {
        const numberToRemove = chance.integer({ min: 142, max: 186 });
        for (let i = 0; i < numberToRemove; i++) {
            const toRemove = chance.weighted([0, 1, 2, 3, 4, 5], [ivs[0] === 0 ? 0 : 1, ivs[1] === 0 ? 0 : 1, ivs[2] === 0 ? 0 : 1, ivs[3] === 0 ? 0 : 1, ivs[4] === 0 ? 0 : 1, ivs[5] === 0 ? 0 : 1]);
            ivs[toRemove]--;
        }
        // min 142
        // max 186
    }

    return {
        rarity,
        ivs: {
            hp: ivs[0],
            atk: ivs[1],
            def: ivs[2],
            spa: ivs[3],
            spd: ivs[4],
            spe: ivs[5],
        },
    };
}

function randomPokemon(id: number, level: number, bannedMoves: any[] = [], shinyChance = 1, special?: string | undefined, forceMinRarity = 0, forme?: string | undefined, strongMoveOnly?: boolean, betterRarityOdds: number = 0): IPokemon {
    const moves: string[] = [];
    let moveset = getMoves(id, special).filter((x: any) => x.level >= 0 && x.level <= level && !bannedMoves.includes(x.move));
    if (strongMoveOnly) {
        moveset = moveset.filter((x: any) => (x.category === 'Special' || x.category === 'Physical') && x.power >= 50);
    }
    const movesetCount = moveset.length;
    for (let i = 0; i < Math.min(4, movesetCount); i++) {
        moves.push(moveset.splice(getRndInteger(0, moveset.length), 1)[0].move);
    }

    const { rarity, ivs } = generateRarity(forceMinRarity, 5, betterRarityOdds);

    const pokemon = getPokemon(id, special);

    let gender = 'N';
    const chance = new Chance();
    if (pokemon.gender !== undefined) {
        gender = pokemon.gender;
    } else if (pokemon.genderRatio === undefined) {
        gender = chance.weighted(['M', 'F'], [50, 50]);
    } else {
        gender = chance.weighted(['M', 'F'], [pokemon.genderRatio.M * 100, pokemon.genderRatio.F * 100]);
    }

    const ability = randomAbility(id, special);

    return {
        fav: false,
        fainted: false,
        fighting: false,
        timeout: null,
        experience: 0,
        ...pokemon,
        moves,
        level,
        shiny: getRndInteger(0, 1000) <= shinyChance,
        ivs,
        rarity,
        special,
        forme,
        nature: randomNature(),
        abilitySlot: ability.slot,
        gender,
        friendship: 0,
        owner: '',
        firstOwner: ''
    };
}

function randomNature(): string {
    const nature: string[] = ['Bold', 'Quirky', 'Brave', 'Calm', 'Quiet', 'Docile', 'Mild', 'Rash', 'Gentle', 'Hardy', 'Jolly', 'Lax', 'Impish', 'Sassy', 'Naughty', 'Modest', 'Naive', 'Hasty', 'Careful', 'Bashful', 'Relaxed', 'Adamant', 'Serious', 'Lonely', 'Timid'];
    const chance = new Chance();

    return chance.pickset(nature, 1)[0];
}

function randomAbility(name: string | number, special: any) {
    const abilities = getAbilities(name, special);
    const pick = ['0'];

    if (abilities['1'] !== undefined) {
        pick.push('1');
    }
    if (abilities.H) {
        pick.push('H');
    }

    if (pick.length === 1) {
        return { slot: '0', ability: abilities['0'] };
    }

    const chance = new Chance();
    const result = chance.pickset(pick, 1)[0];

    return { slot: result, ability: abilities[result] };
}

export function generateEncounter(location: number, level: number, shinyChance: number = 1, enableEvent: boolean = false, betterRarityOdds: number = 0): IPokemon | null {
    let { encounters } = locations[location];
    if (encounters === undefined || encounters.length === 0) {
        return null;
    }

    const chance = new Chance();
    const rarity = chance.integer({ min: 0, max: 10000 });
    let rarityLevel = 0;
    if (rarity >= 9995) {
        rarityLevel = 4;
    } else if (rarity >= 9700) {
        rarityLevel = 3;
    } else if (rarity >= 8700) {
        rarityLevel = 2;
    } else if (rarity >= 5000) {
        rarityLevel = 1;
    } else {
        rarityLevel = 0;
    }

    // Event random
    if (currentEvent.rateup && enableEvent && new Date() >= new Date(currentEvent.startDate) && new Date() < new Date(currentEvent.endDate)) {
        if (chance.integer({ min: 0, max: currentEvent.pokemonChance }) === 0) {
            const eventSpawn: any = chance.weighted(<any>currentEvent.pokemonRateUp[0], <any>currentEvent.pokemonRateUp[1]);

            const randomLevel = getRndInteger(1, Math.min(level + 5, 75));
            return randomPokemon(eventSpawn, randomLevel, [], 1, undefined, 0, currentEvent.pokemonRateUpForme);
        }
    }

    const filteredEncounters = encounters.filter((x: any) => x.rarity === rarityLevel);
    if (filteredEncounters.length === 0) {
        encounters = encounters.filter((x: any) => x.rarity === 0);
    } else {
        encounters = filteredEncounters;
    }

    if (encounters.length === 0) { return null; }

    const rand = getRndInteger(0, encounters.length);

    const randomLevel = getRndInteger(1, Math.min(level + 5, 75));

    // Trainer
    /* if (encounters[rand].trainer) {
        let trainer: ITrainer = {
            type: 'trainer',
            name: encounters[rand].name,
            pokemons: encounters[rand].pokemons,
            sprite: encounters[rand].sprite,
            reward: encounters[rand].drops,
            odds: encounters[rand].odds,
            money: encounters[rand].money,
        };
        return trainer;
    } */

    let special: any = null;
    if (encounters[rand].fospecialrme !== null) {
        if (Array.isArray(encounters[rand].special)) {
            special = chance.pickset(encounters[rand].special, 1)[0];
        } else {
            special = encounters[rand].special;
        }
    }

    // Pokemon
    let forme: any = null;
    if (encounters[rand].forme !== null) {
        if (Array.isArray(encounters[rand].forme)) {
            forme = chance.pickset(encounters[rand].forme, 1)[0];
        } else {
            forme = encounters[rand].forme;
        }
    }

    return randomPokemon(encounters[rand].id, randomLevel, [], shinyChance, special, 0, forme, false, betterRarityOdds);
}

function getLocation(location: number) {
    if (locations[location] !== undefined) {
        return locations[location];
    }
    return null;
}

function move(discord_id: string, destination: number) {
    return new Promise((resolve) => {
        /* resolve(updatePlayer(discord_id, {
            location: destination,
        })); */
    });
}

function getRegion(regionId: number) {
    return regions[regionId];
}

export {
    getLocation, move, getRegion, randomPokemon, getPokemonLocation, generateRarity, randomNature, encounters
};
