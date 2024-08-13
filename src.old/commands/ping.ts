import { Chance } from 'chance';
import { Command, CommandContext } from 'command';
import { gql } from 'graphql-request';
import { sendEmbed } from '../modules/utils';
import { SlashCommandBuilder } from '@discordjs/builders';

export const Ping: Command = {
  name: 'Ping',
  keywords: ['ping'],
  category: 'Bot',
  fullDesc: 'Ping',
  requireStart: false,
  needPlayer: false,
  showInHelp: false,
  ignoreCommandLock: true,
  commandData: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Display ping time'),

  handler(context: CommandContext): Promise<any> {
    return new Promise<any>(async (resolve, reject) => {
      const query = gql`
                query ping($discord_id: String!) {
                    ping {
                        pong
                    }
                    player(filter: {discord_id: $discord_id}) {
                        username
                    }
                }
            `;
      const variables = {
        discord_id: context.user.id,
      };
      const handleTime = process.hrtime();
      context.client.graphqlClient?.request(query, variables).then((result) => {
        const endHandleTime = process.hrtime(handleTime);
        context.commandInterction.editReply(`Pong\n\nAPI: ${Math.round((endHandleTime[1] / 1000000) + endHandleTime[0] * 1000)} ms.\nWS: ${context.client.discordClient.ws.ping} ms`);
        resolve({});
      }).catch((err) => {
        reject(err);
      });
    });
  },
};
