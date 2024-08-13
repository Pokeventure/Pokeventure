import { Schema, model, Document } from 'mongoose';
import { Pokemon } from './pokemon';

const wondertradeSchema = new Schema({
    discord_id: {
        type: String,
        required: true,
    },
    pokemon: {
        type: Pokemon.schema,
        required: true,
    },
    date: Date,
});

export const Wondertrade = model('Wondertrade', wondertradeSchema, 'wondertrade');
export type Wondertrade = {
    discord_id: string,
    pokemon: Pokemon,
    date: Date,
} & Document;