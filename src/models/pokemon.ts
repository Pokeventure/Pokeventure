import { Schema, model, Document } from 'mongoose';
import { IPokemon } from '../types/pokemon';

const pokemonSchema = new Schema<IPokemon>({
    dexId: {
        type: Number,
        require: true,
        default: 1,
        index: true,
    },
    owner: {
        type: String,
        index: true,
    },
    firstOwner: String,
    nickname: String,
    level: Number,
    shiny: Boolean,
    moves: [String],
    ivs: {
        hp: Number,
        atk: Number,
        def: Number,
        spa: Number,
        spd: Number,
        spe: Number,
    },
    rarity: Number,
    fav: {
        type: Boolean,
        default: false,
    },
    special: String,
    forme: String,
    nature: String,
    abilitySlot: String,
    gender: String,
    item: String,
    experience: Number,
    mint: {
        type: Number,
        default: 0,
    },
    evolutionLock: Boolean,
    luckyEgg: {
        type: Boolean,
        default: false,
    },
    locked: {
        type: Boolean,
        default: false,
    },
    uniqueId: {
        type: String,
        index: true,
    },
    friendship: {
        type: Number,
        default: 0,
    },
    lastFeed: Date,
});

export const Pokemon = model<IPokemon>('Pokemon', pokemonSchema);
export type Pokemon = IPokemon & Document;