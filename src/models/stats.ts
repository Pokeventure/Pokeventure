import { model, Schema } from "mongoose";
import { } from "../types/game";

const statsSchema = new Schema({
    discord_id: String,
    stats: {
        type: Object,
        default: {}
    },
});

export const Stats = model('Stats', statsSchema);