import { SlashCommandBuilder } from "discord.js";
import { sendEmbed } from "../modules/utils";
import { Command } from "../types/command";

export const Balance: Command = {
    commandName: "balance",
    displayName: "Balance",
    fullDescription: "Display all your currencies.\n\nExample: `%PREFIX%money`",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("balance")
        .setDescription("Display your currencies"),

    handler(context) {
        let eventCurrency = "";
        /*if(event.currency) {
          eventCurrency = `\n${event.currencyEmoji} **${event.currencyName}**: ${context.player?.money.tickets}`;
        }*/
        sendEmbed(context, { description: `Here is your money:\n<:pokecoin:741699521725333534> **Coins**: ${context.player?.money.coins.toLocaleString()}\n<:bp:797019879337230356> **BP**: ${context.player?.money.gems.toLocaleString()}${eventCurrency}` });
    },
};
