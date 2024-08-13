import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';

export const Invite: Command = {
  name: 'Invite',
  keywords: ['invite'],
  category: 'Bot',
  fullDesc: 'Invite your bot on your server.',
  requireStart: false,
  needPlayer: false,
  showInHelp: true,

  handler(context: CommandContext): any {
    const text = 'Add **Pokeventure** to your server by clicking [here!](https://discord.com/api/oauth2/authorize?client_id=666956518511345684&scope=bot&permissions=387136)\n\nYou can then lock the bot to some channels with `%PREFIX%lock` on your server.';

    return sendEmbed({ context, message: text, image: null, thumbnail: null, author: null, footer: null, title: 'Invite Pokeventure to you server' });
  },
};
