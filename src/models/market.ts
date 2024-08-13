import { Schema, model } from 'mongoose';
import { Pokemon } from './pokemon';
import { IPokemon } from 'src/types/pokemon';

const marketSchema = new Schema<{
    discord_id: string,
    price: number,
    marketId: string,
    pokemon: IPokemon,
}>({
    discord_id: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    marketId: {
        type: String,
        index: true,
    },
    pokemon: {
        type: Pokemon.schema,
        required: true,
    },
});

export const Market = model('Market', marketSchema, 'market');