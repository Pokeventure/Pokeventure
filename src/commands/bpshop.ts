import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import items from "../../data/items";
import shop from "../../data/bpshop";
import { pagination } from "../modules/utils";
import { Command, CommandContext } from "../types/command";

export const BpShop: Command = {
    commandName: "bpshop",
    displayName: "BP Shop",
    fullDescription: "Display all available items with their ID and with their prices. Some items may be available only during some events. Then you can buy items with their ID by using the `%PREFIX%bpbuy` command.\n\nUsage: `%PREFIX%bpshop <category>`\n\nExample: `%PREFIX%bpshop 1` to display all items from category 1.",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("bpshop")
        .setDescription("Open BP Shop")
        .addIntegerOption(
            (input) => input
                .setDescription("BP Shop category")
                .setName("category")
                .addChoices({
                    name: "Holdable",
                    value: 1
                }, {
                    name: "Usable",
                    value: 2,
                })
                .setRequired(true)
        )
        .setDMPermission(true),

    handler(context: CommandContext) {
        const category = [
            "Holdable",
            "Usable",
        ];
        const selectedCategory: number = context.interaction.options.getInteger("category", true) - 1;
        let text = `**You have ${context.player?.money.gems.toLocaleString()} BP <:bp:797019879337230356>**`;
        let itemList = ["", ""];
        let embed = new EmbedBuilder();
        embed.setTitle("**Poké Mart**").setDescription(text);
        const pages: EmbedBuilder[] = [embed];
        let currentPage = 0;
        let itemCounter = 0;
        for (let i = 0; i < shop.length; i++) {
            if (items[shop[i].id].category !== category[selectedCategory]) { continue; }

            const column = itemCounter % 10 > 4 ? 1 : 0;
            if (shop[i].price !== undefined) {
                itemList[column] += `\`#${i + 1}\` ${items[shop[i].id].emoji} **${items[shop[i].id].name}**\n${shop[i].price.toLocaleString()} BP <:bp:797019879337230356>\n`;
            }

            if (itemCounter >= 10) {
                if (itemList[0].length > 0) { pages[currentPage].addFields({ name: "\u2800", value: `${itemList[0]}`, inline: true }); }
                if (itemList[1].length > 0) { pages[currentPage].addFields({ name: "\u2800", value: `${itemList[1]}`, inline: true }); }
                currentPage++;
                pages[currentPage] = new EmbedBuilder().setTitle("**Poké Mart**").setDescription(text);
                itemList = ["", ""];
                itemCounter = 0;
            }
            itemCounter++;
        }
        if (itemList[0].length > 0 && itemList[1].length > 0) {
            pages[currentPage].addFields({ name: "\u2800", value: `${itemList[0]}`, inline: true });
            pages[currentPage].addFields({ name: "\u2800", value: `${itemList[1]}`, inline: true });
        }
        else if (itemList[0].length > 0) {
            pages[currentPage].addFields({ name: "\u2800", value: `${itemList[0]}`, inline: true });
        }
        else {
            pages.pop();
        }
        pagination(context, pages);
    },
};
