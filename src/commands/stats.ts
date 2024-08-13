import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext } from "../types/command";
import { Stats as StatsModel } from '../models/stats';
import { sendEmbed } from "../modules/utils";

export const Stats: Command = {
    commandName: 'stats',
    displayName: 'Stats',
    fullDescription: 'Displays stats about your Pokémon journey.',
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Display stats about your Pokémon journey'),
    async handler(context: CommandContext) {
        let userStats = await StatsModel.findOne({ discord_id: context.user.id }).exec();
        if (userStats === null) {
            userStats = new StatsModel();
        }
        const statsMessage = `Wild Pokémons encountered: ${userStats.stats.wild.toLocaleString() ?? 0}
            Pokémons caught: ${userStats.stats.catch?.toLocaleString() ?? 0}
            Shinies caught: ${userStats.stats.shiny?.toLocaleString() ?? 0}

            Pokéballs used: ${userStats.stats.pokeball?.toLocaleString() ?? 0}
            Greatballs used: ${userStats.stats.greatball?.toLocaleString() ?? 0}
            Ultraballs used: ${userStats.stats.ultraball?.toLocaleString() ?? 0}
            Masterballs used: ${userStats.stats.masterball?.toLocaleString() ?? 0}
            
            Raids participated in: ${userStats.stats.raids?.toLocaleString() ?? 0}
            Total raid damage: ${userStats.stats.raidsDamage?.toLocaleString() ?? 0}
            Gym trainers defeated: ${userStats.stats.gyms?.toLocaleString() ?? 0}
            Rare candy used: ${userStats.stats.rareCandy?.toLocaleString() ?? 0}
            Defeated trainers: ${userStats.stats.trainerDefeated?.toLocaleString() ?? 0}`;

        sendEmbed(context, { description: statsMessage, title: `${context.user.username}'s stats` });
    },
};
