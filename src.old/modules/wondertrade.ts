import { Chance } from 'chance';
import { MessageEmbed } from 'discord.js';
import Client from './client';
import { addPokemon, deleteWondertrade, getWondertrades } from './database';
import Logger from './logger';
import { rarity } from './pokedex';
import { getImage, sendDM } from './utils';


export async function checkWondertrade(client: Client) {
    getWondertrades().then((wondertrades) => {
        let tradeResolved = [];
        const chance = new Chance();
        while(wondertrades.length > 1) {
            let first = wondertrades.shift();
            let second = chance.pickone(wondertrades);
            let i = wondertrades.indexOf(second);
            wondertrades.splice(i, 1);
            tradeResolved.push([first, second]);
        }

        for(let i = 0; i < tradeResolved.length; i++) {
            let pokemon1 = tradeResolved[i][0].pokemon;
            delete pokemon1._id;
            pokemon1.luckyEgg = false;
            pokemon1.fav = false;
            pokemon1.owner = tradeResolved[i][1].discord_id;

            addPokemon(pokemon1);

            let pokemon2 = tradeResolved[i][1].pokemon;
            delete pokemon2._id;
            pokemon2.luckyEgg = false;
            pokemon2.fav = false;
            pokemon2.owner = tradeResolved[i][0].discord_id;

            addPokemon(pokemon2);
            deleteWondertrade(tradeResolved[i][0]._id);
            deleteWondertrade(tradeResolved[i][1]._id);
            let embed1 = new MessageEmbed().setTitle('Wondertrade').setDescription(`You received ${rarity[pokemon1.rarity]} ${pokemon1.shiny ? '✨' : ''} ${pokemon1.name} from Wondertrade. Take care of it!`).setThumbnail(getImage(pokemon1, true, pokemon1.shiny, pokemon1.special));
            sendDM(client, tradeResolved[i][1].discord_id, {embeds: [embed1]});
            let embed2 = new MessageEmbed().setTitle('Wondertrade').setDescription(`You received ${rarity[pokemon2.rarity]} ${pokemon2.shiny ? '✨' : ''} ${pokemon2.name} from Wondertrade. Take care of it!`).setThumbnail(getImage(pokemon2, true, pokemon2.shiny, pokemon2.special));
            sendDM(client, tradeResolved[i][0].discord_id, {embeds: [embed2]});
        }
    }).catch((error) => {
        Logger.error(error);
    });
}