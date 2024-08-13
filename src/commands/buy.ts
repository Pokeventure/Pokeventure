import { sendEmbed } from "../modules/utils";
import shop from "../../data/shop";
import { incrementQuest } from "../modules/quests";
import { Command } from "../types/command";
import { SlashCommandBuilder } from "discord.js";
import { addCoins, addToInventory } from "../modules/database";

export const Buy: Command = {
    commandName: "buy",
    displayName: "Buy",
    fullDescription: "Command to buy item from the shop. You can buy items with their ID that you can find by using the command `%PREFIX%shop`.\n\nUsage: `%PREFIX%buy <ID> [quantity]`\n\n\nExample: `%PREFIX%shop 1` to buy the item with ID 1.\nExample: `%PREFIX%shop 3 12` to buy 12 items with ID 3.",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("buy")
        .setDescription("Buy an item from the Poké Mart.")
        .addIntegerOption(
            (input) => input
                .setDescription("Item ID to buy")
                .setName("item")
                .setRequired(true),
        ).addIntegerOption(
            (input) => input
                .setDescription("Quantity")
                .setName("quantity")
                .setRequired(false)
        )
        .setDMPermission(true),

    async handler(context) {
        if (!context.player) return;
        const selectedItem = context.interaction.options.getInteger("item", true) - 1;
        let quantity = context.interaction.options.getInteger("quantity") ?? 1;
        if (quantity <= 0) {
            return sendEmbed(context, { description: "Quantity should be positive." });
        }
        const item = shop[selectedItem];
        if (item === undefined) {
            return sendEmbed(context, { description: "Invalid item." });
        }
        if (item.price) {
            const price = (context.player?.patronLevel !== undefined && context.player?.patronLevel >= 4 ? Math.round(item.price * 0.75) : item.price);
            if (context.player.money.coins >= price * quantity) {
                addCoins(context.user.id, -price * quantity, "shop");
                addToInventory(context.user.id, item.id, quantity);
                await sendEmbed(context, { description: `You successfully purchased x${quantity} ${item.name}.`, author: context.user });
                incrementQuest(context, context.user, "tutorialShop", 1);
            } else {
                sendEmbed(context, { description: `You don"t have enough coins to buy x${quantity} ${item.name}.`, author: context.user });
            }
        } /* else if (item.currency) {
      const price = item.currency;
      if (context.player?.money.tickets >= price * quantity) {
        addCurrency(context.player, -price * quantity);
        addToInventory(context.user.id, item.id, quantity);
        await sendEmbed(context, { description: `You successfully purchased ${quantity} ${item.name}.`, author: context.user });
        incrementQuest(context, context.user, "tutorialShop", 1);
      } else {
        sendEmbed(context, { description: `You don"t have enough currencies to buy ${quantity} ${item.name}.`,  author: context.user });
      }
    } */
    }
};