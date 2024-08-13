import { model, Schema, Document } from "mongoose";
import { IRaid } from "../types/game";
import { Pokemon } from "./pokemon";

const raidSchema = new Schema<IRaid>({
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
});

export const Raid = model<IRaid>("Raid", raidSchema);
export type Raid = IRaid & Document;