import { Chance } from 'chance';
import { Command, CommandContext } from 'command';
import { gql } from 'graphql-request';
import { choiceMaker, sendEmbed } from '../modules/utils';
import { SlashCommandBuilder } from '@discordjs/builders';
import { createWondertrade, deletePokemon, deleteWondertrade, getPokemonByNumber, getWondertrade } from '../modules/database';
import { ButtonInteraction, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';

export const Wondertrade: Command = {
    name: 'Wondertrade',
    keywords: ['wondertrade'],
    category: 'Bot',
    fullDesc: 'Wondertrade',
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    ignoreCommandLock: false,
    commandData: new SlashCommandBuilder()
        .setName('wondertrade')
        .setDescription('Trade a Pokémon with someone else')
        .addIntegerOption(option => option.setName('pokemon').setDescription('Pokémon to trade')),

    handler(context: CommandContext): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            if (context.commandInterction.options.getInteger('pokemon') !== null) {
                getWondertrade(context.user.id).then((wondertrade) => {
                    if (wondertrade === null) {
                        const pokemonNumber = context.commandInterction.options.getInteger('pokemon', true) - 1;
                        getPokemonByNumber(context.user.id, pokemonNumber, context.player?.sort ?? '_ID_ASC').then((res) => {
                            if (res === null) {
                                sendEmbed({ context, message: 'No Pokémon match this number.' });
                            } else if (res.locked) {
                                sendEmbed({ context, message: 'This Pokémon is a reward and not tradable.' });
                            } else {
                                const embed = new MessageEmbed();
                                embed.setDescription(`You are going to send ${res.name} to Wondertrade. Are you sure to continue?`)
                                    .setTitle('Pokeventure');

                                const row1 = new MessageActionRow();
                                row1.addComponents(
                                    new MessageButton()
                                        .setCustomId('choice_1')
                                        .setStyle('SUCCESS')
                                        .setLabel('✅'),
                                    new MessageButton()
                                        .setCustomId('choice_2')
                                        .setStyle('DANGER')
                                        .setLabel('❌'),
                                );
                                context.commandInterction.editReply({ embeds: [embed], components: [row1] }).then((message) => {
                                    choiceMaker(context.client.discordClient, context.user.id, message.id, (interaction: ButtonInteraction, user: string, choice: number) => {
                                        if (choice === 1) {
                                            getPokemonByNumber(context.user.id, pokemonNumber, context.player?.sort ?? '_ID_ASC').then((res) => {
                                                if (res !== null) {
                                                    deletePokemon(res._id);
                                                    createWondertrade(context.user.id, res);
                                                    let embed = new MessageEmbed();
                                                    embed.setDescription(`You sent ${res.name} to wondertrade.`);
                                                    interaction.reply({ embeds: [embed] });
                                                }
                                            }).catch((error) => {
                                                reject(error);
                                            });
                                        }
                                    }, 60000, true);
                                }).catch((error) => {
                                    reject(error);
                                });
                            }
                        }).catch((error) => {
                            reject(error);
                        });
                    } else {
                        sendEmbed({ context, message: 'You already have sent a Pokémon to wondertrade.' });
                    }
                }).catch((error) => {
                    reject(error);
                });
            } else {
                getWondertrade(context.user.id).then((wondertrade) => {
                    if (wondertrade === null) {
                        sendEmbed({ context, message: 'You haven\'t sent a Pokémon to wondertrade yet.' });
                    } else {
                        const embed = new MessageEmbed();
                        embed.setDescription(`You have sent ${wondertrade.pokemon.name} to wondertrade. We are looking for an other player to trade with. 🔍`)
                            .setTitle('Wondertrade');

                        const row1 = new MessageActionRow();
                        row1.addComponents(
                            new MessageButton()
                                .setCustomId('choice_1')
                                .setStyle('SECONDARY')
                                .setLabel('Cancel Wondertrade'),
                        );
                        context.commandInterction.editReply({ embeds: [embed], components: [row1] }).then((message) => {
                            choiceMaker(context.client.discordClient, context.user.id, message.id, (interaction: ButtonInteraction, user: string, choice: number) => {
                                if (choice === 1) {
                                    getWondertrade(context.user.id).then((wondertrade) => {
                                        if (wondertrade !== null) {
                                            deleteWondertrade(wondertrade._id);
                                            let embed = new MessageEmbed();
                                            embed.setDescription(`${wondertrade.pokemon.name} has been removed from Wondertrade.`);
                                            interaction.reply({ embeds: [embed] });
                                        }
                                    }).catch((error) => {
                                        reject(error);
                                    });
                                }
                            }, 60000, true);
                        }).catch((error) => {
                            reject(error);
                        });
                    }
                }).catch((error) => {
                    reject(error);
                });
            }
            resolve({});
        });
    },
};
