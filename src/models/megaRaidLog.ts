import { model, Schema } from "mongoose";

const megaRaidLogSchema = new Schema({
    discord_id: String,
    raid: Schema.Types.ObjectId,
    damageDealt: {
        type: Number,
        index: true,
        default: 0,
    },
    hits: Number,
    pokemonData: Object,
    ok: {
        type: Boolean,
        default: false,
    },
});

export const MegaRaidLog = model("MegaRaidLog", megaRaidLogSchema, "mega_raid_log");