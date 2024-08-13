import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import { updateGuild } from '../modules/database';

export const Prefix: Command = {
  name: 'Prefix',
  keywords: ['prefix'],
  category: 'Admin',
  fullDesc: 'Let you change the bot prefix. Note: Only available to server admins.\n\nUsage: `%PREFIX%prefix <prefix>`\n\n\nExample: `%PREFIX%prefix p!`',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,

  handler(context: CommandContext): any {
    if (context.message.member?.permissions.has('manageGuild')) {
      if (context.args.length > 1) {
        if (context.message.guildID !== undefined) {
          updateGuild(context.message.guildID, { prefix: context.args[1] });
          sendEmbed({ context, message: `Bot prefix has been changed to \`${context.args[1]}\` in this server.` });
          context.client.redis.del(`guild-${context.message.guildID}`);
        }
      }
    } else {
      sendEmbed({ context, message: 'Only administrators have the right to change prefix.' });
    }
  },
};
