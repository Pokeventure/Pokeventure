import { Command, CommandContext } from 'command';
import moment from 'moment';
import { sendEmbed } from '../modules/utils';
import { addLootbox, addToInventory, updatePlayer } from '../modules/database';
import { voteStreakItems, voteStreakQuantity } from '../../data/vote';
import items from '../../data/items';
import { lootboxesEmoji, lootboxesNames } from '../modules/lootbox';
import { SlashCommandBuilder } from '@discordjs/builders';
import Logger from '../modules/logger';
import { Routes } from 'discord-api-types/v9';
import { MessageEmbed } from 'discord.js';
import * as Topgg from '@top-gg/sdk';

export const Vote: Command = {
  name: 'Vote',
  keywords: ['vote'],
  category: 'Bot',
  fullDesc: 'Vote for the bot and earn rewards.\n\nUsage: `%PREFIX%vote`',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('vote')
    .setDescription('Vote for the bot.')
    .addBooleanOption(option => option.setName('remind').setDescription('Enable vote reminder when you do wild command')),

  handler(context: CommandContext): any {
    if (context.commandInterction.options.getBoolean('remind')) {
      const remind = context.player?.remindVote !== undefined ? !context.player?.remindVote : true;
      updatePlayer(context.user.id, {
        remindVote: remind,
      });
      if (remind) {
        sendEmbed({ context, message: 'You will be reminded to vote when you will do `%PREFIX%wild`', image: null, thumbnail: null, author: context.user });
      } else {
        sendEmbed({ context, message: 'Vote reminder disabled.', image: null, thumbnail: null, author: context.user });
      }
    } else {
      if (context.player?.voted === undefined || moment() >= moment(context.player?.voted).add(12, 'h')) {
        let api = new Topgg.Api(<string>process.env.TOPGG_API);
        api.hasVoted(context.user.id).then(async (hasVoted) => {
          if (hasVoted) {
            let streak = context.player?.voteStreak || 0;
            streak += 1;
            const calculatedStreak = ((streak - 1) % 32);
            let bonusTime = false;
            updatePlayer(context.user.id, { voteStreak: streak, voted: new Date() });
            if (voteStreakItems[calculatedStreak] < 0) {
              await addLootbox(context.user.id, -voteStreakItems[calculatedStreak] - 1, voteStreakQuantity[calculatedStreak]);
            } else {
              addToInventory(context.user.id, voteStreakItems[calculatedStreak], voteStreakQuantity[calculatedStreak]);
            }
            if (moment(context.player?.voted).add(24, 'hour') > moment()) {
              await addLootbox(context.user.id, 3, 1);
              bonusTime = true;
            }
            const embed = new MessageEmbed();
            if (voteStreakItems[calculatedStreak] < 0) {
              embed.setDescription(`Thanks for voting! You received **x${voteStreakQuantity[calculatedStreak]} ${lootboxesEmoji[-voteStreakItems[calculatedStreak] - 1]} ${lootboxesNames[-voteStreakItems[calculatedStreak] - 1]}**!${bonusTime ? `\n\n**Because you vote again in less than 24 hours,\nyou got an additional x1 ${lootboxesEmoji[2]} ${lootboxesNames[2]}**` : ''}\n\nYou can vote again in 12 hours!\n\nCurrent bonus: ${streak}.\n\nVote within 24 hours to get an additional reward.`);
            } else {
              embed.setDescription(`Thanks for voting! You received **x${voteStreakQuantity[calculatedStreak]} ${items[voteStreakItems[calculatedStreak]].emoji} ${items[voteStreakItems[calculatedStreak]].name}**!${bonusTime ? `\n\n**Because you vote again in less than 24 hours,\nyou got an additional x1 ${lootboxesEmoji[2]} ${lootboxesNames[2]}**` : ''}\n\nYou can vote again in 12 hours!\n\nCurrent bonus: ${streak}.\n\nVote within 24 hours to get an additional reward.`);
            }
            embed.setTitle('Vote for Pokeventure');
            context.client.restClient.post(Routes.userChannels(), {
              body: {
                recipient_id: context.user.id,
              }
            }).then((userChannel: any) => {
              context.client.restClient.post(Routes.channelMessages(userChannel.id), {
                body: {
                  embeds: [
                    embed
                  ]
                }
              });
            }).catch((error) => {
              Logger.error(error);
            });
          }
        }).catch((error) => {
          Logger.error(error);
        });
      }

      const embed = new MessageEmbed();
      embed
        .setDescription('__You can vote **every 12 hours** for Pokéventure:__\n**https://top.gg/bot/666956518511345684/vote**\nVote once at least every 24 hours to get an additional reward.')
        .setImage(`http://image.pokeventure.com/vote.php?d=${context.player?.voteStreak === 0 ? 0 : (((context.player?.voteStreak ?? 0) - 1) % 32) + 1}`)
        .setTitle('Vote for Pokeventure')
        .setColor('#ff0000')
        .addField('Streak Reward', '#5: x2 <:luckyegg:797819244749914143> Lucky Egg\n#10: x2 <:pass:746747476811317258> Mega Raid Pass\n#15: x5 <:rarecandy:741810381340803112> Rare Candy\n#20: x5 <:masterball:741809195178917999> Masterball\n#25: x2 <:ivscanner:746747237475942480> Rarity Scanner\n#30: x2 <:shinyfinder:746747520763297832> Shiny Scanner\n#32: x1 <:raritygem:861529796009132032> Rarity Gem', false)
        .addField('Current bonus', `${context.player?.voteStreak === 0 ? 0 : (((context.player?.voteStreak ?? 0) - 1) % 32) + 1}`, true);
      if (moment() < moment(context.player?.voted).add(24, 'hour') && context.player?.voted !== undefined) {
        embed.addField('Last time voted', `${moment().diff(moment(context.player?.voted), 'h')} hours ago`, true);
      } else {
        embed.addField('You can vote', '\u2800', true);
      }
      context.commandInterction.editReply({
        embeds: [embed], components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                url: 'https://top.gg/bot/666956518511345684',
                style: 5,
                label: 'Vote here'
              }
            ]
          }
        ]
      });
    }
  },
};
