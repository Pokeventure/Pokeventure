import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext } from "../types/command";
import moment from "moment";
import { sendEmbed } from "../modules/utils";
import { Quest } from "../models/quest";
import randomQuests from "../../data/quests";
import { getQuestText, incrementQuest } from "../modules/quests";
import { lootboxesEmoji, lootboxesNames } from "../modules/lootbox";
import { addLootbox, addQuest } from "../modules/database";

export const Reward: Command = {
    commandName: "reward",
    displayName: "Reward",
    fullDescription: "You will receive a small reward and a quest to help you in your progress. You can claim it every 60 minutes.",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("reward")
        .setDescription("Get a small reward and a quest"),
    handler: async (context: CommandContext) => {
        if (moment(context.player.reward + 60 * 60 * 1000).diff(new Date(), "seconds") > 60) {
            return sendEmbed(context, { description: `Come back in ${moment(context.player?.reward + 60 * 60 * 1000).diff(new Date(), "minutes")} minutes to get your reward.` });
        } else if (moment(context.player.reward + 60 * 60 * 1000).diff(new Date(), "seconds") > 0) {
            return sendEmbed(context, { description: `Come back in ${moment(context.player?.reward + 60 * 60 * 1000).diff(new Date(), "seconds")} seconds to get your reward.` });
        }
        context.player.updateOne({ $set: { reward: Date.now() } }).exec();
        const box = context.client.chance.weighted([0, 1, 2], [80, 19, 1]);
        addLootbox(context.user.id, box, 1);
        let questText = "";
        const quests = await Quest.find({ discord_id: context.user.id }).exec();
        if (quests.length < 10) {
            const rand = context.client.chance.integer({ min: 0, max: randomQuests.length });
            addQuest({
                discord_id: context.user.id,
                ...randomQuests[rand]
            });
            questText = `New quest :\n - ${getQuestText(randomQuests[rand])}`;
        } else {
            questText = "You cannot have more than 10 quests. Complete some and come back later!";
        }
        incrementQuest(context, context.user, "tutorialReward", 1);
        await sendEmbed(context, { description: `Reward:\n** - 1x ${lootboxesEmoji[box]} ${lootboxesNames[box]} Lootbox**\n\n${questText}`, footer: { text: "Come back in 60 minutes to get a new reward" } });
    }
};