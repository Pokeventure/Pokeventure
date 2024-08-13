import { Pokemon } from "../models/pokemon";
import { Clan } from "../models/clan";
import { Team } from "../models/team";

export interface IEncounter {
    type: string;
}

export interface IPokemon {
    dexId: number;
    fav: boolean;
    nickname?: string;
    moves: any;
    level: number;
    fainted?: boolean;
    fighting?: boolean;
    timeout?: any;
    experience: number;
    shiny: boolean;
    ivs: {
        hp: number;
        atk: number;
        def: number;
        spa: number;
        spd: number;
        spe: number;
    };
    rarity: number;
    owner: string;
    firstOwner: string;
    special?: string;
    forme?: string;
    evolutionLock?: boolean;
    item?: string;
    luckyEgg?: boolean;
    nature: string;
    abilitySlot: string;
    gender: string;
    location?: string;
    mint?: number;
    locked?: boolean;
    friendship: number;
    uniqueId?: string;
    lastFeed?: Date;
    number?: number;
}

export interface ITrainer extends IEncounter {
    type: "trainer";
    name: string;
    pokemons: number[];
    sprite: string;
    reward: number[];
    odds: number[];
    money: number;
}

export interface IPlayer {
    discord_id: string;
    selectedPokemon: Pokemon;
    location: number;
    reward: number;
    money: {
        coins: number,
        gems: number,
        tickets: number
    };
    quests: any;
    rarityScanner: Date;
    shinyScanner: Date;
    premiumRarityScanner: number;
    premiumShinyScanner: number;
    event: boolean;
    sort: object;
    patronLevel: number;
    pokemonReward?: boolean;
    voted: any;
    voteStreak: number;
    remindVote: boolean;
    selectedTeam: Team | null;
    tradeLocked: boolean;
    clan: Clan | undefined | null;
    research: any;
    started_at: Date;
}

export interface PokemonSpecies {
    mega?: boolean;
    dexId: number;
    name: string;
    displayName: string;
    base_experience: number;
    types: string[];
    evolutions: any[];
    height: number;
    weight: number;
    gender: any;
    genderRatio: any;
    forme?: any;
    location?: any;
}
