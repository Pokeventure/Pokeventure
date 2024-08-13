import { Schema, model } from "mongoose";
import { Pokemon } from "./pokemon";
import { IMegaRaid } from "../types/game";

export const megaRaidSchema = new Schema<IMegaRaid>({
    hp: {
        type: Number,
        default: 999999999,
    },
    maxHp: {
        type: Number,
        default: 999999999,
    },
    pokemon: {
        type: Pokemon.schema,
    },
    time: {
        type: Date,
        index: true,
        required: false
    },
    drop: Number,
});

export const MegaRaid = model<IMegaRaid>("MegaRaid", megaRaidSchema, "mega_raid");
export type MegaRaid = IMegaRaid & Document;