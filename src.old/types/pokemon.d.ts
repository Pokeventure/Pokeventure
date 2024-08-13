export interface Encounter {
    type: string;
}

export interface Pokemon extends Encounter {
    type: 'pokemon';
    _id: string;
    dexId: number;
    fav: boolean;
    name: string;
    nickname?: string;
    displayName: string;
    moves: any;
    level: number;
    fainted: boolean;
    fighting: boolean;
    timeout: any;
    experience: number;
    shiny: boolean;
    ivs: any;
    rarity: number;
    owner?: string;
    firstOwner?: string;
    special: any;
    forme?: any;
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
}

export interface Trainer extends Encounter {
    type: 'trainer';
    name: string;
    pokemons: number[];
    sprite: string;
    reward: number[];
    odds: number[];
    money: number;
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

export interface Player {
    selectedPokemon: any;
    location: number;
    reward: number;
    money: any;
    quests: any;
    rarityScanner: any;
    shinyScanner: any;
    premiumRarityScanner: any;
    premiumShinyScanner: any;
    event: boolean;
    sort: string;
    patronLevel: number;
    pokemonReward?: boolean;
    voted: any;
    voteStreak: number;
    remindVote: boolean;
    selectedTeam: any;
    tradeLocked: boolean;
    clan: any;
    research: any;
}

export interface Names {
    [key: string]: string
}

export interface Location {
    id: number;
    names: Names;
}