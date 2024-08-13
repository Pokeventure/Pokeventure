import { Command, CommandContext } from "../types/command";
import { Embed, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Inventory as InventoryModel } from "../models/inventory";
import { pagination, sendEmbed } from "../modules/utils";
import items, { getItemById } from "../../data/items";

export const Inventory: Command = {
    commandName: 'inventory',
    displayName: 'Inventory',
    fullDescription: 'Inventory desc',
    needPlayer: true,
    requireStart: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Show your items in your bag'),
    async handler(context: CommandContext) {
        let inventory = await InventoryModel.findOne({ discord_id: context.user.id }).exec();
        if (inventory === null || inventory.inventory === undefined) {
            return sendEmbed(context, { description: 'You bag is empty' });
        }

        let pages: EmbedBuilder[] = [];
        pages.push(new EmbedBuilder()
            .setTitle('Inventory'));
        let itemCounter = 0;
        let currentPage = 0;
        let itemList = ['', ''];
        for (const [key, value] of Object.entries(inventory.inventory)) {
            if (value.quantity > 0) {
                const column = itemCounter % 10 > 4 ? 1 : 0;

                itemList[column] += `${getItemById(key)?.emoji} **${getItemById(key)?.name}** x${value.quantity}\n`;
                itemCounter++;
            }

            if (itemCounter >= 10) {
                if (itemList[0].length > 0) { pages[currentPage].addFields({ name: '\u2800', value: `${itemList[0]}`, inline: true }); }
                if (itemList[1].length > 0) { pages[currentPage].addFields({ name: '\u2800', value: `${itemList[1]}`, inline: true }); }
                let newPage = new EmbedBuilder()
                    .setTitle('Inventory');
                pages.push(newPage);
                itemList = ['', ''];
                currentPage++;
                itemCounter = 0;
            }
        }
        if (itemList[0].length > 0 && itemList[1].length > 0) {
            pages[currentPage].addFields({ name: '\u2800', value: `${itemList[0]}`, inline: true });
            pages[currentPage].addFields({ name: '\u2800', value: `${itemList[1]}`, inline: true });
        }
        else if (itemList[0].length > 0) {
            pages[currentPage].addFields({ name: '\u2800', value: `${itemList[0]}`, inline: true });
        }
        else {
            pages.pop();
        }

        pagination(context, pages);
    },
}