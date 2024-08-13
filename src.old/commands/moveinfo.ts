import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import {
  moveClassEmoji, typeEmoji,
} from '../modules/pokedex';
import { Moves as MovesImport } from '../../simulator/.data-dist/moves';
import { MovesText as MovesTextImport } from '../../simulator/.data-dist/text/moves';
import { SlashCommandBuilder } from '@discordjs/builders';

const Moves: any = MovesImport;
const MovesText: any = MovesTextImport;

export const MoveInfo: Command = {
  name: 'Move info',
  keywords: ['moveinfo'],
  category: 'Pokémon',
  fullDesc: 'Displays informations a given move.\n\nUsage: `%PREFIX%moveinfo <move name>`\nExample: `%PREFIX%moveinfo splash` to display informations about Splash move.',
  requireStart: false,
  needPlayer: false,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('moveinfo')
    .setDescription('Displays informations about a move.')
    .addStringOption(option => option.setName('move').setDescription('Move name').setRequired(true))
  ,

  handler(context: CommandContext): any {
    const moveName = context.commandInterction.options.getString('move', true).toLowerCase().trim();
    const move = <any>Object.values(Moves).find((x: any) => x.name.toLocaleLowerCase().startsWith(moveName));
    const moveDesc = <any>Object.values(MovesText).find((x: any) => x.name.toLocaleLowerCase().startsWith(moveName));
    if (move !== undefined && moveDesc !== undefined) {
      sendEmbed({ context, message: `**${move.name}**\n\nType: ${typeEmoji[move.type]} ${move.type}\nClass: ${moveClassEmoji[move.category]} ${move.category}\nPP: ${move.pp > 1 ? Math.round(move.pp * 1.6) : 1}\nPower: ${move.basePower === 0 ? '-' : move.basePower}\nAccuracy: ${move.accuracy === true ? '-' : move.accuracy}%\nDescription: ${moveDesc.desc || moveDesc.shortDesc}` });
    } else {
      sendEmbed({ context, message: `No move found for ${moveName}` });
    }
  },
};
