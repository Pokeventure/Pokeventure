import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command, CommandContext } from "../types/command";
import { sendEmbed } from "../modules/utils";
import moment from "moment";
import { Api } from "@top-gg/sdk";
import { voteStreakItems } from "../../data/vote";
import items from "../../data/items";
import { addToInventory } from "../modules/database";

export const Vote: Command = {
    commandName: "vote",
    displayName: "Vote",
    fullDescription: "Vote for the bot and earn rewards.",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("vote")
        .setDescription("Vote for the bot.")
        .addBooleanOption(option => option.setName("remind").setDescription("Enable vote reminder when you do wild command"))
        .setDMPermission(true),
    handler: async (context: CommandContext) => {
        if (context.interaction.options.getBoolean("remind")) {
            context.player.remindVote = !context.player.remindVote;
            await context.player.save();
            if (context.player.remindVote) {
                sendEmbed(context, { description: "You will be reminded to vote when you will do `/wild`" });
            } else {
                sendEmbed(context, { description: "Vote reminder disabled." });
            }
        } else {
            if (moment() >= moment(context.player.voted).add(12, "h")) {
                const api = new Api(process.env.TOPGG_API ?? "");
                const hasVoted = await api.hasVoted(context.user.id);
                if (hasVoted) {
                    let streak = context.player.voteStreak || 0;
                    streak += 1;
                    const calculatedStreak = ((streak - 1) % 32);
                    let bonusTime = false;
                    context.player.voteStreak = streak;
                    context.player.voted = new Date();
                    context.player.save();
                    if (moment(context.player.voted).add(24, "hour") > moment()) {
                        bonusTime = true;
                        await addToInventory(context.user.id, 95, 10);
                    }
                    await addToInventory(context.user.id, voteStreakItems[calculatedStreak].item, voteStreakItems[calculatedStreak].quantity);

                    await sendEmbed(context, { description: `Thanks for voting! You received **x${voteStreakItems[calculatedStreak].quantity}  ${items[voteStreakItems[calculatedStreak].item].emoji} ${items[voteStreakItems[calculatedStreak].item].name}**!${bonusTime ? `\n\n**Because you voted again in less than 24 hours,\nyou got an additional x10 ${items[95].emoji} ${items[95].name}**` : ""}\n\nYou can vote again in 12 hours!\n\nCurrent bonus: ${streak}.\n\nVote within 24 hours to get an additional reward.` });
                }
            }

            const embed = new EmbedBuilder();
            embed
                .setDescription("__You can vote **every 12 hours** for Pokéventure:__\n**https://top.gg/bot/666956518511345684/vote**\nVote once at least every 24 hours to get an additional reward.")
                .setImage(`http://image.pokeventure.com/vote.php?d=${context.player?.voteStreak === 0 ? 0 : (((context.player?.voteStreak ?? 0) - 1) % 32) + 1}`)
                .setTitle("Vote for Pokeventure")
                .setColor("#ff0000")
                .addFields({
                    name: "Streak Reward",
                    value: "#5: x2 <:luckyegg:797819244749914143> Lucky Egg\n#10: x2 <:pass:746747476811317258> Mega Raid Pass\n#15: x5 <:rarecandy:741810381340803112> Rare Candy\n#20: x5 <:masterball:741809195178917999> Masterball\n#25: x2 <:ivscanner:746747237475942480> Rarity Scanner\n#30: x2 <:shinyfinder:746747520763297832> Shiny Scanner\n#32: x1 <:raritygem:861529796009132032> Rarity Gem",
                    inline: false
                }, {
                    name: "Current bonus",
                    value: `${context.player?.voteStreak === 0 ? 0 : (((context.player?.voteStreak ?? 0) - 1) % 32) + 1}`,
                    inline: false
                },);
            if (moment() < moment(context.player?.voted).add(24, "hour") && context.player?.voted !== undefined) {
                embed.addFields({
                    name: "Last time voted",
                    value: `${moment().diff(moment(context.player?.voted), "h")} hours ago`,
                    inline: true
                });
            } else {
                embed.addFields({
                    name: "You can vote",
                    value: "\u2800",
                    inline: true
                });
            }
            context.interaction.followUp({
                embeds: [embed], components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                url: "https://top.gg/bot/666956518511345684",
                                style: 5,
                                label: "Vote here"
                            }
                        ]
                    }
                ]
            });
        }
    }
};