import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import { getStats } from '../modules/database';
import { SlashCommandBuilder } from '@discordjs/builders';

export const Stats: Command = {
  name: 'Stats',
  keywords: ['stats'],
  category: 'Bot',
  fullDesc: 'Displays stats about your Pokémon journey.',
  requireStart: true,
  needPlayer: false,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Display stats about your Pokémon journey'),

  handler(context: CommandContext): any {
    return new Promise((resolve, reject) => {
      getStats(context.user.id).then((stats) => {
        if (stats === null) {
          stats = {};
        } else {
          stats = stats.stats;
        }
        const statsMessage = `Wild Pokémons encountered: ${stats.wild?.toLocaleString() ?? 0}
            Pokémons caught: ${stats.catch?.toLocaleString() ?? 0}
            Shinies caught: ${stats.shiny?.toLocaleString() ?? 0}

            Pokéballs used: ${stats.pokeball?.toLocaleString() ?? 0}
            Greatballs used: ${stats.greatball?.toLocaleString() ?? 0}
            Ultraballs used: ${stats.ultraball?.toLocaleString() ?? 0}
            Masterballs used: ${stats.masterball?.toLocaleString() ?? 0}
            
            Raids participated in: ${stats.raids?.toLocaleString() ?? 0}
            Total raid damage: ${stats.raidsDamage?.toLocaleString() ?? 0}
            Gym trainers defeated: ${stats.gyms?.toLocaleString() ?? 0}
            Rare candy used: ${stats.rareCandy?.toLocaleString() ?? 0}
            Defeated trainers: ${stats.trainerDefeated?.toLocaleString() ?? 0}`;

        sendEmbed({ context, message: statsMessage, image: null, thumbnail: null, author: context.user, footer: null, title: `${context.user.username}'s stats` });
        resolve({});
      }).catch((error) => {
        reject(error);
      });
    });
  },
};
