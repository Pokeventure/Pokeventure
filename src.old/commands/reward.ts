import { Command, CommandContext } from 'command';
import moment from 'moment';
import {
  updatePlayer, addLootbox, getQuests, addQuest,
} from '../modules/database';
import { sendEmbed, getRndInteger } from '../modules/utils';
import { getQuestText, incrementQuest } from '../modules/quests';
import randomQuests from '../../data/quests';
import { SlashCommandBuilder } from '@discordjs/builders';
import { lootboxesEmoji, lootboxesNames } from '../modules/lootbox';

export const Reward: Command = {
  name: 'Reward',
  keywords: ['reward', 'daily', 'hourly'],
  category: 'Bot',
  fullDesc: 'You will receive a small reward and a quest to help you in your progress. You can claim it every 60 minutes.\n\nExample: `%PREFIX%reward`',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('reward')
    .setDescription('Get a small reward and a quest'),

  handler(context: CommandContext): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (context.player === undefined) {
        return;
      }
      if (context.player?.reward + 60 * 60 * 1000 <= Date.now() || context.player?.reward === 0) {
        await updatePlayer(context.user.id, {
          reward: Date.now(),
        });
        const rnd = getRndInteger(0, 1000);
        let box = 0;
        if (rnd >= 990) {
          box = 2;
        } else if (rnd >= 800) {
          box = 1;
        } else {
          box = 0;
        }
        addLootbox(context.user.id, box, 1);
        let questText = '';
        const quests = await getQuests(context.user.id);
        if (quests.length < 10) {
          const rand = getRndInteger(0, randomQuests.length);
          addQuest(context.user.id, randomQuests[rand]);
          questText = `New quest :\n - ${getQuestText(randomQuests[rand])}`;
        } else {
          questText = 'You cannot have more than 10 quests. Complete some and come back later!';
        }
        await sendEmbed({ context, message: `Reward:\n** - 1x ${lootboxesEmoji[box]} ${lootboxesNames[box]} Lootbox**\n\n${questText}`, image: null, thumbnail: null, author: context.user, footer: 'Come back in 60 minutes to get a new reward' });
        incrementQuest(context, context.user, 'tutorialReward', 1);
      } else if (moment(context.player?.reward + 60 * 60 * 1000).diff(new Date(), 'seconds') > 60) {
        sendEmbed({ context, message: `Come back in ${moment(context.player?.reward + 60 * 60 * 1000).diff(new Date(), 'minutes')} minutes to get your reward.`, image: null, thumbnail: null, author: context.user });
      } else {
        sendEmbed({ context, message: `Come back in ${moment(context.player?.reward + 60 * 60 * 1000).diff(new Date(), 'seconds')} seconds to get your reward.`, image: null, thumbnail: null, author: context.user });
      }
      resolve({});
    });
  },
};
