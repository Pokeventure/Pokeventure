import { Schema, model } from "mongoose";

const clanRaidLogSchema = new Schema({
    discord_id: String,
    raid: Schema.Types.ObjectId,
    damageDealt: {
        type: Number,
        index: true,
    },
    hits: Number,
    pokemonData: Object,
    ok: Boolean,
});

export const ClanRaidLog = model("ClanRaidLog", clanRaidLogSchema, "clan_raid_log");