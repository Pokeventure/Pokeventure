import { Command, CommandContext } from 'command';
import { updateGuild, getGuild } from '../modules/database';
import { sendEmbed } from '../modules/utils';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Permissions } from 'discord.js';

export const LockCommand: Command = {
  name: 'Lock Command',
  keywords: ['lock-command'],
  category: 'Admin',
  fullDesc: 'Lock commands in a channel.\n\nUsage: `%PREFIX%lock-command wild`',
  requireStart: true,
  needPlayer: false,
  showInHelp: true,
  ignoreCommandLock: true,
  commandData: new SlashCommandBuilder()
    .setName('lock-command')
    .setDescription('Lock or unlock command in a channel.')
    .addStringOption(option => option.setName('command').setDescription('Command to lock/unlock').setRequired(true)),

  handler(context: CommandContext): Promise<any> {
    return new Promise((resolve, reject) => {
      if(context.interaction.channelId === null) {
        resolve({});
        return;
      }
      let channelId: string = context.interaction.channelId;
      if ((<any>context.interaction.member?.permissions).has(Permissions.FLAGS.MANAGE_CHANNELS)) {
        getGuild(<string>context.interaction.guildId).then((guild: any) => {
          if (guild.lockCommands === null) {
            guild.lockCommands = {};
          }
          if (guild.lockCommands[channelId] === undefined) {
            guild.lockCommands[channelId] = [];
          }
          const match = context.client.commandHandler?.commands.find((x) => x.keywords.includes(context.commandInterction.options.getString('command', true)));
          if (match) {
            if (guild.lockCommands[channelId].indexOf(match.keywords[0]) === -1) {
              guild.lockCommands[channelId].push(match.keywords[0]);
              sendEmbed({ context, message: `Command \`${match.name}\` has been enabled in this channel.` });
            } else {
              const index = guild.lockCommands[channelId].indexOf(match.keywords[0]);
              guild.lockCommands[channelId].splice(index, 1);
              sendEmbed({ context, message: `Command \`${match.name}\` has been disabled in this channel.` });
            }
            updateGuild(<string>context.interaction.guildId, guild);
            context.client.redis.del(`guild-${context.interaction.guildId}`);
          } else {
            sendEmbed({ context, message: 'No command found.' });
          }
        }).catch((error) => {
          reject(error);
        });
      } else {
        sendEmbed({ context, message: 'Only administrators have the right to lock the bot to a channel.' });
      }
      resolve({});
    });
  },
};
