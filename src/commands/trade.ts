import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Player } from "../models/player";
import { Pokemon } from "../models/pokemon";
import { addCoins, getPokemonByNumber } from "../modules/database";
import { getPokemon, rarity } from "../modules/pokedex";
import { getImage, sendDM, sendEmbed } from "../modules/utils";
import { Command, CommandContext } from "../types/command";


export const Trade: Command = {
    commandName: 'trade',
    displayName: 'Trade',
    fullDescription: 'Command to trade with other players. Start a trade with `%PREFIX%trade @user <Pokémon ID>`. Once both players have have selected their Pokémons or sent money, they will have to use `%PREFIX%trade accept` to complete the trade.\nNote: You can\'t trade your selected Pokémon.\nNote: Traded Pokémon will earn 1.5x more expérience.\n\nUsage: `%PREFIX%trade @user <Pokémon ID>`\nUsage: `%PREFIX%trade <accept|decline|cancel>`\nUsage: `%PREFIX%trade`\n\nExample: `%PREFIX%trade @Ash 4` will start a trade with Ash and will select Pokémon with ID #4.\nExample: `%PREFIX%trade @Ash money <amount>` to trade money.\nExample: `%PREFIX%trade accept` will accept trade when both player have selected their Pokémon.\nExample: `%PREFIX%trade cancel` will decline the trade.\nExample: `%PREFIX%trade cancel` will cancel the trade.',
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    blockTradeLocked: true,
    data: () => new SlashCommandBuilder()
        .setName('trade')
        .setDescription('Trade with other players.')
        .addSubcommand(subcommand => subcommand.setName('pokemon').setDescription('Trade a Pokémon with a player')
            .addUserOption(option => option.setName('player').setDescription('Player to trade with').setRequired(true))
            .addIntegerOption(option => option.setName('pokemon').setDescription('Pokémon ID').setRequired(true))
        ).addSubcommand(subcommand => subcommand.setName('money').setDescription('Trade a Pokémon money a player')
            .addUserOption(option => option.setName('player').setDescription('Player to trade with').setRequired(true))
            .addIntegerOption(option => option.setName('money').setDescription('Amount of money').setRequired(true))
        )
        .addSubcommand(subcommand => subcommand.setName('accept').setDescription('Accept trade'))
        .addSubcommand(subcommand => subcommand.setName('cancel').setDescription('Cancel trade'))
        .addSubcommand(subcommand => subcommand.setName('view').setDescription('View current trade'))
        .setDMPermission(true),
    handler: async (context: CommandContext) => {
        if (!context.player) return;
        let userTrade = await context.client.getUserTrade(context.user.id);
        if (context.interaction.options.getSubcommand() === 'view') {
            if (userTrade) {
                let otherTrade = await context.client.getUserTrade(userTrade.tradingWith);
                if (otherTrade?.selectedPokemon) {
                    let { selectedPokemon } = otherTrade;
                    const selectedPokemonSpecies = getPokemon(selectedPokemon.dexId, selectedPokemon.special);
                    return sendEmbed(context, { description: `You are currently trading with <@${userTrade.tradingWith}>.\n<@${userTrade.tradingWith}> will send ${rarity[selectedPokemon.rarity]} ${selectedPokemonSpecies.displayName} ${selectedPokemon.shiny ? '✨' : ''} (Lvl. ${selectedPokemon.level})`, image: getImage(selectedPokemonSpecies, selectedPokemon.shiny.true, selectedPokemon.special), thumbnail: null, author: context.user });
                } else if (otherTrade?.money) {
                    return sendEmbed(context, { description: `You are currently trading with <@${userTrade.tradingWith}>.\n<@${userTrade.tradingWith}> will send ${otherTrade.money.toLocaleString()}` });
                } else {
                    return sendEmbed(context, { description: `You are currently trading with <@${userTrade.tradingWith}>.` });
                }
            } else {
                return sendEmbed(context, { description: 'You are not currently in a trade. Start a trade with `%PREFIX%trade @user <Pokémon ID>`.' });
            }
        }
        if (context.interaction.options.getSubcommand() === 'cancel') {
            if (userTrade) {
                context.client.deleteUserTrade(context.user.id);
                context.client.deleteUserTrade(userTrade.tradingWith);
                return sendEmbed(context, { description: `You canceled your trade with <@${userTrade.tradingWith}>.` });
            }
        }
        if (context.interaction.options.getSubcommand() === 'accept') {
            if (userTrade) {
                userTrade.accepted = true;
                context.client.setUserTrade(context.user.id, userTrade);
                let otherTrade = await context.client.getUserTrade(userTrade.tradingWith);
                if (otherTrade?.accepted) {
                    if (userTrade.selectedPokemon) {
                        let pokemon = await Pokemon.findById(userTrade.selectedPokemon._id).exec();
                        if (!pokemon || pokemon.owner !== context.user.id) {
                            return sendEmbed(context, { description: 'An error occured during the trade. #1' });
                        }
                        let pokemonSpecies = getPokemon(pokemon.dexId, pokemon.special);
                        pokemon.owner = userTrade.tradingWith;
                        pokemon.luckyEgg = false;
                        pokemon.save();

                        let embed = new EmbedBuilder();
                        embed.setDescription(`You received ${rarity[pokemon.rarity]} ${pokemonSpecies.displayName} ${pokemon.shiny ? '✨' : ''} (Lvl. ${pokemon.level}) from <@${context.user.id}>. Take care!`)
                            .setImage(getImage(pokemon, true, pokemon.shiny, pokemon.special))
                            .setFooter({ text: 'Traded Pokémon will earn 1.5x more experience!' });
                        sendDM(context.client, userTrade.tradingWith, { embeds: [embed] });
                    }
                    if (otherTrade.selectedPokemon) {
                        let pokemon = await Pokemon.findById(otherTrade.selectedPokemon._id).exec();
                        if (!pokemon || pokemon.owner !== userTrade.tradingWith) {
                            return sendEmbed(context, { description: 'An error occured during the trade. #1' });
                        }
                        let pokemonSpecies = getPokemon(pokemon.dexId, pokemon.special);
                        pokemon.owner = context.user.id;
                        pokemon.luckyEgg = false;
                        pokemon.save();

                        let embed = new EmbedBuilder();
                        embed.setDescription(`You received ${rarity[pokemon.rarity]} ${pokemonSpecies.displayName} ${pokemon.shiny ? '✨' : ''} (Lvl. ${pokemon.level}) from <@${userTrade.tradingWith}>. Take care!`)
                            .setImage(getImage(pokemon, true, pokemon.shiny, pokemon.special))
                            .setFooter({ text: 'Traded Pokémon will earn 1.5x more experience!' });
                        sendDM(context.client, context.user.id, { embeds: [embed] });
                    }
                    const player1 = await Player.findOne({ discord_id: context.user.id }).exec();
                    const player2 = await Player.findOne({ discord_id: userTrade.tradingWith }).exec();
                    if (userTrade.money) {
                        if (userTrade.money > player1!.money.coins) {
                            return sendEmbed(context, { description: 'An error occured during the trade. #2' });
                        }
                        await addCoins(context.user.id, -userTrade.money, 'trade');
                        await addCoins(userTrade.tradingWith, userTrade.money, 'trade');

                        sendDM(context.client, userTrade.tradingWith, { content: `You received ${userTrade.money.toLocaleString()} <:pokecoin:741699521725333534> Coins from <@${context.user.id}>.` });
                    }
                    if (otherTrade.money) {
                        if (otherTrade.money > player2!.money.coins) {
                            return sendEmbed(context, { description: 'An error occured during the trade. #2' });
                        }
                        await addCoins(userTrade.tradingWith, -otherTrade.money, 'trade');
                        await addCoins(context.user.id, otherTrade.money, 'trade');

                        sendDM(context.client, context.user.id, { content: `You received ${otherTrade.money.toLocaleString()} <:pokecoin:741699521725333534> Coins from <@${userTrade.tradingWith}>.` });
                    }
                    context.client.deleteUserTrade(context.user.id);
                    context.client.deleteUserTrade(userTrade.tradingWith);
                }
            }
            return;
        }

        let mention = context.interaction.options.getUser('player', true);
        if (mention.bot) {
            return sendEmbed(context, { description: 'You can\'t trade with bots.' });
        } else if (mention.id === context.user.id) {
            return sendEmbed(context, { description: 'You can\'t trade with yourself.' });
        }
        let mentionTrade = await context.client.getUserTrade(mention.id);
        if (userTrade && userTrade.tradingWith !== mention.id) {
            return sendEmbed(context, { description: 'You are currently in an other trade. Finish it or cancel it with `%PREFIX%trade cancel`.' });
        }
        if (mentionTrade && mentionTrade.tradingWith !== context.user.id) {
            return sendEmbed(context, { description: `<@${mention.id}> is already trading. Wait until the trade is finished and try again.` });
        }

        if (context.interaction.options.getSubcommand() === 'money') {
            let money = context.interaction.options.getInteger('money', true);
            if (money < 0) {
                return sendEmbed(context, { description: 'Invalid amount.' });
            } else if (money > context.player.money.coins) {
                return sendEmbed(context, { description: 'You don\'t have enough money.' });
            }
            context.client.setUserTrade(context.user.id, {
                tradingWith: mention.id,
                money: money,
                accepted: false,
            });
            if (!mentionTrade) {
                context.client.setUserTrade(mention.id, {
                    tradingWith: context.user.id,
                    accepted: false,
                });
            }
            sendEmbed(context, { description: `Hey <@${mention?.id}>! ${context.user.username} will send ${money.toLocaleString()} Coins to you. Both of you will have to accept with \`%PREFIX%trade accept\` or decline with \`%PREFIX%trade cancel\`.`, footer: { text: 'You will be prompted to accept the trade before the trade happens' }, title: 'Trade' });
        }
        if (context.interaction.options.getSubcommand() === 'pokemon') {
            let pokemonNumber = context.interaction.options.getInteger('pokemon', true) - 1;
            let pokemon = await getPokemonByNumber(context.player, pokemonNumber);
            if (!pokemon) {
                return sendEmbed(context, { description: 'No Pokémon match this ID.' });
            } else if (pokemon._id === context.player.selectedPokemon._id) {
                return sendEmbed(context, { description: 'You can\'t trade your selected Pokémon!' });
            } else if (pokemon.locked) {
                return sendEmbed(context, { description: 'This Pokémon is a reward and not tradable.' });
            }
            let selectedPokemonSpecies = getPokemon(pokemon.dexId, pokemon.special);
            sendEmbed(context, { description: `Hey <@${mention?.id}>! Player ${context.user.username} has started a trade with you! ${context.user.username} will send a ${rarity[pokemon.rarity]} ${selectedPokemonSpecies.displayName} ${pokemon.shiny ? '✨' : ''} (Lvl. ${pokemon.level}) to you. Send your Pokémon with \`%PREFIX%trade @user <Pokémon ID>\``, image: getImage(pokemon, true, pokemon.shiny, pokemon.special), footer: { text: 'You will be prompted to accept the trade before the trade happens' }, title: 'Trade' });
            context.client.setUserTrade(context.user.id, {
                tradingWith: mention.id,
                selectedPokemon: pokemon,
                accepted: false,
            });
            if (!mentionTrade) {
                context.client.setUserTrade(mention.id, {
                    tradingWith: context.user.id,
                    accepted: false,
                });
            }
        }
    }
}