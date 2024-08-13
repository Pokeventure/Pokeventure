import { Command, CommandContext } from 'command';
import { legendaries, ultrabeasts, mythicals } from '../../data/pokemons';
import { unfavPokemons, getPokemons, updatePokemons } from '../modules/database';
import { sendEmbed } from '../modules/utils';

export const Unfavorite: Command = {
  name: 'Unfavorite',
  keywords: ['unfavorite', 'unfav'],
  category: 'Pokémon',
  fullDesc: 'Command to unprotect your Pokémons from being released.\n\nUsage: `%PREFIX%unfavorite [IDs|all|mythical|ultrabeast|legendary]`\nExample: `%PREFIX%unfavorite 3,15,45` will remove Pokémons #3, #15 and #45 from favorite Pokémons.\nExample: `%PREFIX%unfavorite all` will remove all your Pokémons from favorite Pokémons.\nExample: `%PREFIX%unfavorite all LR` will remove all your LR Pokémons to your favorite Pokémons.\nExample: `%PREFIX%unfavorite all LR` will remove all your Shiny Pokémons to your favorite Pokémons.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,

  handler(context: CommandContext): Promise<any> {
    return new Promise((resolve, reject) => {
      if (context.args.length > 1) {
        let ids: any[] = [];
        if (context.args[1] === 'all') {
          let filter: any = {};
          filter.owner = context.user.id;
          if (context.args.includes('n')) {
            filter.rarity = 0;
          } else if (context.args.includes('u')) {
            filter.rarity = 1;
          } else if (context.args.includes('r')) {
            filter.rarity = 2;
          } else if (context.args.includes('sr')) {
            filter.rarity = 3;
          } else if (context.args.includes('ur')) {
            filter.rarity = 4;
          } else if (context.args.includes('lr')) {
            filter.rarity = 5;
          }

          if (context.args.includes('shiny')) {
            filter.shiny = true;
          }

          let idsToFilter: any[] = [];
          if (context.args.includes('mythical') || context.args.includes('mythicals') || context.args.includes('myth') || context.args.includes('myths')) {
            idsToFilter = idsToFilter.concat(mythicals);
          }
          if (context.args.includes('legendary') || context.args.includes('legendaries') || context.args.includes('legs')) {
            idsToFilter = idsToFilter.concat(legendaries);
          }
          if (context.args.includes('ultrabeast') || context.args.includes('ultrabeasts') || context.args.includes('ub')) {
            idsToFilter = idsToFilter.concat(ultrabeasts);
          }
          if (idsToFilter.length !== 0) {
            filter._operators = { dexId: { in: idsToFilter } };
          }

          updatePokemons(filter, { fav: false }).then((res) => {
            sendEmbed({ context, message: `${res.numAffected} Pokémons have been removed from favorite.`, image: null, thumbnail: null, author: context.user });
            resolve({});
          }).catch((error) => {
            reject(error);
          });
        } else {
          ids = context.args[1].split(',');
          getPokemons(context.user.id, context.player?.sort ?? '_ID_ASC').then((res) => {
            const idsToFav: any[] = [];
            for (let i = 0; i < res.length; i++) {
              if (ids.includes((i + 1).toString())) {
                idsToFav.push(res[i]._id);
              }
            }
            unfavPokemons(idsToFav);
            sendEmbed({ context, message: `${idsToFav.length} Pokémons have been removed from favorite.`, image: null, thumbnail: null, author: context.user });
            resolve({});
          }).catch((error) => {
            reject(error);
          });
        }
      }
    });
  },
};
