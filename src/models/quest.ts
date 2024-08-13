import { Schema, model } from 'mongoose';
import { IQuest } from '../types/game';

const questSchema = new Schema<IQuest>({
    discord_id: String,
    data: Object,
    type: String,
    value: Number,
    objective: Number,
    tutorial: {
        type: Boolean,
        default: false,
    },
    reward: [Object],
    event: { type: Boolean, default: false },
    patreon: { type: Boolean, default: false },
    repeatable: {
        type: Boolean,
        default: false,
    },
});

export const Quest = model<IQuest>('Quest', questSchema);
export type Quest = IQuest & Document;