import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import { getQuests } from '../modules/database';
import items from '../../data/items';
import { lootboxesNames, lootboxesEmoji } from '../modules/lootbox';
import { getPokemon } from '../modules/pokedex';
import event from '../../data/event';
import { getQuestText } from '../modules/quests';
import { SlashCommandBuilder } from '@discordjs/builders';

export const Quests: Command = {
  name: 'Quests',
  keywords: ['quests', 'q', 'quest'],
  category: 'Bot',
  fullDesc: 'Will display all your quests. You will see the requirement to comple the quest and the progress of it. You can get quests using the `%PREFIX%reward` command.\n\nExemple: `%PREFIX%quests`',
  requireStart: true,
  needPlayer: false,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('quests')
    .setDescription('Display your quests.'),

  handler(context: CommandContext): Promise<any> {
    return new Promise((resolve, reject) => {
      getQuests(context.user.id).then((quests) => {
        if (quests.length > 0) {
          let questsText = '';
          quests.forEach((quest: any) => {
            let rewardText = '';
            quest.reward.forEach((reward: any) => {
              if (reward.item !== undefined) {
                rewardText += `- ${items[reward.item].emoji} x${reward.quantity.toLocaleString()} ${items[reward.item].name}\n`;
              } else if (reward.lootbox !== undefined) {
                rewardText += `- ${lootboxesEmoji[reward.lootbox]} x${reward.quantity.toLocaleString()} ${lootboxesNames[reward.lootbox]}\n`;
              } else if (reward.pokemon !== undefined) {
                rewardText += '- A special Pokémon!\n';
              } else if (reward.randomPokemon !== undefined) {
                rewardText += '- A special Pokémon!\n';
              }
            });

            if (quest.event) { questsText += '**[EVENT]** '; }
            if (quest.patreon) { questsText += '**[PATREON]** '; }
            questsText += getQuestText(quest);
            if (quest.repeatable) { questsText += '\n🔁 This quest can be repeated.'; }
            questsText += `\n${rewardText}\n`;
          });
          sendEmbed({ context, message: questsText, image: null, thumbnail: null, author: context.user, footer: null, title: 'Quests' });
        } else {
          sendEmbed({ context, message: 'You don\'t have any quest. You can get quests with your rewards. (\`%PREFIX%reward\`)' });
        }
        resolve({});
      }).catch((e) => {
        reject(e);
      });
    });
  },
};
