import { InteractionResponse, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { askConfirmation, pagination, sendEmbed } from "../modules/utils";
import { Command, CommandContext } from "../types/command";
import { Market as MarketModel } from '../models/market';
import { addCoins, getPokemonByNumber } from "../modules/database";
import { findPokemon, getPokemon, rarity, sendInfo } from "../modules/pokedex";
import { Pokemon } from "../models/pokemon";
import { Player } from "../models/player";
import { Types } from "mongoose";
import Logger from "../modules/logger";

function tax(amount: number) {
    if (amount * 0.05 < 1) {
        return Math.round(Math.max(amount - 1, 0));
    }
    return Math.round(Math.max(amount - amount * 0.05, 0));
}

export const Market: Command = {
    commandName: 'market',
    displayName: 'Market',
    fullDescription: 'Sell and buy Pokémon from market.\n\nUsage: `%PREFIX%market` to see last offers.\nUsage `%PREFIX%market <filters>` to filter.\n(Available filters: `n|u|r|sr|ur|lr|shiny|mega|pokedex number`)\nUsage: `%PREFIX%market sort <option>` to sort.\n(Sort option available: `price|-price|level|-level|rarity|-rarity`)\nUsage: `%PREFIX%market sell <id> <price>` to sell one of your Pokémon. (Note: Limit of 10 offers per trainer)\nUsage: `%PREFIX%market buy <offer id>` to buy a Pokémon.\nUsage: `%PREFIX%market view <offer id>` to have more information about the offer.\nUsage: `%PREFIX%market me` to see all your offers.\nUsage: `%PREFIX%market cancel <offer id>` to cancel one of your offer.\n\nExample: `%PREFIX%market sr` to see all SR offers.\nExample: `%PREFIX%market 3` to see all Venusaur offers.\nExample: `%PREFIX%market sort level` to sort offers by level in ascending order.\nExample: `%PREFIX%market sort -level` to sort offers by level in descending order.\nExample: `%PREFIX%market lr mega shiny 3 sort price` to search for LR Venusaur-Mega shiny sorted by price in ascending order.',
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    blockTradeLocked: true,
    data: () => new SlashCommandBuilder()
        .setName('market')
        .setDescription('Buy and sell Pokémons')
        .addSubcommand(option => option.setName('sell').setDescription('Sell a Pokémon')
            .addIntegerOption(option => option.setName('pokemon').setDescription('Pokémon ID').setRequired(true))
            .addIntegerOption(option => option.setName('price').setDescription('Price to sell your Pokémon').setRequired(true))
        )
        .addSubcommand(option => option.setName('buy').setDescription('Buy a Pokémon from market')
            .addStringOption(option => option.setName('offer').setDescription('Market offer ID').setRequired(true))
        )
        .addSubcommand(option => option.setName('me').setDescription('View your offers on market'))
        .addSubcommand(option => option.setName('cancel').setDescription('Cancel one of your offer')
            .addStringOption(option => option.setName('offer').setDescription('Market offer ID').setRequired(true))
        )
        .addSubcommand(option => option.setName('view').setDescription('View offer')
            .addStringOption(option => option.setName('offer').setDescription('Market offer ID').setRequired(true))
        )
        .addSubcommand(option => option.setName('offers').setDescription('View all offers')
            .addStringOption(option => option.setName('rarity').setDescription('Filter by rarity')
                .addChoices({
                    name: 'N',
                    value: 'n'
                }, {
                    name: 'U',
                    value: 'u'
                }, {
                    name: 'R',
                    value: 'r'
                }, {
                    name: 'SR',
                    value: 'sr'
                }, {
                    name: 'UR',
                    value: 'ur'
                }, {
                    name: 'LR',
                    value: 'lr'
                })
            )
            .addBooleanOption(option => option.setName('mega').setDescription('Filter by Mega'))
            .addBooleanOption(option => option.setName('shiny').setDescription('Filter by Shiny'))
            .addStringOption(option => option.setName('sort').setDescription('Sort offers')
                .addChoices({
                    name: 'Price ⬆️',
                    value: 'price_asc'
                }, {
                    name: 'Price ⬇️',
                    value: 'price_desc'
                }, {
                    name: 'Rarity ⬆️',
                    value: 'rarity_asc'
                }, {
                    name: 'Rarity ⬇️',
                    value: 'rarity_desc'
                }, {
                    name: 'Level ⬆️',
                    value: 'level_asc'
                }, {
                    name: 'Level ⬇️',
                    value: 'level_desc'
                })
            )
            .addStringOption(option => option.setName('name').setDescription('Filter by name'))
        )
        .setDMPermission(true),
    async handler(context: CommandContext) {
        if (!context.player) return;
        if (context.interaction.options.getSubcommand(true) === 'sell') {
            const pokemonNumber: number = context.interaction.options.getInteger('pokemon', true) - 1;
            const price: number = context.interaction.options.getInteger('price', true);
            if (price < 1 || price > 2000000000) {
                return sendEmbed(context, { description: 'Your offer price should be between 1 and 2,000,000,000.' });
            }
            let userOffers = await MarketModel.find({ discord_id: context.user.id }).exec();
            if (userOffers.length >= 10) {
                return sendEmbed(context, { description: 'You can\'t have more than 10 offers at the same time on the market.' });
            }
            let pokemon = await getPokemonByNumber(context.player, pokemonNumber);
            if (!pokemon) {
                return sendEmbed(context, { description: 'Can\'t find Pokémon with this ID.' });
            }
            if (pokemon.locked) {
                return sendEmbed(context, { description: 'You can\'t sell this Pokémon because you won it.' });
            }
            if (pokemon === context.player.selectedPokemon) {
                return sendEmbed(context, { description: 'You can\'t sell your selected Pokémon.' });
            }

            let pokemonData = getPokemon(pokemon.dexId, pokemon.special);
            sendEmbed(context, { description: `Do you want to sell your ${rarity[pokemon.rarity]} ${pokemonData.displayName} ${pokemon.shiny ? '✨' : ''} for ${price.toLocaleString()} <:pokecoin:741699521725333534>?\nYou will receive ${tax(price).toLocaleString()} <:pokecoin:741699521725333534> after 5% tax.` }).then((message) => {
                if (message instanceof InteractionResponse) return;
                askConfirmation(message, context, async () => {
                    let pokemonToSell = await Pokemon.findOne({ owner: context.user.id, _id: pokemon?._id }).exec();
                    if (!pokemonToSell) {
                        return;
                    }
                    let offer = new MarketModel();
                    offer.discord_id = context.user.id;
                    offer.price = price;
                    offer.pokemon = pokemonToSell;
                    offer.save();
                    pokemonToSell.deleteOne();
                    sendEmbed(context, { description: `Your ${pokemonData.displayName} has been put in the market for ${price.toLocaleString()} <:pokecoin:741699521725333534>. It will appear in the market soon.` });
                });
            });
        } else if (context.interaction.options.getSubcommand(true) === 'buy') {
            let offerId = context.interaction.options.getString('offer', true);
            let offer = await MarketModel.findOne({ marketId: offerId }).exec();
            if (!offer) {
                return sendEmbed(context, { description: 'No offer found with this ID.' });
            }
            const pokemonData = getPokemon(offer.pokemon.dexId, offer.pokemon.special);
            sendEmbed(context, {
                description: `Do you want to buy ${rarity[offer.pokemon.rarity]} ${pokemonData.displayName} ${offer.pokemon.shiny ? '✨' : ''} for ${offer.price.toLocaleString()} <:pokecoin:741699521725333534>?`
            }).then((message) => {
                if (message instanceof InteractionResponse) return;
                askConfirmation(message, context, async () => {
                    let player = await Player.findOne({ discord_id: context.user.id }).exec();
                    if (!player) {
                        return;
                    }
                    let offer = await MarketModel.findOne({ marketId: offerId }).exec();
                    if (!offer) {
                        return sendEmbed(context, { description: 'This offer doesn\'t exist anymore.' });
                    }
                    if (player.money.coins < offer?.price) {
                        return sendEmbed(context, { description: 'You don\'t have enough money.' });
                    }

                    let seller = await Player.findOne({ discord_id: offer.discord_id }).exec();

                    addCoins(context.user.id, -offer.price, 'market buyer');
                    addCoins(offer.discord_id, tax(offer.price), 'market seller');

                    let newPokemon = new Pokemon(offer.pokemon);
                    newPokemon.owner = context.user.id;
                    newPokemon.fav = false;
                    newPokemon.luckyEgg = false;
                    if (newPokemon.rarity === 5 || newPokemon.shiny) {
                        newPokemon.fav = true;
                    }
                    newPokemon.isNew = true;
                    newPokemon._id = new Types.ObjectId();
                    await newPokemon.save();
                    await offer.deleteOne();
                    sendEmbed(context, { description: `You have bought ${pokemonData.displayName} from the market for ${offer.price.toLocaleString()} <:pokecoin:741699521725333534>.` });

                    const embed = new EmbedBuilder();
                    embed.setDescription(`You sold your ${rarity[offer.pokemon.rarity]} ${pokemonData.displayName} ${offer.pokemon.shiny ? '✨' : ''} for ${offer.price.toLocaleString()} <:pokecoin:741699521725333534>.\nYou received ${tax(offer.price).toLocaleString()} <:pokecoin:741699521725333534> after 5% tax.`);
                    embed.setTitle('Pokémon sold');

                    context.client.discordClient.users.send(offer.discord_id, { embeds: [embed] }).catch((error) => {
                        Logger.error(error);
                    });
                });
            });
        } else if (context.interaction.options.getSubcommand(true) === 'me') {
            let offers = await MarketModel.find({ discord_id: context.user.id }).exec();
            let text = '**POKEMON** | **LEVEL** | **PRICE** | **OFFER ID**\n\n';
            offers.forEach(offer => {
                let pokemonData = getPokemon(offer.pokemon.dexId, offer.pokemon.special);
                text += `${rarity[offer.pokemon.rarity]} ${pokemonData.displayName} ${offer.pokemon.shiny ? '✨' : ''} | Lvl. ${offer.pokemon.level} | ${offer.price.toLocaleString()} <:pokecoin:741699521725333534> | \`${offer.marketId}\`\n`;
            });
            sendEmbed(context, { description: text, footer: { text: `Cancel one of your offer by doing /market cancel <offer id>` }, title: 'Your offers' });
        } else if (context.interaction.options.getSubcommand(true) === 'cancel') {
            let offer = await MarketModel.findOne({ discord_id: context.user.id, marketId: context.interaction.options.getString('offer', true) }).exec();
            if (!offer) {
                return sendEmbed(context, { description: 'No offer found.' });
            }

            let newPokemon = new Pokemon(offer.pokemon);
            await newPokemon.save();
            await offer.deleteOne();
            sendEmbed(context, { description: 'Your offer has been removed from market.' });
        } else if (context.interaction.options.getSubcommand(true) === 'view') {
            let marketOffer = await MarketModel.findOne({ marketId: context.interaction.options.getString('offer', true) });
            if (!marketOffer) {
                return sendEmbed(context, { description: 'No offer found.' });
            }
            sendInfo(marketOffer.pokemon, context, true, marketOffer.marketId);
        } else if (context.interaction.options.getSubcommand(true) === 'offers') {
            let filter: any = {
                marketId: { $exists: true }
            };
            let sort: any = { _id: 1 };
            let pokemonFilter: any = {};

            let rarityFilter: string | null = context.interaction.options.getString('rarity');
            if (rarityFilter === 'n') {
                pokemonFilter["pokemon.rarity"] = 0;
            } else if (rarityFilter === 'u') {
                pokemonFilter["pokemon.rarity"] = 1;
            } else if (rarityFilter === 'r') {
                pokemonFilter["pokemon.rarity"] = 2;
            } else if (rarityFilter === 'sr') {
                pokemonFilter["pokemon.rarity"] = 3;
            } else if (rarityFilter === 'ur') {
                pokemonFilter["pokemon.rarity"] = 4;
            } else if (rarityFilter === 'lr') {
                pokemonFilter["pokemon.rarity"] = 5;
            }
            if (context.interaction.options.getBoolean('mega')) {
                pokemonFilter["pokemon.special"] = 'mega';
            }
            if (context.interaction.options.getBoolean('shiny')) {
                pokemonFilter["pokemon.shiny"] = true;
            }
            if (context.interaction.options.getString('sort') !== null) {
                let sortOption = context.interaction.options.getString('sort', true);
                if (sortOption === 'price_desc') {
                    sort = { price: -1 };
                } else if (sortOption === 'price_asc') {
                    sort = { price: 1 };
                } else if (sortOption === 'rarity_desc') {
                    sort = { rarity: -1 };
                } else if (sortOption === 'rarity_asc') {
                    sort = { rarity: 1 };
                } else if (sortOption === 'level_desc') {
                    sort = { level: -1 };
                } else if (sortOption === 'level_asc') {
                    sort = { level: 1 };
                }
            }

            if (context.interaction.options.getString('name') !== null) {
                let searchPokemon = findPokemon(context.interaction.options.getString('name', true));
                if (searchPokemon !== undefined) {
                    let id = searchPokemon.map((pkm: any) => pkm.dexId)[0];
                    pokemonFilter.dexId = id;
                }
            }

            if (Object.keys(pokemonFilter).length !== 0) {
                filter = { ...filter, ...pokemonFilter };
            }

            let offers = await MarketModel.find(filter);

            let count = 0;

            const pages = [];
            let embed = new EmbedBuilder();
            let description = '';
            description = 'View an offer with `/market view <offer id>`\nBuy an offer with \`/market buy <offer id>\`\n\n**POKEMON** | **LEVEL** | **PRICE** | **OFFER ID**\n\n';
            embed.setTitle('Market');
            offers.forEach((offer) => {
                const pokemon = getPokemon(offer.pokemon.dexId, offer.pokemon.special);
                description += `${rarity[offer.pokemon.rarity]} ${pokemon.displayName} ${offer.pokemon.shiny ? '✨' : ''} | Lvl. ${offer.pokemon.level} | ${offer.price.toLocaleString()} <:pokecoin:741699521725333534> | \`${offer.marketId}\`\n`;
                count++;
                if (count === 10) {
                    count = 0;
                    embed.setDescription(description);
                    pages.push(embed);
                    embed = new EmbedBuilder();
                    description = '**POKEMON** | **LEVEL** | **PRICE** | **OFFER ID**\n\n';
                }
            });
            if (count > 0 || pages.length === 0) {
                embed.setDescription(description);
                pages.push(embed);
            }
            pagination(context, pages);
        }
    }
}