import { Schema, model, Document } from "mongoose";
import { ITeam } from "../types/game";
import { Pokemon } from "./pokemon";

export const teamSchema = new Schema<ITeam>({
    discord_id: String,
    name: String,
    team: {
        type: [Schema.Types.ObjectId],
        ref: "Pokemon",
    }
}, {
    timestamps: true
});
teamSchema.post("find", async (docs, next) => {
    for (const doc of docs) {
        if (doc.populate) {
            await doc.populate({
                path: "team", options: {
                    retainNullValues: true,
                }
            });
            doc.team.forEach((pokemon: Pokemon, index: number) => {
                if (pokemon && pokemon.owner !== doc.discord_id) {
                    doc.team[index] = {};
                }
            });
        }
    }
    next();
});

teamSchema.post("findOne", async function (doc, next) {
    if (doc.populate) {
        console.log("Populate");
        await doc.populate("team");
    }
    next();
});

export const Team = model<ITeam>("Team", teamSchema);
export type Team = ITeam & Document;