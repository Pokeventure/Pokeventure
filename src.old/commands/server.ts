import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import { SlashCommandBuilder } from '@discordjs/builders';
import { getGuild } from '../modules/database';

export const Server: Command = {
  name: 'Server',
  keywords: ['server'],
  category: 'Bot',
  fullDesc: 'Display informations about this server configuration',
  requireStart: false,
  needPlayer: false,
  showInHelp: false,
  ignoreCommandLock: true,
  commandData: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Display informations about this server configration'),

  handler(context: CommandContext): Promise<any> {
    return new Promise<any>(async (resolve, reject) => {
      if (context.interaction.guildId !== null) {
        getGuild(context.interaction.guildId).then((guildData: any) => {
          let channelsLocked = '';
          if (guildData.lock !== undefined && guildData.lock !== null && guildData.lock.length > 0) {
            guildData.lock.forEach((element: any) => {
              channelsLocked += `<#${element}>\n`;
            });
          } else {
            channelsLocked = 'None';
          }

          sendEmbed({ context, message: `Guild info:\n\nID: ${context.interaction.guildId}\n\nChannels locked:\n${channelsLocked}\n\nShard: ${context.client.discordClient.shard?.ids}` });
        }).catch((error: any) => {
          reject(error);
        });
      } else {
        sendEmbed({ context, message: 'This command can be used only in a server' });
      }
      resolve({});
    });
  },
};
