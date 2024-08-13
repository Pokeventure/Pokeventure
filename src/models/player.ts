import { Schema, model, Document } from "mongoose";
import { IPlayer } from "../types/pokemon";

const playerSchema = new Schema<IPlayer>({
    discord_id: String,
    location: Number,
    started_at: Date,
    reward: {
        type: Number,
        default: 0,
    },
    selectedPokemon: {
        type: Schema.Types.ObjectId,
        ref: "Pokemon"
    },
    selectedTeam: {
        type: Schema.Types.ObjectId,
        ref: "Team"
    },
    money: {
        coins: Number,
        gems: Number,
        tickets: Number
    },
    sort: {
        type: Object,
        default: { _id: 1 },
    },
    voteStreak: {
        type: Number,
        default: 0,
    },
    event: {
        type: Boolean,
        default: false,
    },
    patronLevel: {
        type: Number,
        default: 0,
        index: true,
    },
    pokemonReward: {
        type: Boolean,
        default: false,
    },
    rarityScanner: {
        type: Date,
    },
    shinyScanner: {
        type: Date,
    },
    premiumRarityScanner: {
        type: Number,
        default: 0,
    },
    premiumShinyScanner: {
        type: Number,
        default: 0,
    },
    remindVote: {
        type: Boolean,
        default: false,
    },
    voted: {
        type: Date,
    },
    tradeLocked: {
        type: Boolean,
        default: false,
    },
    clan: {
        type: Schema.Types.ObjectId,
        ref: "Clan"
    },
}, { timestamps: true });

playerSchema.post("findOne", async function (doc, next) {
    if (!doc) return next();
    if (doc.populate) {
        await doc.populate("selectedPokemon");
        await doc.populate("clan");
    }
    next();
});

export const Player = model<IPlayer>("Player", playerSchema);
export type Player = IPlayer & Document;