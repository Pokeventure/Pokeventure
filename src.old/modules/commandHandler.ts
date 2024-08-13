import { Command, CommandContext, User } from 'command';
import { Player } from 'pokemon';
import { Chance } from 'chance';
import { getPlayer } from './database';
import { choiceMaker, sendEmbed } from './utils';
import Client from './client';
import { Pokedex as PokedexImport } from '../../simulator/.data-dist/pokedex';
import { getPokemon } from './pokedex';
import Logger from './logger';
import { ButtonInteraction, CommandInteraction, Interaction, MessageActionRow, MessageButton, MessageComponentInteraction, MessageEmbed, SelectMenuInteraction } from 'discord.js';
import { Routes } from 'discord-api-types/v9';

const Pokedex: any = PokedexImport;

const lock: any = {};

const mods = [
    '226519874367651840', // Taco
    '740223366052577362', // Missy
    '368516527730851841', // Necro
    '790313248334807051', // krumm dog
    '705896216734597193', // ceebs
    '756959043775496242', // skarl
];

export default class CommandHandler {
    commands: Command[] = [];
    commandsForRest: any[] = [];

    registerCommand(command: Command) {
        this.commands.push(command);
        if (command.commandData !== undefined) {
            this.commandsForRest.push((<any>command.commandData).toJSON());
        }
    }

    /* async handleInteraction(client: Client, commandName: string, args: string[], messageId: string, channelId: string, guildId: string, user: User) {
        const matchingCommand = this.commands.find(command => {
            return command.keywords.some(x => commandName === x);
        });

        if (matchingCommand) {
            let channel = undefined;
            let message = undefined;
            let fetchedUser = undefined;
            if (guildId !== undefined) {
                let guild = client.discordClient.guilds.find((i) => i.id === guildId);
                channel = <TextableChannel>guild?.channels.find((i) => i.id === channelId);
                message = await channel.getMessage(messageId);
                fetchedUser = await guild?.getRESTMember(user.id);
            } else {
                fetchedUser = await client.discordClient.getRESTUser(user.id);
                channel = await fetchedUser.getDMChannel();
                message = await channel.getMessage(messageId);
            }
            if (channel !== undefined && message !== undefined && fetchedUser !== undefined) {
                let player = null;
                if (matchingCommand.needPlayer) {
                    player = await getPlayer(user.id);
                }
                let context: CommandContext = {
                    client,
                    prefix: '',
                    channel,
                    message,
                    args,
                    caseArgs: args,
                    addReactions: false,
                    externalEmojis: false,
                    manageMessages: false,
                    player,
                    user: {
                        id: user.id,
                        username: fetchedUser.username,
                        avatarURL: fetchedUser.avatarURL,
                    },
                };
                await matchingCommand.handler(context);
            }
        }
    } */

    async handleCommand(client: Client, commandName: string, interaction: ButtonInteraction | CommandInteraction | SelectMenuInteraction, channelLock: boolean, commandLock?: any[], args?: string[]) {
        const matchingCommand = this.commands.find(command => {
            return command.keywords.some(x => commandName === x);
        });

        if (matchingCommand) {
            if (channelLock && !matchingCommand.ignoreLock) {
                if (interaction.user.id !== '146382118778437632' && !(mods.includes(interaction.user.id) && interaction.guildId === '446025712600875020')) {
                    interaction.deleteReply();
                    return;
                }
            }
            if (!matchingCommand.ignoreCommandLock && commandLock !== undefined && commandLock.length > 0 && commandLock.indexOf(matchingCommand.keywords[0]) === -1) {
                if (interaction.user.id !== '146382118778437632' && !(mods.includes(interaction.user.id) && interaction.guildId === '446025712600875020')) {
                    interaction.deleteReply();
                    return;
                }
            }
            if (process.env.BETA !== undefined) {
                if (matchingCommand.betaRestricted) {
                    interaction.reply('This command in not available on Beta version');
                    return;
                }
            }
            if (interaction.isCommand() && matchingCommand.canBeBlocked) {
                let spamcount = await client.redis.get(`spamcount-${interaction.user.id}`);
                let timesTriggered = 0;
                if (spamcount !== null) {
                    timesTriggered = parseInt(spamcount);
                    if (timesTriggered > 10) {
                        console.log(`spam ${interaction.user.username} ${interaction.user.id} ${commandName}`);
                    }
                }
                if (matchingCommand.canBeBlocked) {
                    let spamLock = await client.redis.get(`spamlock-${interaction.user.id}`);
                    if (spamLock !== null) {
                        let embed = new MessageEmbed();
                        embed.setDescription('Team Rocket has tied you up. Wait a bit before you get free again.');
                        embed.setImage('https://pokeventure-image.s3.amazonaws.com/trap.png');
                        embed.setAuthor(interaction.user.username, interaction.user.avatarURL() ?? '');
                        interaction.editReply({
                            embeds: [embed],
                        });
                        return;
                    }
                }
                let count = 1;
                let spam = await client.redis.get(`spam-${interaction.user.id}`);
                if (spam !== null) {
                    count = parseInt(spam);
                    count++;
                    if (count >= 100) {
                        // Display riddle
                        client.redis.set(`spamcount-${interaction.user.id}`, timesTriggered + 1, 'EX', 30 * 60);
                        if (timesTriggered >= 7) {
                            client.redis.set(`spamlock-${interaction.user.id}`, 1, 'EX', 32 * 60);
                            let embed = new MessageEmbed();
                            embed.setDescription('Team Rocket has tied you up. Wait a bit before you get free again.');
                            embed.setImage('https://pokeventure-image.s3.amazonaws.com/trap.png');
                            embed.setAuthor(interaction.user.username, interaction.user.avatarURL() ?? '');
                            interaction.editReply({
                                embeds: [embed],
                            });
                            const info = new MessageEmbed();
                            embed.setDescription(`<@146382118778437632> locked ${interaction.user.id} <@${interaction.user.id}> `)
                                .setTimestamp();
                            client.restClient.post(Routes.channelMessages('807209828450697237'), {
                                body: {
                                    embeds: [
                                        info
                                    ]
                                }
                            });
                            // client.discordClient.createMessage('807209828450697237', `<@146382118778437632> locked ${message.author.id} <@${message.author.id}> triggered riddle (${timesTriggered})`);
                            return;
                        }
                        let timeToSolve = (new Date()).getTime();
                        count = 0;
                        let embed = new MessageEmbed();
                        // client.discordClient.createMessage('807209828450697237', `${message.author.id} <@${message.author.id}> triggered riddle (${timesTriggered})`);

                        let chance = new Chance();
                        let id = chance.integer({ min: 1, max: 898 });
                        let pokemon = getPokemon(id);
                        let canEvolve = false;
                        if (pokemon.evolutions !== undefined && pokemon.evolutions.length > 0) {
                            canEvolve = true;
                        }
                        let riddle = 0; //chance.integer({ min: 0, max: 2 });
                        if (riddle === 0) {
                            let embed = new MessageEmbed();
                            embed.setDescription(`Oh no! Rocket Team has riddle for you! Answer it wrong and Rocket Team will steal your Pokémons and will tie you up.\n\nWhat is the ID of ${pokemon.displayName}?`);
                            embed.setImage('https://pokeventure-image.s3.amazonaws.com/rocketteam.png');
                            embed.setFooter(`You can check Pokémon by ID with '/pokedex name: ${pokemon.displayName}'`);
                            let random = [id, chance.integer({ min: 1, max: 898 }), chance.integer({ min: 1, max: 898 }), chance.integer({ min: 1, max: 898 })];
                            random = chance.shuffle(random);

                            let row: MessageActionRow;
                            row = new MessageActionRow();
                            row.addComponents(
                                new MessageButton()
                                    .setCustomId(`choice_${random[0]}`)
                                    .setLabel(`${random[0]}`)
                                    .setStyle('PRIMARY'),
                            );
                            row.addComponents(
                                new MessageButton()
                                    .setCustomId(`choice_${random[1]}`)
                                    .setLabel(`${random[1]}`)
                                    .setStyle('PRIMARY'),
                            );
                            row.addComponents(
                                new MessageButton()
                                    .setCustomId(`choice_${random[2]}`)
                                    .setLabel(`${random[2]}`)
                                    .setStyle('PRIMARY'),
                            );
                            row.addComponents(
                                new MessageButton()
                                    .setCustomId(`choice_${random[3]}`)
                                    .setLabel(`${random[3]}`)
                                    .setStyle('PRIMARY'),
                            );

                            interaction.followUp({
                                embeds: [embed],
                                components: [row],
                                fetchReply: true,
                            }).then((message) => {
                                choiceMaker(client.discordClient, interaction.user.id, message.id, (interactable: ButtonInteraction, user: string, choice: number) => {
                                    if (user === interaction.user.id) {
                                        if (choice === id) {
                                            interactable.reply({
                                                content: 'Good job! Team Rocket has fled.',
                                            });
                                        } else {
                                            interactable.reply({
                                                content: 'Team Rocket has tied you up. Wait a bit before you get free again.',
                                            });
                                            client.redis.set(`spamlock-${interaction.user.id}`, 1, 'EX', 5 * 60);
                                        }
                                    }
                                }, 60000).then((res: any) => {
                                    if (res.timeout) {
                                        interaction.followUp({
                                            content: 'Team Rocket has tied you up. Wait a bit before you get free again.',
                                        });
                                        client.redis.set(`spamlock-${interaction.user.id}`, 1, 'EX', 5 * 60);
                                    }
                                }).catch((error) => {
                                    Logger.error(error);
                                });
                            }).catch((error) => {
                                Logger.error(error);
                            });
                            // id
                            /* sendEmbed(annel, , , null, null, context.user,).then(() => {
                                const filter = (m: Message) => m.author.id === context.user.id;
                                const collector = new MessageCollector(context.client.annel, filter, { max: 6, time: 60000 });
 
                                collector.on('collect', (m: Message) => {
                                    if (m.content === pokemon.dexId.toString()) {
                                        sendEmbed(annel, 'Good job! Team Rocket has fled.');
                                        client.discordClient.createMessage('807209828450697237', `${message.author.id} <@${message.author.id}> managed to solve riddle in ${(new Date()).getTime() - timeToSolve} ms`);
                                        collector.stop();
                                    }
                                });
 
                                collector.on('end', (collected: any, reason: any) => {
                                    if (reason !== 'user') {
                                        client.discordClient.createMessage('807209828450697237', `${message.author.id} <@${message.author.id}> failed riddle`);
                                        client.redis.set(`spamlock-${message.author.id}`, 1, 'EX', 5 * 60);
                                        sendEmbed(annel, 'Team Rocket has tied you up. Wait a bit before you get free again.', 'https://pokeventure-image.s3.amazonaws.com/trap.png', null, null, message.author);
                                    }
                                });
                            });*/
                        } else if (riddle === 2 && canEvolve) {
                            // Evolution
                            /* sendEmbed(annel, `Oh no! Rocket Team has riddle for you! Answer it wrong and Rocket Team will steal your Pokémons and will tie you up.\n\nWhat is the evolution of ${pokemon.displayName}? (any evolution works)`, 'https://pokeventure-image.s3.amazonaws.com/rocketteam.png', null, null, context.user, `You can check evolutions with '${prefix}pokedex ${pokemon.displayName}'`).then(() => {
                                const filter = (m: Message) => m.author.id === context.user.id;
                                const collector = new MessageCollector(context.client.annel, filter, { max: 6, time: 60000 });
 
                                let goodAnswer = pokemon.evolutions.map((x) => x.name.toLowerCase());
 
                                collector.on('collect', (m: Message) => {
                                    if (goodAnswer.includes(m.content.toLowerCase())) {
                                        sendEmbed(annel, 'Good job! Team Rocket has fled.');
                                        client.discordClient.createMessage('807209828450697237', `${message.author.id} <@${message.author.id}> managed to solve riddle in ${(new Date()).getTime() - timeToSolve} ms`);
                                        collector.stop();
                                    }
                                });
 
                                collector.on('end', (collected: any, reason: any) => {
                                    if (reason !== 'user') {
                                        embed.setTimestamp();
                                        embed.setDescription(`${message.author.id} <@${message.author.id}> failed riddle`);
                                        client.discordClient.createMessage('807209828450697237', embed.getObject());
                                        client.redis.set(`spamlock-${message.author.id}`, 1, 'EX', 5 * 60);
                                        sendEmbed(annel, 'Team Rocket has tied you up. Wait a bit before you get free again.', 'https://pokeventure-image.s3.amazonaws.com/trap.png', null, null, message.author);
                                    }
                                });
                            }); */
                        } else {
                            // name
                            /* sendEmbed(annel, `Oh no! Rocket Team has riddle for you! Answer it wrong and Rocket Team will steal your Pokémons and will tie you up.\n\nWhat Pokémon has the ID ${pokemon.dexId}?`, 'https://pokeventure-image.s3.amazonaws.com/rocketteam.png', null, null, context.user, `You can check Pokémon with '${prefix}pokedex id ${pokemon.dexId}'`).then(() => {
                                const filter = (m: Message) => m.author.id === context.user.id;
                                const collector = new MessageCollector(context.client.annel, filter, { max: 6, time: 60000 });
 
                                collector.on('collect', (m: Message) => {
                                    if (m.content.toLowerCase() === pokemon.displayName.toLowerCase()) {
                                        sendEmbed(annel, 'Good job! Team Rocket has fled.');
                                        client.discordClient.createMessage('807209828450697237', `<@${message.author.id}> managed to solve riddle in ${(new Date()).getTime() - timeToSolve} ms`);
                                        collector.stop();
                                    }
                                });
 
                                collector.on('end', (collected: any, reason: any) => {
                                    if (reason !== 'user') {
                                        embed.setTimestamp();
                                        embed.setDescription(`<@${message.author.id}> failed riddle`);
                                        client.discordClient.createMessage('807209828450697237', embed.getObject());
                                        client.redis.set(`spamlock-${message.author.id}`, 1, 'EX', 5 * 60);
                                        sendEmbed(annel, 'Team Rocket has tied you up. Wait a bit before you get free again.', 'https://pokeventure-image.s3.amazonaws.com/trap.png', null, null, message.author);
                                    }
                                });
                            });*/
                        }
                        client.redis.set(`spam-${interaction.user.id}`, 0, 'EX', 30);
                        return;
                    }
                }
                client.redis.set(`spam-${interaction.user.id}`, count, 'EX', 30);
            }

            client.dogstatsd.increment('commands');
            let player: Player | undefined = undefined;
            let playerTime = process.hrtime();
            if (matchingCommand.needPlayer) {
                player = await getPlayer(interaction.user.id);
            }
            let endPlayerTime = process.hrtime(playerTime);
            if (matchingCommand.needPlayer) {
                client.dogstatsd.timing('player_fetch', endPlayerTime[0] * 1000 + Math.round(endPlayerTime[1] / 1000000));
            }

            const context: CommandContext = {
                channel: interaction.channel,
                commandInterction: <CommandInteraction>interaction,
                buttonInteraction: <ButtonInteraction>interaction,
                selectMenuInteraction: <SelectMenuInteraction>interaction,
                interaction: interaction,
                client: client,
                user: {
                    id: interaction.user.id,
                    username: interaction.user.username,
                    avatarURL: interaction.user.avatarURL() ?? '',
                },
                player: player,
                args: args,
            };

            try {
                if (matchingCommand.earlyAccess && (player?.patronLevel === undefined || player?.patronLevel < 1)) {
                    interaction.editReply('This command is not available yet. If you want to access it early, you can donate on Patreon. Check [Patreon page here](https://www.patreon.com/pokeventure)!');
                    return;
                }

                if (matchingCommand.requireStart) {
                    const exists = await client.redis.get(`player-${interaction.user.id}`).catch(() => { });
                    if (exists === null) {
                        if (player === null || player === undefined) {
                            player = await getPlayer(interaction.user.id);
                            if (player === null || player === undefined) {
                                interaction.editReply({ content: 'You have to start your adventure before using this command! Start it by using the `/start` command' });
                                return;
                            }
                            client.redis.get(`set-${interaction.user.id}`, 1, 'EX', 24 * 60 * 60).catch(() => { });
                        } else {
                            client.redis.get(`set-${interaction.user.id}`, 1, 'EX', 24 * 60 * 60).catch(() => { });
                        }
                    }
                }

                const handleTime = process.hrtime();
                await matchingCommand.handler(context);
                const endHandleTime = process.hrtime(handleTime);
                client.dogstatsd.timing('command_execution', endHandleTime[0] * 1000 + Math.round(endHandleTime[1] / 1000000));
            } catch (e) {
                let chance = new Chance();
                const guid = chance.guid();
                if (process.env.DEV !== '1') {
                    if (interaction.replied) {
                        interaction.followUp(`An error has occured with API.\n\nTry again in few seconds and if it happens again, please report it on the [official Pokeventure Discord server](https://discord.gg/qSJrpyj).\n\n${guid}`);
                    } else {
                        interaction.editReply(`An error has occured with API.\n\nTry again in few seconds and if it happens again, please report it on the [official Pokeventure Discord server](https://discord.gg/qSJrpyj).\n\n${guid}`);
                    }
                } else {
                    if (interaction.replied) {
                        interaction.followUp(`An error has occured with API.\n\n${e.toString().substring(0, 2000)}`);
                    } else {
                        interaction.editReply(`An error has occured with API.\n\n${e.toString().substring(0, 2000)}`);
                    }
                }
                Logger.error(guid, e);
            }
        }
    }
}
