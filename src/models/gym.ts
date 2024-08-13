import { Schema, model } from 'mongoose';
import { Pokemon } from './pokemon';

const gymSchema = new Schema({
    discord_id: String,
    difficultyLevels: [Number],
    join: Date,
    selectedDifficulty: Number,
    selectedRegion: Number,
});

export const Gym = model('Gym', gymSchema);