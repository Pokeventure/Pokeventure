import { Command, CommandContext } from 'command';
import { updatePlayer } from '../modules/database';
import { sendEmbed } from '../modules/utils';
import { SlashCommandBuilder } from '@discordjs/builders';

export const Sort: Command = {
  name: 'Sort',
  keywords: ['sort'],
  category: 'Pokémon',
  fullDesc: 'Command to sort your Pokémons in the `%PREFIX%pokemons` command. You can sort by these criters:\n- Level\n- Rarity\n- Favorite\n- Shiny\n\nUsage: `%PREFIX%sort [option]`\nAvailable options: `level`, `rarity`, `favorite`, `shiny`, `number` (for Pokédex number).\nNote: Add `-` in front of the option to inverse the order.\nNote: Leave option empty to reset sort\n\nExample: `%PREFIX%sort level` will sort Pokémons by level in ascending order.\nExample: `%PREFIX%sort -rarity` will sort Pokémons by rarity in descending order.\nExample: `%PREFIX%sort` to reset to default order (catch date).',
  requireStart: true,
  needPlayer: false,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('sort')
    .setDescription('Sort your box')
    .addStringOption(option => option
      .setName('order')
      .setDescription('Order by')
      .addChoice('Level', 'level')
      .addChoice('Shiny', 'shiny')
      .addChoice('Rarity', 'rarity')
      .addChoice('Favorite', 'favorite')
      .addChoice('Number', 'number')
    )
    .addBooleanOption(option => option.setName('opposite').setDescription('Use opposite filter')),

  handler(context: CommandContext): Promise<any> {
    return new Promise((resolve, reject) => {
      if (context.commandInterction.options.getString('order') !== null) {
        try {
          switch (context.commandInterction.options.getString('order', true)) {
            case 'level':
              if (context.commandInterction.options.getBoolean('opposite')) {
                updatePlayer(context.user.id, { sort: 'LEVEL_DESC' });
                sendEmbed({ context, message: 'Pokémon list will be sorted by level in descending order.', image: null, thumbnail: null, author: context.user });
              } else {
                updatePlayer(context.user.id, { sort: 'LEVEL_ASC' });
                sendEmbed({ context, message: 'Pokémon list will be sorted by level in ascending order.', image: null, thumbnail: null, author: context.user });
              }
              break;
            case 'shiny':
              if (context.commandInterction.options.getBoolean('opposite')) {
                updatePlayer(context.user.id, { sort: 'SHINY_ASC' });
                sendEmbed({ context, message: 'Pokémon list will display shiny Pokémons last', image: null, thumbnail: null, author: context.user });
              } else {
                updatePlayer(context.user.id, { sort: 'SHINY_DESC' });
                sendEmbed({ context, message: 'Pokémon list will display shiny Pokémons first', image: null, thumbnail: null, author: context.user });
              }
              break;
            case 'rarity':
              if (context.commandInterction.options.getBoolean('opposite')) {
                updatePlayer(context.user.id, { sort: 'RARITY_DESC' });
                sendEmbed({ context, message: 'Pokémon list will be sorted by rarity in descending order.', image: null, thumbnail: null, author: context.user });
              } else {
                updatePlayer(context.user.id, { sort: 'RARITY_ASC' });
                sendEmbed({ context, message: 'Pokémon list will be sorted by rarity in ascending order.', image: null, thumbnail: null, author: context.user });
              }
              break;
            case 'favorite':
              if (context.commandInterction.options.getBoolean('opposite')) {
                updatePlayer(context.user.id, { sort: 'FAVORITE_ASC' });
                sendEmbed({ context, message: 'Pokémon list will display favorite Pokémons last', image: null, thumbnail: null, author: context.user });
              } else {
                updatePlayer(context.user.id, { sort: 'FAVORITE_DESC' });
                sendEmbed({ context, message: 'Pokémon list will display favorite Pokémons first', image: null, thumbnail: null, author: context.user });
              }
              break;
            case 'number':
              if (context.commandInterction.options.getBoolean('opposite')) {
                updatePlayer(context.user.id, { sort: 'ID_DESC' });
                sendEmbed({ context, message: 'Pokémon list will display by number in Pokédex in descending order.', image: null, thumbnail: null, author: context.user });
              } else {
                updatePlayer(context.user.id, { sort: 'ID_ASC' });
                sendEmbed({ context, message: 'Pokémon list will display by number in Pokédex in ascending order.', image: null, thumbnail: null, author: context.user });
              }
              break;
            default:
              updatePlayer(context.user.id, { sort: '_ID_ASC' });
              sendEmbed({ context, message: 'Pokémon list will be sorted by catch date.', image: null, thumbnail: null, author: context.user });
              break;
          }
        } catch (error) {
          reject(error);
        }
      } else {
        updatePlayer(context.user.id, { sort: '_ID_ASC' }).catch((error) => {
          reject(error);
        });
        sendEmbed({ context, message: 'Pokémon list will be sorted by catch date.', image: null, thumbnail: null, author: context.user });
      }
      resolve({});
    });
  },
};
