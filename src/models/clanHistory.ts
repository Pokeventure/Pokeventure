import moment from "moment";
import { ObjectId } from "mongodb";
import { Schema, model } from "mongoose";

const clanSchema = new Schema({
    discord_id: String,
    clan: {
        type: Schema.Types.ObjectId,
    },
    experience: {
        type: Number,
        default: 0,
    },
    coins: {
        type: Number,
        default: 0,
    },
    role: {
        type: Number,
        default: 0,
    },
    stamina: {
        type: Number,
        default: 0
    },
    lastStaminaUse: {
        type: Date,
        default: () => new Date(),
    },
    staminaFull: {
        type: Date,
        default: () => moment().add("300", "minutes"),
    },
    dojoPoints: {
        type: Number,
        default: 0,
    },
    dojoPointsAllTime: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

export const ClanHistory = model("ClanHistory", clanSchema, "clans_history");