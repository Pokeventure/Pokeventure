import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import { getGuild, updateGuild } from '../modules/database';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Permissions } from 'discord.js';

export const Lock: Command = {
  name: 'Lock',
  keywords: ['lock'],
  category: 'Admin',
  fullDesc: 'Let you lock and unlock the bot to only one channel. Note: Only available to server admins.\n\nUsage: `%PREFIX%lock`',
  requireStart: false,
  needPlayer: false,
  showInHelp: true,
  ignoreLock: true,
  ignoreCommandLock: true,
  commandData: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Allow commands this channel'),

  handler(context: CommandContext): Promise<any> {
    return new Promise((resolve, reject) => {
      if ((<any>context.interaction.member?.permissions).has(Permissions.FLAGS.MANAGE_CHANNELS)) {
        getGuild(<string>context.interaction.guildId).then((guild) => {
          if (guild.lock === undefined || guild.lock === null || !Array.isArray(guild.lock)) {
            if (guild.lock === undefined || guild.lock === null) {
              guild.lock = [];
            } else {
              guild.lock = [guild.lock];
            }
          }
          if (!guild.lock.includes(context.interaction.channelId)) {
            guild.lock.push(context.interaction.channelId);
            sendEmbed({ context, message: `Pokéventure has been locked to channel <#${context.interaction.channelId}>` });
          } else {
            guild.lock.splice(guild.lock.indexOf(context.interaction.channelId), 1);
            sendEmbed({ context, message: 'Pokéventure has been unlocked for this channel' });
            if (guild.lock.length === 0) {
              sendEmbed({ context, message: 'Pokéventure is now available in all channels' });
            }
          }
          updateGuild(<string>context.interaction.guildId, guild);
          context.client.redis.del(`guild-${context.interaction.guildId}`);
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
