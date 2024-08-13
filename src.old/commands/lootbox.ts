import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import { getInventory, addLootbox, addToInventory } from '../modules/database';
import { getRandomLoot, lootboxesEmoji, lootboxesNames } from '../modules/lootbox';
import items from '../../data/items';
import { incrementQuest } from '../modules/quests';
import { SlashCommandBuilder } from '@discordjs/builders';

export const Lootbox: Command = {
    name: 'Lootbox',
    keywords: ['lootbox', 'loot', 'lb', 'lootboxes'],
    category: 'Items',
    fullDesc: 'Display all the lootboxes you own and open them. Each rarity contains different items and different rarirty.\n\n**Usage: `%PREFIX%lootbox`**\nTo see all the lootboxes you own.\n\n**Usage: `%PREFIX%lootbox open <number> <type>`**\nTo open lootbox a given number of lootboxes of a given type. If no number is given, you will open only one. If no type of lootbox has been given, first type available will be taken.\n\n**Usage: `%PREFIX%lootbox open all`**\nOpen all your lootboxes.\n\n**Example: `%PREFIX%lootbox open 3 rare`**\nWill open 3 Rare lootboxes.',
    requireStart: true,
    needPlayer: false,
    showInHelp: true,
    commandData: new SlashCommandBuilder()
        .setName('lootbox')
        .setDescription('Display all the lootboxes you own')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your lootboxex'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('open')
                .setDescription('Open a lootbox')
                .addBooleanOption(input => input.setName('all').setDescription('Open all your lootboxes'))
                .addIntegerOption(input => input.setName('amount').setDescription('Amount to open'))
                .addStringOption(input => input
                    .setName('type')
                    .setDescription('Type to open')
                    .addChoice('Common', 'common')
                    .addChoice('Rare', 'rare')
                    .addChoice('Legendary', 'legendary')
                    .addChoice('Birthday', 'birthday')
                )),

    handler(context: CommandContext): any {
        return new Promise((resolve, reject) => {
            if (context.commandInterction.options.getSubcommand(true) === 'view') {
                getInventory(context.user.id).then((inventory: any) => {
                    if (inventory === null || inventory.lootbox === null) {
                        sendEmbed({ context, message: 'You don\'t have any lootbox.' });
                        return;
                    }
                    let lootboxList = '';
                    for (const [key, value] of Object.entries(inventory.lootbox)) {
                        if ((<number>value) > 0) {
                            lootboxList += `${lootboxesEmoji[<any>key]} ${lootboxesNames[<any>key]} Lootbox x${(<number>value)}\n`;
                        }
                    }
                    sendEmbed({ context, message: `Here are all your lootboxes:\n${lootboxList}`, image: null, thumbnail: 'https://pokemon.neekhaulas.com/images/insignia-1.png', author: context.user, footer: 'You can open all of them with `/lootbox open all`' });
                }).catch((error) => {
                    reject(error);
                });
            } else if (context.commandInterction.options.getSubcommand(true) === 'open') {
                getInventory(context.user.id).then(async (inventory: { lootbox: { [key: number]: number } }) => {
                    let lootboxesOpened = 0;
                    if (inventory === null || inventory.lootbox === null) { sendEmbed({ context, message: 'You don\'t have any lootbox.' }); }
                    if (context.commandInterction.options.getBoolean('all')) {
                        let lootboxList: any = {};
                        for (const [key, value] of Object.entries(inventory.lootbox)) {
                            if ((value) > 0) {
                                lootboxesOpened += <number>value;
                                await addLootbox(context.user.id, parseInt(key), -value);
                                let loot = getRandomLoot(<any>key, <number>value);
                                for (const [key2, value2] of Object.entries(loot)) {
                                    if (lootboxList[key2] === undefined) {
                                        lootboxList[key2] = value2;
                                    } else {
                                        lootboxList[key2] += value2;
                                    }
                                }
                            }
                        }
                        let resultText = '';
                        for (const [key, value] of Object.entries(lootboxList)) {
                            if ((parseInt(key) === 258 || parseInt(key) === 259) && context.player !== undefined && context.player?.patronLevel <= 0) {
                                continue;
                            }
                            await addToInventory(context.user.id, parseInt(key), parseInt(<string>value));
                            resultText += `**${items[<any>key].emoji} ${items[<any>key].name}** x${value}\n`;
                        }
                        await sendEmbed({ context, message: `You opened all your lootboxes (${lootboxesOpened}). Here's what you got:\n${resultText}`, image: null, thumbnail: null, author: context.user });
                        incrementQuest(context, context.user, 'tutorialLootbox', lootboxesOpened);
                    } else {
                        let numberToOpen: number = context.commandInterction.options.getInteger('amount') ?? 1;
                        let box: any = 0;
                        if (context.commandInterction.options.getString('type') === 'common') {
                            box = 0;
                        } else if (context.commandInterction.options.getString('type') === 'rare') {
                            box = 1;
                        } else if (context.commandInterction.options.getString('type') === 'legendary') {
                            box = 2;
                        } else if (context.commandInterction.options.getString('type') === 'birthday') {
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
                            sendEmbed({ context, message: 'Number must be positive.', image: null, thumbnail: null, author: context.user });
                            return;
                        }
                        if (inventory.lootbox === undefined || inventory.lootbox[box] === undefined || inventory.lootbox[box] < numberToOpen) {
                            sendEmbed({ context, message: 'You don\'t have enought Lootbox to open them.', author: context.user });
                            return;
                        }
                        lootboxesOpened += numberToOpen;
                        await addLootbox(context.user.id, parseInt(box), -numberToOpen);
                        let loot = getRandomLoot(box, numberToOpen);
                        let lootboxList: any = {};
                        for (const [key2, value2] of Object.entries(loot)) {
                            if (lootboxList[key2] === undefined) {
                                lootboxList[key2] = value2;
                            } else {
                                lootboxList[key2] += value2;
                            }
                        }

                        let resultText = '';
                        for (const [key, value] of Object.entries(lootboxList)) {
                            if ((parseInt(key) === 258 || parseInt(key) === 259) && context.player !== undefined && context.player?.patronLevel <= 0) {
                                continue;
                            }
                            await addToInventory(context.user.id, parseInt(key), parseInt(<any>value));
                            resultText += `**${items[<any>key].emoji} ${items[<any>key].name}** x${value}\n`;
                        }
                        await sendEmbed({ context, message: `You opened ${numberToOpen} ${lootboxesNames[box]} Lootbox. Here's what you got:\n${resultText}`, image: null, thumbnail: null, author: context.user });
                        incrementQuest(context, context.user, 'tutorialLootbox', lootboxesOpened);
                    }
                }).catch((error) => {
                    reject(error);
                });
            }
        });
    },
};
