import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';

export const Help: Command = {
  name: 'Help',
  keywords: ['help', 'h'],
  category: 'Bot',
  fullDesc: 'Display all informations about available commands on this bot. It will display the aliases too.\nExample: `%PREFIX%help` to display simple help page.\nExample: `%PREFIX%help fight` to get more informations about the `fight` command.',
  requireStart: false,
  needPlayer: false,
  showInHelp: true,
  ignoreCommandLock: true,
  commandData: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Give informations about commands.')
    .addStringOption(
      (input) => input
        .setName('command')
        .setDescription('Command to get help')),

  handler(context: CommandContext): any {
    if (context.commandInterction.options.getString('command') !== null) {
      const command = context.client.commandHandler?.commands.find((cmd) => cmd.keywords.includes(context.commandInterction.options.getString('command', true)));
      if (command !== undefined) {
        return sendEmbed({ context, message: command.fullDesc, image: null, thumbnail: null, author: null, title: 'Help' });
      }
      return sendEmbed({ context, message: `Cannot find help for ${context.commandInterction.options.getString('command', true)}.` });
    }
    const embed = new MessageEmbed();
    embed.setTitle('Help');
    embed.setDescription('[Invite me on your server!](https://discord.com/api/oauth2/authorize?client_id=666956518511345684&scope=bot%20applications.commands&permissions=139586816064)\n[Official bot server](https://discord.gg/qSJrpyj)\nUse \`/help <command>\` to have more informations about a command.\n⚠️ The bot is currently under a big rework to keep it alive and it is switching to Slash Commands, a lot of commands are missing but will be added back soon. For more informations, go on the Pokeventure discord server. ⚠️\n\n__Here is the list of all available comands:__');
    embed.setFooter('Bot made by Neekhaulas#1337\nImages made by Roundicons Freebies\nVersion: 3.0.0');
    embed.setColor('#ff0000');

    const categories: { [key: string]: any[] } = {
      Pokémon: [], Fight: [], Items: [], Bot: [], Admin: [],
    };
    context.client.commandHandler?.commands.forEach((command: Command) => {
      if (!command.showInHelp || (command.earlyAccess && (context.player?.patronLevel === undefined || context.player?.patronLevel <= 1))) { return; }
      if (categories[command.category] === undefined) { categories[command.category] = []; }
      categories[command.category].push(command.keywords[0]);
    });

    for (const [key, value] of Object.entries(categories)) {
      embed.addField(key, `\`${value.join('`, `')}\``, true);
    }
    return context.commandInterction.editReply({ embeds: [embed] });
  },
};
