import { Chance } from 'chance';
import Client from './client';
import { getPokemon, rarity } from './pokedex';
import { getImage, sendDM } from './utils';
import { Wondertrade } from '../models/wondertrade';
import { Pokemon } from '../models/pokemon';
import { EmbedBuilder } from 'discord.js';


export async function checkWondertrade(client: Client) {
    Wondertrade.find({}).then((wondertrades) => {
        let tradeResolved = [];
        const chance = new Chance();
        while (wondertrades.length > 1) {
            let first = wondertrades.shift();
            let second = chance.pickone(wondertrades);
            let i = wondertrades.indexOf(second);
            wondertrades.splice(i, 1);
            tradeResolved.push([first, second]);
        }

        for (let i = 0; i < tradeResolved.length; i++) {
            let trade1 = tradeResolved[i][0];
            let trade2 = tradeResolved[i][1];
            if (trade1 && trade2) {
                let pokemon1 = trade1.pokemon;
                pokemon1.luckyEgg = false;
                pokemon1.fav = false;
                pokemon1.owner = trade2.discord_id;

                let newPokemon1 = new Pokemon(pokemon1);
                newPokemon1.save();

                let pokemon2 = trade2.pokemon;
                pokemon2.luckyEgg = false;
                pokemon2.fav = false;
                pokemon2.owner = trade1.discord_id;

                let newPokemon2 = new Pokemon(pokemon2);
                newPokemon2.save();

                // Delete wondertrades
                Wondertrade.deleteOne({ _id: trade1._id });
                Wondertrade.deleteOne({ _id: trade2._id });
                let embed1 = new EmbedBuilder().setTitle('Wondertrade').setDescription(`You received ${rarity[pokemon1.rarity]} ${pokemon1.shiny ? '✨' : ''} ${getPokemon(pokemon1.dexId, pokemon1.special).displayName} from Wondertrade. Take care of it!`).setThumbnail(getImage(pokemon1, true, pokemon1.shiny, pokemon1.special));
                sendDM(client, trade2.discord_id, { embeds: [embed1] });
                let embed2 = new EmbedBuilder().setTitle('Wondertrade').setDescription(`You received ${rarity[pokemon2.rarity]} ${pokemon2.shiny ? '✨' : ''} ${getPokemon(pokemon2.dexId, pokemon2.special).displayName} from Wondertrade. Take care of it!`).setThumbnail(getImage(pokemon2, true, pokemon2.shiny, pokemon2.special));
                sendDM(client, trade1.discord_id, { embeds: [embed2] });
            }
        }
    });
}