import { Command, CommandContext } from "../types/command";
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Quest } from "../models/quest";
import items from "../../data/items";
import { lootboxesNames, lootboxesEmoji } from "../modules/lootbox";
import { getQuestText } from "../modules/quests";
import { sendEmbed } from "../modules/utils";
import { __ } from "../modules/i18n";

export const Quests: Command = {
    commandName: "quests",
    displayName: "Quests",
    fullDescription: "COMMAND.QUESTS.FULL_DESCRIPTION",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("quests")
        .setDescription("Display your quests."),
    async handler(context: CommandContext) {
        const quests = await Quest.find({ discord_id: context.user.id }).exec();
        if (quests.length > 0) {
            let questsText = "";
            quests.forEach(quest => {
                let rewardText = "";
                quest.reward.forEach((reward: any) => {
                    if (reward.item !== undefined) {
                        console.log(reward);
                        rewardText += `- ${items[reward.item].emoji} x${reward.quantity.toLocaleString()} ${items[reward.item].name}\n`;
                    } else if (reward.lootbox !== undefined) {
                        rewardText += `- ${lootboxesEmoji[reward.lootbox]} x${reward.quantity.toLocaleString()} ${lootboxesNames[reward.lootbox]}\n`;
                    } else if (reward.pokemon !== undefined) {
                        rewardText += "- A special Pokémon!\n";
                    } else if (reward.randomPokemon !== undefined) {
                        rewardText += "- A special Pokémon!\n";
                    }
                });

                if (quest.event) { questsText += "**[EVENT]** "; }
                if (quest.patreon) { questsText += "**[PATREON]** "; }
                questsText += getQuestText(quest);
                if (quest.repeatable) { questsText += "\n🔁 This quest can be repeated."; }
                questsText += `\n${rewardText}\n`;
            });
            sendEmbed(context, { description: questsText, title: "Quests" });
        } else {
            sendEmbed(context, { description: __("COMMAND.QUESTS.NO_QUEST", context.interaction.locale) });
        }
    },
};
