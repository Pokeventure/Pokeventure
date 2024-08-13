import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext } from "../types/command";
import { Inventory } from "../models/inventory";
import { sendEmbed } from "../modules/utils";
import { getRandomLoot, lootboxesEmoji, lootboxesNames } from "../modules/lootbox";
import items from "../../data/items";
import { addLootbox, addToInventory } from "../modules/database";
import { incrementQuest } from "../modules/quests";


export const Lootbox: Command = {
    commandName: "lootbox",
    displayName: "Lootbox",
    fullDescription: "",
    requireStart: false,
    needPlayer: false,
    showInHelp: false,
    data: () => new SlashCommandBuilder()
        .setName("lootbox")
        .setDescription("Display all the lootboxes you own")
        .addSubcommand(subcommand =>
            subcommand
                .setName("view")
                .setDescription("View your lootboxex"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("open")
                .setDescription("Open a lootbox")
                .addBooleanOption(input => input.setName("all").setDescription("Open all your lootboxes"))
                .addIntegerOption(input => input.setName("amount").setDescription("Amount to open"))
                .addStringOption(input => input
                    .setName("type")
                    .setDescription("Type to open")
                    .addChoices(
                        { name: "Common", value: "common" },
                        { name: "Rare", value: "rare" },
                        { name: "Legendary", value: "legendary" },
                        { name: "Birthday", value: "birthday" },
                    )
                ))
        .setDMPermission(true),
    handler: async (context: CommandContext) => {
        if (context.interaction.options.getSubcommand(true) === "view") {
            const inventory = await Inventory.findOne({ discord_id: context.user.id });
            if (!inventory || !inventory.lootbox) {
                return sendEmbed(context, { description: "You don't have any lootbox." });
            }
            let lootboxList = "";
            for (const [key, value] of Object.entries(inventory.lootbox)) {
                if ((<number>value) > 0) {
                    lootboxList += `${lootboxesEmoji[<any>key]} ${lootboxesNames[<any>key]} Lootbox x${(<number>value)}\n`;
                }
            }
            sendEmbed(context, { description: `Here are all your lootboxes:\n${lootboxList}`, footer: { text: "You can open all of them with `/lootbox open all`" } });
        } else if (context.interaction.options.getSubcommand(true) === "open") {
            const inventory = await Inventory.findOne({ discord_id: context.user.id });

            let lootboxesOpened = 0;
            if (!inventory || !inventory.lootbox) {
                return sendEmbed(context, { description: "You don't have any lootbox." });
            }
            if (context.interaction.options.getBoolean("all")) {
                const lootboxList: any = {};
                for (const [key, value] of Object.entries(inventory.lootbox)) {
                    if ((value) > 0) {
                        lootboxesOpened += <number>value;
                        await addLootbox(context.user.id, parseInt(key), -value);
                        const loot = getRandomLoot(<any>key, <number>value);
                        for (const [key2, value2] of Object.entries(loot)) {
                            if (lootboxList[key2] === undefined) {
                                lootboxList[key2] = value2;
                            } else {
                                lootboxList[key2] += value2;
                            }
                        }
                    }
                }
                let resultText = "";
                for (const [key, value] of Object.entries(lootboxList)) {
                    if ((parseInt(key) === 258 || parseInt(key) === 259) && context.player !== undefined && context.player?.patronLevel <= 0) {
                        continue;
                    }
                    await addToInventory(context.user.id, parseInt(key), parseInt(<string>value));
                    resultText += `**${items[<any>key].emoji} ${items[<any>key].name}** x${value}\n`;
                }
                await sendEmbed(context, { description: `You opened all your lootboxes (${lootboxesOpened}). Here's what you got:\n${resultText}` });
                incrementQuest(context, context.user, "tutorialLootbox", lootboxesOpened);
            } else {
                const numberToOpen: number = context.interaction.options.getInteger("amount") ?? 1;
                let box: any = 0;
                if (context.interaction.options.getString("type") === "common") {
                    box = 0;
                } else if (context.interaction.options.getString("type") === "rare") {
                    box = 1;
                } else if (context.interaction.options.getString("type") === "legendary") {
                    box = 2;
                } else if (context.interaction.options.getString("type") === "birthday") {
                    box = 3;
                } else {
                    box = -1;
                }
                if (box === -1) {
                    if (inventory.lootbox !== undefined) {
                        if (inventory.lootbox[0] !== undefined && inventory.lootbox[0] >= numberToOpen) {
                            box = 0;
                        } else if (inventory.lootbox[1] !== undefined && inventory.lootbox[1] >= numberToOpen) {
                            box = 1;
                        } else if (inventory.lootbox[2] !== undefined && inventory.lootbox[2] >= numberToOpen) {
                            box = 2;
                        } else if (inventory.lootbox[3] !== undefined && inventory.lootbox[3] >= numberToOpen) {
                            box = 3;
                        } else {
                            box = 0;
                        }
                    }
                }
                if (numberToOpen <= 0) {
                    return sendEmbed(context, { description: "Number must be positive." });
                    return;
                }
                if (inventory.lootbox === undefined || inventory.lootbox[box] === undefined || inventory.lootbox[box] < numberToOpen) {
                    return sendEmbed(context, { description: "You don't have enought Lootbox to open them." });
                }
                lootboxesOpened += numberToOpen;
                await addLootbox(context.user.id, parseInt(box), -numberToOpen);
                const loot = getRandomLoot(box, numberToOpen);
                const lootboxList: any = {};
                for (const [key2, value2] of Object.entries(loot)) {
                    if (lootboxList[key2] === undefined) {
                        lootboxList[key2] = value2;
                    } else {
                        lootboxList[key2] += value2;
                    }
                }

                let resultText = "";
                for (const [key, value] of Object.entries(lootboxList)) {
                    if ((parseInt(key) === 258 || parseInt(key) === 259) && context.player !== undefined && context.player?.patronLevel <= 0) {
                        continue;
                    }
                    await addToInventory(context.user.id, parseInt(key), parseInt(<any>value));
                    resultText += `**${items[<any>key].emoji} ${items[<any>key].name}** x${value}\n`;
                }
                await sendEmbed(context, { description: `You opened ${numberToOpen} ${lootboxesNames[box]} Lootbox. Here's what you got:\n${resultText}`, image: null, thumbnail: null, author: context.user });
                incrementQuest(context, context.user, "tutorialLootbox", lootboxesOpened);
            }
        }
    }
};