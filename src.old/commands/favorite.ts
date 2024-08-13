import { Command, CommandContext } from 'command';
import { legendaries, ultrabeasts, mythicals } from '../../data/pokemons';
import { favPokemons, getPokemons, updatePokemons } from '../modules/database';
import { sendEmbed } from '../modules/utils';
import { SlashCommandBuilder } from '@discordjs/builders';
import { findPokemon, getPokemon } from '../modules/pokedex';
import { ObjectID } from 'mongodb';

export const Favorite: Command = {
  name: 'Favorite',
  keywords: ['favorite', 'fav'],
  category: 'Pokémon',
  fullDesc: 'Command to protect your Pokémons from being released.\nNote: Shinies and Pokémons from raid are automatically set as favorite.\n\nUsage: `%PREFIX%favorite [IDs|all] <rarity|mythical|ultrabeast|legendary>`\nExample: `%PREFIX%favorite 3,15,45` will add Pokémons #3, #15 and #45 to your favorite Pokémons.\nExample: `%PREFIX%favorite all` will add all your Pokémons to your favorite Pokémons.\nExample: `%PREFIX%favorite all LR` will add all your LR Pokémons to your favorite Pokémons.\nExample: `%PREFIX%favorite all shiny` will add all your Shiny Pokémons to your favorite Pokémons.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('favorite')
    .setDescription('Add your Pokémons to favorite to protect them from being released')
    .addBooleanOption(option => option.setName('all').setDescription('Favorite all Pokémon'))
    .addBooleanOption(option => option.setName('mythical').setDescription('Favorite mythicals'))
    .addBooleanOption(option => option.setName('shiny').setDescription('Favorite shinies'))
    .addBooleanOption(option => option.setName('ultrabeast').setDescription('Favorite ultreabeast'))
    .addBooleanOption(option => option.setName('legendary').setDescription('Favorite legendaries'))
    .addStringOption(option => option.setName('pokemon').setDescription('Favorite Pokémon per name').setAutocomplete(true))
    .addStringOption(option => option.setName('rarity').setDescription('Favorite Pokemon by rarity')
      .addChoice('N', 'n')
      .addChoice('U', 'u')
      .addChoice('R', 'r')
      .addChoice('SR', 'sr')
      .addChoice('UR', 'ur')
      .addChoice('LR', 'lr')
    )
    .addStringOption(option => option.setName('id').setDescription('Pokémon ID (IDs can be separated by , )')),

  handler(context: CommandContext): Promise<any> {
    return new Promise((resolve, reject) => {
      let ids: any[] = [];
      if (context.args === undefined && context.commandInterction.options.getBoolean('all')) {
        let filter: any = {};
        filter.owner = context.user.id;

        updatePokemons(filter, { fav: true }).then((res) => {
          sendEmbed({ context, message: `${res.numAffected} Pokémons have been set as favorite.`, image: null, thumbnail: null, author: context.user });
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else {
        let filter: any = {};
        filter.owner = context.user.id;
        if (context.args === undefined) {
          if (context.commandInterction.options.getString('rarity') === 'n') {
            filter.rarity = 0;
          } else if (context.commandInterction.options.getString('rarity') === 'u') {
            filter.rarity = 1;
          } else if (context.commandInterction.options.getString('rarity') === 'r') {
            filter.rarity = 2;
          } else if (context.commandInterction.options.getString('rarity') === 'sr') {
            filter.rarity = 3;
          } else if (context.commandInterction.options.getString('rarity') === 'ur') {
            filter.rarity = 4;
          } else if (context.commandInterction.options.getString('rarity') === 'lr') {
            filter.rarity = 5;
          }

          if (context.commandInterction.options.getBoolean('shiny')) {
            filter.shiny = true;
          }

          if (context.commandInterction.options.getString('pokemon') !== null) {
            let searchPokemon: any[] = findPokemon(context.commandInterction.options.getString('pokemon', true).toLowerCase().trim());
            if (searchPokemon.length === 0) {
              let pokemon = getPokemon(context.commandInterction.options.getString('pokemon', true).toLowerCase().trim());
              if (pokemon !== undefined) {
                searchPokemon = [pokemon];
              }
            }
            if (searchPokemon.length > 0) {
              let id = searchPokemon.map((pkm: any) => pkm.dexId)[0];
              filter.dexId = id;
            }
          }

          let idsToFilter: any[] = [];
          if (context.commandInterction.options.getBoolean('mythical')) {
            idsToFilter = idsToFilter.concat(mythicals);
          }
          if (context.commandInterction.options.getBoolean('legendary')) {
            idsToFilter = idsToFilter.concat(legendaries);
          }
          if (context.commandInterction.options.getBoolean('ultrabeast')) {
            idsToFilter = idsToFilter.concat(ultrabeasts);
          }
          if (idsToFilter.length !== 0) {
            filter._operators = { dexId: { in: idsToFilter } };
          }
          ids = (context.commandInterction.options.getString('id') ?? '').replace(/\s/g, '').split(',');
        } else {
          filter._id = new ObjectID(context.args[1]);
        }
        getPokemons(context.user.id, context.player?.sort ?? '_ID_ASC').then((res) => {
          const idsToFav: any[] = [];
          for (let i = 0; i < res.length; i++) {
            if (ids.includes((i + 1).toString())) {
              idsToFav.push(res[i]._id);
            }
          }
          if (Object.entries(filter).length === 1) {
            filter.owner = '-1';
          }
          updatePokemons(filter, { fav: true }).then((res) => {
            favPokemons(idsToFav);
            sendEmbed({ context, message: `${res.numAffected + idsToFav.length} Pokémons have been set as favorite.`, image: null, thumbnail: null, author: context.user });
            resolve({});
          }).catch((error) => {
            reject(error);
          });
        }).catch((error) => {
          reject(error);
        });
      }
    });
  },
};
