import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import { SlashCommandBuilder } from '@discordjs/builders';

export const Flee: Command = {
  name: 'Flee',
  keywords: ['flee'],
  category: 'Fight',
  fullDesc: 'Flee from current fight or current raid. Can be used if the fight became inactive.\n\nUsage: `%PREFIX%flee`',
  requireStart: true,
  needPlayer: false,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('flee')
    .setDescription('Flee from your fight.'),

  handler(context: CommandContext): any {
    if (context.client.fights[context.user.id] !== undefined || context.client.encounter[context.user.id] !== undefined) {
      context.client.fights[context.user.id]?.kill();
      delete context.client.fights[context.user.id];
      delete context.client.encounter[context.user.id];
      sendEmbed({ context, message: 'You fled from your fight.' });
    } else {
      sendEmbed({ context, message: 'You are currently not in a fight.' });
    }
  },
};
