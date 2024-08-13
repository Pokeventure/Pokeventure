import { EmbedBuilder, InteractionResponse, SlashCommandBuilder } from "discord.js";
import { Command, CommandContext } from "../types/command";
import { Wondertrade as WondertradeModel } from "../models/wondertrade";
import { getPokemonByNumber } from "../modules/database";
import { askConfirmation, sendEmbed } from "../modules/utils";
import { getPokemon } from "../modules/pokedex";
import { Pokemon } from "../models/pokemon";

export const Wondertrade: Command = {
    commandName: 'wondertrade',
    displayName: 'Wondertrade',
    fullDescription: 'Wondertrade',
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName('wondertrade')
        .setDescription('Trade a Pokémon with someone else')
        .addIntegerOption(option => option.setName('pokemon').setDescription('Pokémon to trade'))
        .setNSFW(false),

    handler: (context: CommandContext) => {
        if (context.interaction.options.getInteger('pokemon') !== null) {
            WondertradeModel.findOne({ discord_id: context.user.id }).then((wondertrade) => {
                if (wondertrade === null) {
                    const pokemonNumber = context.interaction.options.getInteger('pokemon', true) - 1;
                    getPokemonByNumber(context.player, pokemonNumber).then((pokemon) => {
                        if (pokemon === null) {
                            sendEmbed(context, { description: 'No Pokémon match this number.' });
                        } else if (pokemon.locked) {
                            sendEmbed(context, { description: 'This Pokémon is a reward and not tradable.' });
                        } else {
                            const embed = new EmbedBuilder();
                            embed.setDescription(`You are going to send ${getPokemon(pokemon.dexId).displayName} to Wondertrade. Are you sure to continue?`)
                                .setTitle('Pokeventure');

                            sendEmbed(context, { description: `You are going to send ${getPokemon(pokemon.dexId).displayName} to Wondertrade. Are you sure to continue?` }).then((message) => {
                                if (message instanceof InteractionResponse) return;
                                askConfirmation(message, context, async () => {
                                    getPokemonByNumber(context.player, pokemonNumber).then((pokemon) => {
                                        if (pokemon) {
                                            pokemon.deleteOne();
                                            WondertradeModel.create({
                                                discord_id: context.user.id,
                                                pokemon,
                                                date: new Date(),
                                            });
                                            let embed = new EmbedBuilder();
                                            embed.setDescription(`You sent ${getPokemon(pokemon.dexId).displayName} to wondertrade.`);
                                            message.reply({ embeds: [embed] });
                                        }
                                    });
                                });
                            });
                        }
                    });
                } else {
                    sendEmbed(context, { description: 'You already have sent a Pokémon to wondertrade.' });
                }
            });
        } else {
            WondertradeModel.findOne({ discord_id: context.user.id }).then((wondertrade) => {
                if (wondertrade === null) {
                    sendEmbed(context, { description: 'You haven\'t sent a Pokémon to wondertrade yet.' });
                } else {
                    sendEmbed(context, { description: `You have sent ${getPokemon(wondertrade.pokemon.dexId).displayName} to wondertrade. We are looking for an other player to trade with. 🔍\nDo you want to cancel your Wondertrade?` }).then((message) => {
                        if (message instanceof InteractionResponse) return;
                        askConfirmation(message, context, () => {
                            WondertradeModel.findOne({ discord_id: context.user.id }).then(async (wondertrade) => {
                                if (wondertrade !== null) {
                                    let pokemon = new Pokemon(wondertrade.pokemon);
                                    await pokemon.save();
                                    wondertrade.deleteOne();
                                    let embed = new EmbedBuilder();
                                    embed.setDescription(`${getPokemon(wondertrade.pokemon.dexId).displayName} has been removed from Wondertrade.`);
                                    message.reply({ embeds: [embed] });
                                }
                            });
                        });
                    });
                }
            });
        }
    },
};