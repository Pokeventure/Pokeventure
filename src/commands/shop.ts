import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import items from "../../data/items";
import shop from "../../data/shop";
import { pagination, sendEmbed } from "../modules/utils";
import { Command } from "../types/command";

export const Shop: Command = {
    commandName: 'shop',
    displayName: 'Shop',
    fullDescription: 'Display all available items with their ID and with their prices. Some items may be available only during some events. Then you can buy items with their ID by using the `%PREFIX%buy` command.\n\nUsage: `%PREFIX%shop <category>`\n\nExample: `%PREFIX%shop 1` to display all items from category 1.',
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Open the Poké Mart.')
        .addIntegerOption(
            (input) => input
                .setDescription('Shop category')
                .setName('category')
                .addChoices({
                    name: 'Balls',
                    value: 0
                }, {
                    name: 'Evolution',
                    value: 1
                }, {
                    name: 'Usable',
                    value: 2
                }, {
                    name: 'Treats',
                    value: 3
                },/*{
                    name: 'Balls', 
                    value: 0
                },*/)
                .setRequired(true)
        )
        .setDMPermission(true),

    handler(context) {
        const category = [
            'Balls',
            'Evolution',
            'Usable',
            'Treats',
        ];
        const selectedCategory: number = context.interaction.options.getInteger('category', true);
        let text = `**You have ${context.player?.money.coins.toLocaleString()} <:pokecoin:741699521725333534> and ${context.player?.money.tickets.toLocaleString()} ❄️**`;
        let itemList = ['', ''];
        let embed = new EmbedBuilder();
        embed.setTitle('**Poké Mart**').setDescription(text);
        const pages: EmbedBuilder[] = [embed];
        let currentPage = 0;
        let itemCounter = 0;
        for (let i = 0; i < shop.length; i++) {
            if ((shop[i].category === undefined && items[shop[i].id].category !== category[selectedCategory]) || (shop[i].category !== undefined && shop[i].category !== category[selectedCategory])) { continue; }

            const column = itemCounter % 10 > 4 ? 1 : 0;
            if (shop[i].price !== undefined) {
                itemList[column] += `\`#${i + 1}\` ${items[shop[i].id].emoji} **${shop[i].name}**\n${(context.player?.patronLevel !== undefined && context.player?.patronLevel >= 4 ? Math.round((shop[i].price ?? 0) * 0.75) : shop[i].price ?? 0).toLocaleString()} coins <:pokecoin:741699521725333534>\n`;
            } /* else if (shop[i].currency !== undefined) {
                    itemList[column] += `\`#${i + 1}\` ${items[shop[i].id].emoji} **${shop[i].name}**\n${(shop[i].currency ?? 0).toLocaleString()} ${event.currencyName} ${event.currencyEmoji}\n`;
                } */

            if (itemCounter >= 10) {
                if (itemList[0].length > 0) { pages[currentPage].addFields({ name: '\u2800', value: `${itemList[0]}`, inline: true }); }
                if (itemList[1].length > 0) { pages[currentPage].addFields({ name: '\u2800', value: `${itemList[1]}`, inline: true }); }
                currentPage++;
                pages[currentPage] = new EmbedBuilder().setTitle('**Poké Mart**').setDescription(text);
                itemList = ['', ''];
                itemCounter = 0;
            }
            itemCounter++;
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
};
