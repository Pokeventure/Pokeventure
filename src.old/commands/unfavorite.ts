import { Command, CommandContext } from 'command';
import { legendaries, ultrabeasts, mythicals } from '../../data/pokemons';
import { favPokemons, getPokemons, unfavPokemons, updatePokemons } from '../modules/database';
import { sendEmbed } from '../modules/utils';
import { SlashCommandBuilder } from '@discordjs/builders';
import { findPokemon, getPokemon } from '../modules/pokedex';

export const Unfavorite: Command = {
  name: 'Unfavorite',
  keywords: ['unfavorite', 'unfav'],
  category: 'Pokémon',
  fullDesc: 'Command to unprotect your Pokémons from being released.\n\nUsage: `%PREFIX%favorite [IDs|all] <rarity|mythical|ultrabeast|legendary>`\nExample: `%PREFIX%favorite 3,15,45` will add Pokémons #3, #15 and #45 to your favorite Pokémons.\nExample: `%PREFIX%favorite all` will add all your Pokémons to your favorite Pokémons.\nExample: `%PREFIX%favorite all LR` will add all your LR Pokémons to your favorite Pokémons.\nExample: `%PREFIX%favorite all shiny` will add all your Shiny Pokémons to your favorite Pokémons.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('unfavorite')
    .setDescription('Remove your Pokémons from favorite.')
    .addBooleanOption(option => option.setName('all').setDescription('Unfavorite all Pokémon'))
    .addBooleanOption(option => option.setName('mythical').setDescription('Unfavorite mythicals'))
    .addBooleanOption(option => option.setName('shiny').setDescription('Unfavorite shinies'))
    .addBooleanOption(option => option.setName('ultrabeast').setDescription('Unfavorite ultreabeast'))
    .addBooleanOption(option => option.setName('legendary').setDescription('Unfavorite legendaries'))
    .addStringOption(option => option.setName('pokemon').setDescription('Unfavorite Pokémon per name').setAutocomplete(true))
    .addStringOption(option => option.setName('rarity').setDescription('Unfavorite Pokemon by rarity')
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
      if (context.commandInterction.options.getBoolean('all')) {
        let filter: any = {};
        filter.owner = context.user.id;

        updatePokemons(filter, { fav: false }).then((res) => {
          sendEmbed({ context, message: `${res.numAffected} Pokémons have removed from favorite.`, image: null, thumbnail: null, author: context.user });
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else {
        let filter: any = {};
        filter.owner = context.user.id;
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
          updatePokemons(filter, { fav: false }).then((res) => {
            unfavPokemons(idsToFav);
            sendEmbed({ context, message: `${res.numAffected + idsToFav.length} Pokémons have been removed from favorite.`, image: null, thumbnail: null, author: context.user });
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
