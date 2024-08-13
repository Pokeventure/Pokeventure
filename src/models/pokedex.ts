import { Schema, model } from 'mongoose';

const pokedexSchema = new Schema({
    discord_id: String,
    count: Number,
    shiny: Number,
    data: Object,
});

export const Pokedex = model('Pokedex', pokedexSchema, "pokedex");