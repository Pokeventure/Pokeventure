import { ObjectId } from "mongodb";
import { model, Schema } from "mongoose";

const researchSchema = new Schema({
    discord_id: {
        type: String,
        required: true
    },
    data: Object,
});

export const Research = model("Research", researchSchema, "research");