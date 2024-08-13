import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import { getPokemonByNumber } from '../modules/database';
import { sendInfo } from '../modules/pokedex';
import { SlashCommandBuilder } from '@discordjs/builders';

export const Info: Command = {
  name: 'Info',
  keywords: ['info', 'i'],
  category: 'Pokémon',
  fullDesc: 'Displays informations about your selected Pokémon if no ID is given to the command. If you give an ID, you will have more informations about it. To see your Pokémons ID, use the command `%PREFIX%pokemons`.\n\nExample: `%PREFIX%info` to display informations about currently selected Pokémon\nExample: `%PREFIX%info 8` to display informations about your Pokémon with ID 8.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Get info of your Pokémon.')
    .addIntegerOption(option => option.setName('number').setDescription('Pokémon number').setRequired(false)),

  handler(context: CommandContext): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const id: number | null = context.commandInterction.options.getInteger('number');
      if (id === null) {
        if (context.player?.selectedPokemon === null) {
          sendEmbed({ context, message: 'You must select a Pokémon before.', author: context.user });
        } else {
          sendInfo(context.player?.selectedPokemon, context, false, '', false);
        }
        resolve({});
      } else {
        try {
          const pokemon = await getPokemonByNumber(context.user.id, id - 1, context.player?.sort ?? '_ID_ASC');
          if (pokemon !== null) {
            sendInfo(pokemon, context, false, '', false);
          } else {
            sendEmbed({ context, message: 'No Pokémon match this number. Check Pokémons number with `/pokemons`.', author: context.user });
          }
          resolve({});
        } catch (error) {
          reject(error);
        }
      }
    });
  },
};
