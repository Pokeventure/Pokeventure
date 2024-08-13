import { Schema, model, Document } from 'mongoose';
import { IClan } from '../types/game';

const clanSchema = new Schema<IClan>({
    name: String,
    balance: {
        type: Number,
        default: 0,
    },
    owner: String,
    experience: {
        type: Number,
        default: 0,
    },
    banner: String,
    logo: String,
    motd: {
        type: String,
        default: "",
    },
    color: {
        type: String,
        default: "#000000",
    },
    perks: {
        type: Object,
        default: {},
    },
    channel: {
        type: String,
        default: "",
    },
    dojoPoints: {
        type: Number,
        default: 0,
    },
    ranking: {
        type: Number,
        default: 0,
    },
    rewards: {
        type: Object,
        default: {},
    }
});

export const Clan = model('Clan', clanSchema, 'clans');
export type Clan = IClan & Document;