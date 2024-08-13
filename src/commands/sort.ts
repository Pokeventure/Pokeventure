import { SlashCommandBuilder } from "discord.js";
import { sendEmbed } from "../modules/utils";
import { Command } from "../types/command";

export const Sort: Command = {
    commandName: 'sort',
    displayName: 'Sort',
    fullDescription: 'Command to sort your Pokémons in the `%PREFIX%pokemons` command. You can sort by these criters:\n- Level\n- Rarity\n- Favorite\n- Shiny\n\nUsage: `%PREFIX%sort [option]`\nAvailable options: `level`, `rarity`, `favorite`, `shiny`, `number` (for Pokédex number).\nNote: Add `-` in front of the option to inverse the order.\nNote: Leave option empty to reset sort\n\nExample: `%PREFIX%sort level` will sort Pokémons by level in ascending order.\nExample: `%PREFIX%sort -rarity` will sort Pokémons by rarity in descending order.\nExample: `%PREFIX%sort` to reset to default order (catch date).',
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName('sort')
        .setDescription('Sort your box')
        .addStringOption(option => option
            .setName('order')
            .setDescription('Order by')
            .addChoices({
                name: 'Level',
                value: 'level'
            }, {
                name: 'Shiny',
                value: 'shiny'
            }, {
                name: 'Rarity',
                value: 'rarity'
            }, {
                name: 'Favorite',
                value: 'favorite'
            }, {
                name: 'Number',
                value: 'number'
            })
        )
        .addBooleanOption(option => option.setName('opposite').setDescription('Use opposite filter'))
        .setDMPermission(true),

    handler(context) {
        if (!context.player) return;
        if (context.interaction.options.getString('order') !== null) {
            switch (context.interaction.options.getString('order', true)) {
                case 'level':
                    if (context.interaction.options.getBoolean('opposite')) {
                        context.player.sort = { level: -1 };
                        sendEmbed(context, { description: 'Pokémon list will be sorted by level in descending order.', author: context.user });
                    } else {
                        context.player.sort = { level: 1 };
                        sendEmbed(context, { description: 'Pokémon list will be sorted by level in ascending order.', author: context.user });
                    }
                    break;
                case 'shiny':
                    if (context.interaction.options.getBoolean('opposite')) {
                        context.player.sort = { shiny: 1 };
                        sendEmbed(context, { description: 'Pokémon list will display shiny Pokémons last', author: context.user });
                    } else {
                        context.player.sort = { shiny: -1 };
                        sendEmbed(context, { description: 'Pokémon list will display shiny Pokémons first', author: context.user });
                    }
                    break;
                case 'rarity':
                    if (context.interaction.options.getBoolean('opposite')) {
                        context.player.sort = { rarity: -1 };
                        sendEmbed(context, { description: 'Pokémon list will be sorted by rarity in descending order.', author: context.user });
                    } else {
                        context.player.sort = { rarity: 1 };
                        sendEmbed(context, { description: 'Pokémon list will be sorted by rarity in ascending order.', author: context.user });
                    }
                    break;
                case 'favorite':
                    if (context.interaction.options.getBoolean('opposite')) {
                        context.player.sort = { fav: 1 };
                        sendEmbed(context, { description: 'Pokémon list will display favorite Pokémons last', author: context.user });
                    } else {
                        context.player.sort = { fav: -1 };
                        sendEmbed(context, { description: 'Pokémon list will display favorite Pokémons first', author: context.user });
                    }
                    break;
                case 'number':
                    if (context.interaction.options.getBoolean('opposite')) {
                        context.player.sort = { dexId: -1 };
                        sendEmbed(context, { description: 'Pokémon list will display by number in Pokédex in descending order.', author: context.user });
                    } else {
                        context.player.sort = { dexId: 1 };
                        sendEmbed(context, { description: 'Pokémon list will display by number in Pokédex in ascending order.', author: context.user });
                    }
                    break;
                default:
                    context.player.sort = { _id: 1 };
                    sendEmbed(context, { description: 'Pokémon list will be sorted by catch date.', author: context.user });
                    break;
            }
            context.player.save();
        } else {
            context.player.sort = { _id: 1 };
            context.player.save();
            sendEmbed(context, { description: 'Pokémon list will be sorted by catch date.', author: context.user });
        }
    },
};
