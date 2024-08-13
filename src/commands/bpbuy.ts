import { SlashCommandBuilder } from "discord.js";
import shop from "../../data/bpshop";
import items from "../../data/items";
import { addBattlePoints, addToInventory } from "../modules/database";
import { sendEmbed } from "../modules/utils";
import { Command, CommandContext } from "../types/command";

export const BpBuy: Command = {
    commandName: "bpbuy",
    displayName: "BP Buy",
    fullDescription: "Command to buy item from the BP shop. You can buy items with their ID that you can find by using the command `%PREFIX%bpshop`.\n\nUsage: `%PREFIX%bpbuy <ID> [quantity]`\n\n\nExample: `%PREFIX%bpshop 1` to buy the item with ID 1.\nExample: `%PREFIX%bpshop 3 12` to buy 12 items with ID 3.",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("bpbuy")
        .setDescription("Buy item with BP")
        .addIntegerOption(option => option.setName("item").setDescription("Item ID to buy").setRequired(true))
        .addIntegerOption(option => option.setName("quantity").setDescription("Quantity"))
        .setDMPermission(true),

    handler(context: CommandContext) {
        if (!context.player) return;
        const selectedItem = context.interaction.options.getInteger("item", true) - 1;
        let quantity = context.interaction.options.getInteger("quantity") ?? 1;
        if (quantity <= 0) {
            return sendEmbed(context, { description: "Quantity should be positive.", image: null, thumbnail: null, author: context.user });
        }
        const item = shop.find((x) => x.id === selectedItem);
        if (item === undefined) {
            return sendEmbed(context, { description: "Invalid item.", image: null, thumbnail: null, author: context.user });
        }
        const { price } = item;
        if (context.player?.money.gems >= price * quantity) {
            addBattlePoints(context.player, -price * quantity);
            addToInventory(context.user.id, selectedItem, quantity * (item.quantity ?? 1));
            sendEmbed(context, { description: `You successfully purchased ${quantity * (item.quantity ?? 1)} ${items[item.id].name}.`, image: null, thumbnail: null, author: context.user });
        } else {
            sendEmbed(context, { description: `You don"t have enough BP to buy ${items[item.id].name}.`, image: null, thumbnail: null, author: context.user });
        }
    },
};
