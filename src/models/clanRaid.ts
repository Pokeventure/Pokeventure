import { Schema, model, Document } from "mongoose";
import { IClanRaid } from "../types/game";
import { Pokemon } from "./pokemon";

const clanRaidSchema = new Schema<IClanRaid>({
    pokemon: {
        type: Pokemon.schema,
    },
    hp: Number,
    maxHp: Number,
    clan: Schema.Types.ObjectId,
    time: {
        type: Date,
        index: true,
    },
});

export const ClanRaid = model<IClanRaid>("ClanRaid", clanRaidSchema, "clan_raid");
export type ClanRaid = IClanRaid & Document;