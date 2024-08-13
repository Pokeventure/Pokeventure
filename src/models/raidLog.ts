import { ObjectId } from "mongodb";
import { model, Schema } from "mongoose";

const raidLogSchema = new Schema({
    discord_id: {
        type: String,
        required: true
    },
    raid: ObjectId,
    damageDealt: {
        type: Number,
        index: true,
        default: 0,
    },
    hits: Number,
    checked: Boolean,
});

export const RaidLog = model("RaidLog", raidLogSchema, "raid_log");