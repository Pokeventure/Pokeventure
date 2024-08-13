import { SlashCommandBuilder } from "discord.js";
import { Player } from "../models/player";
import { addCoins, createMoneyLog } from "../modules/database";
import { sendEmbed } from "../modules/utils";
import { Command } from "../types/command";

export const Give: Command = {
    commandName: "give",
    displayName: "Give",
    fullDescription: "Command to send money to an other player.\n\nUsage: `%PREFIX%give @player <amount>`",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("give")
        .setDescription("Send money to an other play.")
        .addUserOption(
            (input) => input
                .setName("player")
                .setDescription("Player to give money to")
                .setRequired(true))
        .addIntegerOption(option => option.setName("amount").setDescription("Amount of money to send").setRequired(true))
        .setDMPermission(true),

    async handler(context) {
        if (!context.player) return;
        if (context.player.tradeLocked) {
            return sendEmbed(context, { description: "You can't use Give because you have been caught doing activities against the bot rules." });
        }
        const mention = context.interaction.options.getUser("player", true);
        if (mention.bot) {
            return sendEmbed(context, { description: "You can't send money to a bot." });
        }
        const receiver = await Player.findOne({ discord_id: mention.id });
        if (receiver === null) {
            return sendEmbed(context, { description: "This user is not playing Pokeventure." });
        }
        if (receiver.tradeLocked) {
            return sendEmbed(context, { description: `You can't send money to <@${mention.id}> because they have been caught doing activities against the bot rules.` });
        }
        const money = context.interaction.options.getInteger("amount", true);
        if (isNaN(money) || money <= 0) {
            sendEmbed(context, { description: "Invalid amount value." });
        } else if (money > 50000000) {
            sendEmbed(context, { description: "Amount should be under 50,000,000" });
        } else if (context.player.money.coins < money) {
            sendEmbed(context, { description: "You don\"t have enough money." });
        } else {
            await addCoins(context.user.id, -money, "giver");
            await addCoins(mention.id, money, "receiver");
            createMoneyLog(context.user.id, mention.id, money);
            sendEmbed(context, { description: `You sent ${money.toLocaleString()} <:pokecoin:741699521725333534> Coins to <@${mention.id}>.` });
        }
    }
};