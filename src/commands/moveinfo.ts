import { SlashCommandBuilder } from 'discord.js';
import { Moves as MovesImport } from '../../simulator/.data-dist/moves';
import { MovesText as MovesTextImport } from '../../simulator/.data-dist/text/moves';
import { moveClassEmoji, typeEmoji } from '../modules/pokedex';
import { sendEmbed } from '../modules/utils';
import { Command, CommandContext } from '../types/command';

const Moves: {
  [name: string]: {
    name: string,
    type: string,
    category: string,
    pp: number,
    basePower: number,
    accuracy: number | boolean,
  }
} = MovesImport;
const MovesText: {
  [name: string]: {
    name: string,
    desc?: string,
    shortDesc?: string,
  }
} = MovesTextImport;

export const MoveInfo: Command = {
  commandName: 'moveinfo',
  displayName: 'Move info',
  fullDescription: 'Displays informations a given move.\n\nUsage: `%PREFIX%moveinfo <move name>`\nExample: `%PREFIX%moveinfo splash` to display informations about Splash move.',
  requireStart: false,
  needPlayer: false,
  showInHelp: true,
  data: () => new SlashCommandBuilder()
    .setName('moveinfo')
    .setDescription('Displays informations about a move.')
    .addStringOption(option => option.setName('move').setDescription('Move name').setRequired(true))
    .setDMPermission(true)
  ,

  handler(context: CommandContext) {
    const moveName = context.interaction.options.getString('move', true).toLowerCase().trim();
    const move = Object.values(Moves).find((x: any) => x.name.toLocaleLowerCase().startsWith(moveName));
    const moveDesc = Object.values(MovesText).find((x: any) => x.name.toLocaleLowerCase().startsWith(moveName));
    if (move !== undefined && moveDesc !== undefined) {
      sendEmbed(context, { description: `**${move.name}**\n\nType: ${typeEmoji[move.type]} ${move.type}\nClass: ${moveClassEmoji[move.category]} ${move.category}\nPP: ${move.pp > 1 ? Math.round(move.pp * 1.6) : 1}\nPower: ${move.basePower === 0 ? '-' : move.basePower}\nAccuracy: ${move.accuracy === true ? '-' : move.accuracy}%\nDescription: ${moveDesc.desc || moveDesc.shortDesc}` });
    } else {
      sendEmbed(context, { description: `No move found for ${moveName}` });
    }
  },
};
