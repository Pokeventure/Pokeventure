import { Command, CommandContext, User } from 'command';
import { Pokemon } from 'pokemon';
import items from '../../data/items';
import {
    getInventory, giveLevel, addToInventory, updatePlayer, updatePokemon, getMegaRaidLog, getMegaRaid, addStats,
    evolvePokemon,
    dealDamagesMegaRaid,
    createPokemon,
    addFriendship,
    getPokemonByObjectID,
    getPokedex
} from '../modules/database';
import { choiceMaker, getImage, sendEmbed } from '../modules/utils';

import { genderEmoji, getPokemon, getPokemon as getPokemonFromID, normalizeName, rarity, rarityText } from '../modules/pokedex';
import { generateRarity, randomNature, randomPokemon } from '../modules/world';
import Logger from '../modules/logger';
import moment from 'moment';
import { getRandomPokemonForLottery } from '../modules/lottery';
import { Chance } from 'chance';
import { SlashCommandBuilder } from '@discordjs/builders';
import { ButtonInteraction, MessageEmbed } from 'discord.js';
import { makeImageData } from './team';
import { increaseResearch, Research } from '../modules/research';
import { generateRandomEncounter } from '../modules/event';

export const Use: Command = {
    name: 'Use',
    keywords: ['use'],
    category: 'Items',
    fullDesc: 'Use item from your inventory that is usable like Stones to evolve currently selected pokemon or Rare Candies to gain a level. You can see what\'s in your inventory by using the command `%PREFIX%inventory`.\n\nUsage: `%PREFIX%use <name of item to use>`\n\nExample: `%PREFIX%use fire stone` to use a Fire Stone.\nExample: `%PREFIX%use rare candy` to use a Rare Candy.',
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    commandData: new SlashCommandBuilder()
        .setName('use')
        .setDescription('Use an item.')
        .addStringOption(input => input.setName('item').setDescription('Item name').setRequired(true).setAutocomplete(true))
        .addIntegerOption(input => input.setName('quantity').setDescription('Quantity to use')),

    handler(context: CommandContext): any {
        getInventory(context.user.id).then(async (inv) => {
            let amount = context.commandInterction.options.getInteger('quantity') ?? 1;
            if(amount <= 0) {
                await sendEmbed({ context, message: `Quantity should be greater than 0`, image: null, thumbnail: null, author: context.user });
                return;
            }
            const itemName: string = context.commandInterction.options.getString('item', true);
            for (let i = 0; i < items.length; i++) {
                let item = items[i];
                if (item.name.toLowerCase().includes(itemName.toLowerCase())) {
                    if (item.canUse) {
                        if (inv.inventory[i]?.quantity >= amount) {
                            switch (item.effect) {
                                case 'level': {
                                    await sendEmbed({ context, message: `You used ${item.name}.`, image: null, thumbnail: null, author: context.user });
                                    let pokemon: Pokemon = context.player?.selectedPokemon;
                                    giveLevel(pokemon, context, amount);
                                    addToInventory(context.user.id, i, -amount);
                                    addStats(context.user.id, 'rareCandy', amount);
                                    break;
                                }
                                case 'evolve': {
                                    let pokemon: Pokemon = context.player?.selectedPokemon;
                                    const matchingEvolutions = getPokemonFromID(pokemon.dexId, pokemon.special).evolutions.find((x) => x.condition === 'useItem' && x.item === item.name.toLowerCase() && (x.genderCondition === undefined || (x.genderCondition === pokemon.gender)));
                                    if (matchingEvolutions !== undefined) {
                                        await sendEmbed({ context, message: `You used ${item.name}.`, image: null, thumbnail: null, author: context.user });
                                        evolvePokemon(context, pokemon, matchingEvolutions.id, context.user, matchingEvolutions.special).then(async (res) => {
                                            if (res === false) {
                                                await sendEmbed({ context, message: 'Your Pokémon is evolution-locked. It has no effect.', image: null, thumbnail: null, author: context.user, followUp: true });
                                            } else {
                                                addToInventory(context.user.id, i, -1);
                                            }
                                        }).catch((error) => {
                                            Logger.error(error);
                                        });
                                    } else {
                                        sendEmbed({ context, message: `${item.name} has no effect.`, image: null, thumbnail: null, author: context.user });
                                    }
                                    break;
                                }
                                case 'rarityScanner':
                                    if (context.player !== null) {
                                        if (moment() < moment(context.player?.rarityScanner)) {
                                            sendEmbed({ context, message: `You can't use ${item.name}. You already have a rarity scanner active.`, image: null, thumbnail: null, author: context.user });
                                            return;
                                        }
                                        let expireDate = new Date();
                                        expireDate.setHours(expireDate.getHours() + 12);
                                        addToInventory(context.user.id, i, -1);
                                        updatePlayer(context.user.id, { rarityScanner: expireDate });
                                        sendEmbed({ context, message: `You used ${item.name}. You will now see rarities of wild Pokémons for 12 hours.`, image: null, thumbnail: null, author: context.user });
                                    }
                                    break;
                                case 'shinyScanner':
                                    if (context.player !== null) {
                                        if (moment() < moment(context.player?.shinyScanner)) {
                                            sendEmbed({ context, message: `You can't use ${item.name}. You already have a shiny scanner active.`, image: null, thumbnail: null, author: context.user });
                                            return;
                                        }
                                        let expireDate = new Date();
                                        expireDate.setHours(expireDate.getHours() + 12);
                                        addToInventory(context.user.id, i, -1);
                                        updatePlayer(context.user.id, { shinyScanner: expireDate });
                                        sendEmbed({ context, message: `You used ${item.name}. You will have more chances to find Shiny Pokémons for 12 hours.`, image: null, thumbnail: null, author: context.user });
                                    }
                                    break;
                                case 'premiumRarityScanner':
                                    if (context.player !== null) {
                                        if (context.player?.premiumRarityScanner > 0) {
                                            sendEmbed({ context, message: `You can't use ${item.name}. You already have a premium rarity scanner active.`, image: null, thumbnail: null, author: context.user });
                                            return;
                                        }
                                        addToInventory(context.user.id, i, -1);
                                        updatePlayer(context.user.id, { premiumRarityScanner: 2500 });
                                        sendEmbed({ context, message: `You used ${item.name}. You will now see rarities of wild Pokémons for 2500 Pokémons.`, image: null, thumbnail: null, author: context.user });
                                    }
                                    break;
                                case 'premiumShinyScanner':
                                    if (context.player !== null) {
                                        if (context.player?.premiumShinyScanner > 0) {
                                            sendEmbed({ context, message: `You can't use ${item.name}. You already have a premium shiny scanner active.`, image: null, thumbnail: null, author: context.user });
                                            return;
                                        }
                                        addToInventory(context.user.id, i, -1);
                                        updatePlayer(context.user.id, { premiumShinyScanner: 2500 });
                                        sendEmbed({ context, message: `You used ${item.name}. You will have more chances to find Shiny Pokémons for 2500 Pokémon.`, image: null, thumbnail: null, author: context.user });
                                    }
                                    break;
                                case 'luckyegg': {
                                    let pokemon: Pokemon = context.player?.selectedPokemon;
                                    if (pokemon.luckyEgg) {
                                        sendEmbed({ context, message: 'Your Pokémon already has the effect of a Lucky Egg.', image: null, thumbnail: null, author: context.user });
                                    } else {
                                        pokemon.luckyEgg = true;
                                        sendEmbed({ context, message: 'Your Pokémon is now under the effect of a Lucky Egg. It will earn 25% more experience!', image: null, thumbnail: null, author: context.user });
                                        updatePokemon(context.player?.selectedPokemon._id, pokemon);
                                        addToInventory(context.user.id, i, -1);
                                    }
                                    break;
                                }
                                case 'megaEvolve': {
                                    let pokemon: Pokemon = context.player?.selectedPokemon;
                                    if (pokemon.forme === 'bday' || pokemon.forme === 'halloween') {
                                        sendEmbed({ context, message: 'You can\'t Mega evolve this Pokémon because it\'s a promotional Pokémon.' });
                                        return;
                                    }
                                    if (pokemon !== null) {
                                        if (item.target === pokemon.dexId && pokemon.special === null) {
                                            if (inv.inventory[i]?.quantity < (pokemon.rarity + 1) * 3) {
                                                sendEmbed({ context, message: `You need ${(pokemon.rarity + 1) * 3} ${item.name} to Mega evolve a ${rarity[pokemon.rarity]} Pokémon.` });
                                            } else {
                                                if (item.target === 382 || item.target === 383) {
                                                    evolvePokemon(context, pokemon, pokemon.dexId, context.user, 'primal', undefined, true);
                                                } else if (i === 46 || i === 55) {
                                                    evolvePokemon(context, pokemon, pokemon.dexId, context.user, 'megax', undefined, true);
                                                } else if (i === 47 || i === 56) {
                                                    evolvePokemon(context, pokemon, pokemon.dexId, context.user, 'megay', undefined, true);
                                                } else {
                                                    evolvePokemon(context, pokemon, pokemon.dexId, context.user, 'mega', undefined, true);
                                                }
                                                addToInventory(context.user.id, i, -((pokemon.rarity + 1) * 3));
                                            }
                                        } else {
                                            sendEmbed({ context, message: 'It has no effect on this Pokémon.' });
                                        }
                                    }
                                    break;
                                }
                                case 'megaPass':
                                    getMegaRaidLog(context.user.id).then((log) => {
                                        if (log === null) {
                                            getMegaRaid().then((raid) => {
                                                addToInventory(context.user.id, i, -1);
                                                dealDamagesMegaRaid(raid._id, context.user.id, 0, {});
                                                sendEmbed({ context, message: 'You used a Mega Raid Pass. You can now participate to the current Mega Raid.', image: null, thumbnail: null, author: context.user });
                                            }).catch((error) => {

                                            });
                                        } else {
                                            sendEmbed({ context, message: 'You already use a Mega Raid Pass.', image: null, thumbnail: null, author: context.user });
                                        }
                                    }).catch((error) => {

                                    });
                                    break;
                                case 'rerollrarity': {
                                    let pokemon: Pokemon = context.player?.selectedPokemon;
                                    if (pokemon === null) {
                                        return;
                                    }
                                    if (['mega', 'megax', 'megay', 'primal'].includes(pokemon.special)) {
                                        sendEmbed({ context, message: 'You can\'t use Rarity Gems on a Mega Pokémon.' });
                                        return;
                                    }
                                    const pokemonData = getPokemonFromID(pokemon.dexId, pokemon.special);
                                    sendEmbed({
                                        context, message: `Are you sure that you want reroll rarity of your ${rarity[pokemon.rarity]} ${pokemonData.displayName}?\n**This action can't be undone.**`, image: null, thumbnail: getImage(pokemon, true, pokemon.shiny, pokemon.special), author: context.user, footer: null, title: 'Rarity Gem', color: null, components: [
                                            {
                                                type: 2,
                                                label: 'Accept',
                                                style: 3,
                                                customId: 'choice_1',
                                            }, {
                                                type: 2,
                                                label: 'Decline',
                                                style: 4,
                                                customId: 'choice_2',
                                            },
                                        ]
                                    }).then(async (message) => {
                                        choiceMaker(context.client.discordClient, context.user.id, message.id, (interaction: ButtonInteraction, user: string, choice: number) => {
                                            if (user === context.user.id) {
                                                if (choice === 1) {
                                                    getInventory(context.user.id).then((inv) => {
                                                        if (inv.inventory[i]?.quantity > 0) {
                                                            const newRarity = generateRarity();
                                                            sendEmbed({ context, message: `Your ${rarity[pokemon.rarity]} ${pokemonData.displayName} became... A ${rarity[newRarity.rarity]} ${pokemonData.displayName}!`, image: null, thumbnail: null, author: context.user });
                                                            addToInventory(context.user.id, i, -1);
                                                            updatePokemon(context.player?.selectedPokemon._id, { rarity: newRarity.rarity, ivs: newRarity.ivs });
                                                        }
                                                    }).catch((error) => {

                                                    });
                                                }
                                            }
                                        }, 30000);
                                    }).catch((error) => {

                                    });
                                    break;
                                }
                                case 'natureMint': {
                                    let pokemon: Pokemon = context.player?.selectedPokemon;
                                    if (pokemon.mint === undefined) {
                                        pokemon.mint = 0;
                                    }
                                    const pokemonData = getPokemonFromID(pokemon.dexId, pokemon.special);
                                    if (inv.inventory[i]?.quantity < (pokemon.mint + 1)) {
                                        sendEmbed({ context, message: `You need ${(pokemon.mint + 1)} Nature Mints to reroll nature on this Pokémon.`, image: null, thumbnail: null, author: context.user });
                                        return;
                                    }
                                    sendEmbed({
                                        context, message: `Are you sure that you want reroll nature of your **${pokemon.nature}** ${pokemonData.displayName}?\n**It will use ${pokemon.mint + 1} Nature Mints.** (increase by 1 every time you use)\n\n**This action can't be undone.**`, image: null, thumbnail: getImage(pokemon, true, pokemon.shiny, pokemon.special), author: context.user, footer: null, title: 'Nature Mint', color: null, components: [
                                            {
                                                type: 2,
                                                label: 'Accept',
                                                style: 3,
                                                customId: 'choice_1',
                                            }, {
                                                type: 2,
                                                label: 'Decline',
                                                style: 4,
                                                customId: 'choice_2',
                                            },
                                        ]
                                    }).then(async (message) => {
                                        choiceMaker(context.client.discordClient, context.user.id, message.id, (interaction: ButtonInteraction, user: string, choice: number) => {
                                            if (user === context.user.id) {
                                                if (choice === 1) {
                                                    getInventory(context.user.id).then(async (inv) => {
                                                        pokemon = await getPokemonByObjectID(pokemon._id);
                                                        if (pokemon.mint === undefined) {
                                                            pokemon.mint = 0;
                                                        }
                                                        if (inv.inventory[i]?.quantity >= (pokemon.mint + 1)) {
                                                            const newNature = randomNature();
                                                            sendEmbed({ context, message: `Your ${pokemon.nature} ${pokemonData.displayName} became... A ${newNature} ${pokemonData.displayName}!`, image: null, thumbnail: null, author: context.user });
                                                            addToInventory(context.user.id, i, -(pokemon.mint + 1));
                                                            updatePokemon(context.player?.selectedPokemon._id, { nature: newNature, mint: pokemon.mint + 1 });
                                                        } else {
                                                            sendEmbed({ context, message: `You need ${(pokemon.mint + 1)} Nature Mints to reroll nature on this Pokémon.`, image: null, thumbnail: null, author: context.user });
                                                        }
                                                    }).catch((error) => {
                                                        Logger.error(error);
                                                    });
                                                }
                                            }
                                        }, 30000);
                                    }).catch((error) => {
                                        Logger.error(error);
                                    });
                                    break;
                                }
                                case 'patronTicket': {
                                    if (context.player?.patronLevel === undefined || context.player?.patronLevel < 2) {
                                        sendEmbed({ context, message: 'You need to subscribe to Patreon to use this ticket.\nIf you are subscribed, make sure to do /patreon while being in Pokeventure server with your role to use it.' });
                                        return;
                                    }
                                    const picks = [
                                        {
                                            dexId: 16,
                                            special: undefined,
                                            level: 5,
                                            shiny: true,
                                            rarity: 5,
                                        }, {
                                            dexId: 228,
                                            special: undefined,
                                            level: 5,
                                            shiny: true,
                                            rarity: 5,
                                        }, {
                                            dexId: 531,
                                            special: undefined,
                                            level: 5,
                                            shiny: true,
                                            rarity: 5,
                                        },
                                    ];
                                    sendEmbed({
                                        context, message: 'You used a Patron Ticket. Here are different picks. Choose wisely!', image: `http://image.pokeventure.com/gym_show.php?d=${makeImageData(picks ?? null)}`, author: context.user, components: [
                                            {
                                                label: `${getPokemon(picks[0].dexId, picks[0].special).displayName} ${picks[0].shiny ? 'Shiny' : ''} (at least ${rarityText[picks[0].rarity]})`,
                                                customId: 'choice_0',
                                            }, {
                                                label: `${getPokemon(picks[1].dexId, picks[1].special).displayName} ${picks[1].shiny ? 'Shiny' : ''} (at least ${rarityText[picks[1].rarity]})`,
                                                customId: 'choice_1',
                                            }, {
                                                label: `${getPokemon(picks[2].dexId, picks[2].special).displayName} ${picks[2].shiny ? 'Shiny' : ''} (at least ${rarityText[picks[2].rarity]})`,
                                                customId: 'choice_2',
                                            }
                                        ]
                                    }).then((message) => {
                                        choiceMaker(context.client.discordClient, context.user.id, message.id, async (interaction: ButtonInteraction, user: string, choice: number) => {
                                            getInventory(context.user.id).then(async (inv) => {
                                                if (inv.inventory[i]?.quantity >= 1) {
                                                    await addToInventory(context.user.id, i, -1);
                                                    await updatePlayer(context.user.id, { pokemonReward: true });
                                                    const reward = randomPokemon(picks[choice].dexId, picks[choice].level, [], picks[choice].shiny ? 1000 : -1, picks[choice].special, picks[choice].rarity);
                                                    createPokemon(context.user.id, reward.dexId, reward.level, true, reward.moves, reward.ivs, reward.rarity, true, reward.special, undefined, reward.abilitySlot, reward.nature, reward.gender);
                                                    let embed = new MessageEmbed();
                                                    embed.setDescription(`You have selected ${reward.displayName}, it has been sent to you box.`);
                                                    embed.setAuthor(context.user.username, context.user.avatarURL);
                                                    interaction.reply({ embeds: [embed] });
                                                }
                                            }).catch((error) => {
                                                Logger.error(error);
                                            });
                                        }, 60000, true);
                                    }).catch((error) => {
                                        Logger.error(error);
                                    });
                                    break;
                                }
                                case 'lure': {
                                    if (context.interaction.channel?.type === 'GUILD_TEXT' && context.client.channelPokemons[context.interaction.channelId ?? ''] === undefined) {
                                        const pokemon = getRandomPokemonForLottery(true);
                                        if (pokemon !== null) {
                                            sendEmbed({ context, message: 'You used an **Lure**.\n\nA mystery Pokémon appeared! Quick, catch it!', image: getImage(pokemon, true, pokemon?.shiny, pokemon?.special), thumbnail: null, author: null, footer: 'Catch it with !catch command', title: 'Wow!' }).then((mes) => {
                                                context.client.channelPokemons[context.interaction.channelId ?? ''] = {
                                                    pokemon,
                                                    message: context.commandInterction,
                                                    timeout: setTimeout(() => {
                                                        context.commandInterction.deleteReply();
                                                        delete context.client.channelPokemons[context.interaction.channelId ?? ''];
                                                    }, 30000),
                                                };
                                                addToInventory(context.user.id, i, -1);
                                            }).catch((reason) => {
                                                Logger.error(reason);
                                            });
                                        }
                                    } else if (context.client.channelPokemons[context.interaction.channelId ?? ''] !== undefined) {
                                        sendEmbed({ context, message: 'There\'s already a Mystery Pokémon.' });
                                    } else {
                                        sendEmbed({ context, message: 'You can\'t use lure in DMs.' });
                                    }
                                    break;
                                }
                                case 'shinyTicket': {
                                    addToInventory(context.user.id, i, -1);
                                    let chance = new Chance();
                                    let randomArray = chance.pickset(Array.from(Array(897).keys()), 9);
                                    let rearanged: any = [[], [], []];
                                    for (let y = 0; y < 3; y++) {
                                        for (let x = 0; x < 3; x++) {
                                            rearanged[y][x] = randomArray.pop() ?? 0 + 1;
                                        }
                                    }
                                    /* let pity = parseInt(await context.client.redis.get(`slot-${context.user.id}`));
                                    if (isNaN(pity) || pity === null) {
                                        pity = chance.integer({ min: 2, max: 4 });
                                    }
                                    context.client.redis?.set(`slot-${context.user.id}`, --pity); */
                                    let win = /*pity <= 0 ? true :*/ chance.integer({ min: 0, max: 2 }) === 0 ? true : false;
                                    let result: string;
                                    if (win) {
                                        let configuration = chance.integer({ min: 0, max: 7 });
                                        let winner = chance.integer({ min: 1, max: 898 });
                                        result = `Congratulations! You won a Shiny **${getPokemonFromID(winner).displayName}**`;
                                        switch (configuration) {
                                            case 0:
                                                rearanged[0][0] = winner;
                                                rearanged[0][1] = winner;
                                                rearanged[0][2] = winner;
                                                break;
                                            case 1:
                                                rearanged[1][0] = winner;
                                                rearanged[1][1] = winner;
                                                rearanged[1][2] = winner;
                                                break;
                                            case 2:
                                                rearanged[2][0] = winner;
                                                rearanged[2][1] = winner;
                                                rearanged[2][2] = winner;
                                                break;
                                            case 3:
                                                rearanged[0][0] = winner;
                                                rearanged[1][1] = winner;
                                                rearanged[2][2] = winner;
                                                break;
                                            case 4:
                                                rearanged[0][2] = winner;
                                                rearanged[1][1] = winner;
                                                rearanged[2][0] = winner;
                                                break;
                                            case 5:
                                                rearanged[0][0] = winner;
                                                rearanged[0][1] = winner;
                                                rearanged[0][2] = winner;
                                                break;
                                            case 6:
                                                rearanged[1][0] = winner;
                                                rearanged[1][1] = winner;
                                                rearanged[1][2] = winner;
                                                break;
                                            case 7:
                                                rearanged[2][0] = winner;
                                                rearanged[2][1] = winner;
                                                rearanged[2][2] = winner;
                                                break;
                                        }
                                        // context.client.redis?.set(`slot-${context.user.id}`, chance.integer({ min: 8, max: 10 }));
                                        const generated = randomPokemon(winner, 20);
                                        const rarity = generateRarity(3, 3);
                                        createPokemon(context.user.id, winner, 20, true, generated.moves, rarity.ivs, rarity.rarity, false, null, null, generated.abilitySlot, generated.nature, generated.gender, false).catch((error) => {
                                            Logger.error(error);
                                        });
                                    } else {
                                        result = 'You won nothing this time. But here is a Rarity Gem <:raritygem:861529796009132032> to compensate.';
                                        addToInventory(context.user.id, 145, 1);
                                    }
                                    console.log(`Used ticket ${context.user.id}`);
                                    sendEmbed({ context, message: result, image: `http://image.pokeventure.com/slot.php?d=${JSON.stringify({ data: rearanged })}`, thumbnail: null, author: context.user, footer: null, title: 'Shiny Slot Machine' });
                                    break;
                                }
                                case 'treats': {
                                    addToInventory(context.user.id, i, -1);
                                    addFriendship(context.player?.selectedPokemon._id, item.amount ?? 0);
                                    await increaseResearch(context, context.user.id, Research.feed, context.player?.selectedPokemon.dexId, context.player?.research?.data);
                                    await sendEmbed({ context, message: `${context.player?.selectedPokemon.name} ate ${item.name}! You gained ${item.amount} points of friendship. It feels stronger now!` });
                                    break;
                                }
                                case 'birthdayticket': {
                                    sendEmbed({
                                        context, message: 'You Birthday Ticket. Here are different picks. Choose wisely!', author: context.user, components: [
                                            {
                                                label: 'Birthday Articuino',
                                                customId: 'choice_144',
                                            },
                                            {
                                                label: 'Birthday Zapdos',
                                                customId: 'choice_145',
                                            },
                                            {
                                                label: 'Birthday Moltres',
                                                customId: 'choice_146',
                                            },
                                            {
                                                label: 'Birthday Mewtwo',
                                                customId: 'choice_150',
                                            },
                                            {
                                                label: 'Birthday Mew',
                                                customId: 'choice_151',
                                            },
                                            {
                                                label: 'Birthday Raikou',
                                                customId: 'choice_243',
                                            },
                                            {
                                                label: 'Birthday Entei',
                                                customId: 'choice_244',
                                            },
                                            {
                                                label: 'Birthday Suicune',
                                                customId: 'choice_245',
                                            },
                                            {
                                                label: 'Birthday Lugia',
                                                customId: 'choice_249',
                                            },

                                            {
                                                label: 'Birthday Celebi',
                                                customId: 'choice_251',
                                            },
                                            {
                                                label: 'Birthday Regirock',
                                                customId: 'choice_377',
                                            },
                                            {
                                                label: 'Birthday Regice',
                                                customId: 'choice_378',
                                            },
                                            {
                                                label: 'Birthday Registeel',
                                                customId: 'choice_379',
                                            },
                                            {
                                                label: 'Birthday Latias',
                                                customId: 'choice_380',
                                            },
                                            {
                                                label: 'Birthday Latios',
                                                customId: 'choice_381',
                                            },
                                            {
                                                label: 'Birthday Kyogre',
                                                customId: 'choice_382',
                                            },
                                            {
                                                label: 'Birthday Groudon',
                                                customId: 'choice_383',
                                            },
                                            {
                                                label: 'Birthday Rayquaza',
                                                customId: 'choice_384',
                                            },
                                            {
                                                label: 'Birthday Jirachi',
                                                customId: 'choice_385',
                                            }
                                        ]
                                    }).then((message) => {
                                        choiceMaker(context.client.discordClient, context.user.id, message.id, async (interaction: ButtonInteraction, user: string, choice: number) => {
                                            await addToInventory(context.user.id, i, -1);
                                            const reward = randomPokemon(choice, 1, [], -1, undefined, 5, 'bday');
                                            createPokemon(context.user.id, reward.dexId, reward.level, false, reward.moves, reward.ivs, reward.rarity, true, reward.special, reward.forme, reward.abilitySlot, reward.nature, reward.gender, true);
                                            let embed = new MessageEmbed();
                                            embed.setDescription(`You have selected ${reward.displayName}, it has been sent to you box.`);
                                            embed.setAuthor(context.user.username, context.user.avatarURL);
                                            interaction.reply({ embeds: [embed] });
                                        }, 60000, true);
                                    }).catch((error) => {
                                        Logger.error(error);
                                    });
                                    break;
                                }
                                case 'halloween': {
                                    addToInventory(context.user.id, i, -1);
                                    const generatedEncounter = generateRandomEncounter();
                                    const pokedex = await getPokedex(context.user.id);
                                    let caught = false;
                                    if (pokedex !== null && pokedex.data !== null && pokedex.data[normalizeName(generatedEncounter.displayName)] !== undefined) {
                                        caught = true;
                                    }
                                    context.client.encounter[context.user.id] = generatedEncounter;
                                    let hasRarityScanner = false;
                                    if (moment(context.player?.rarityScanner) > moment() || context.player?.premiumRarityScanner > 0) {
                                      hasRarityScanner = true;
                                    }
                                    await sendEmbed({
                                        context, message: `A wild ${caught ? '<:pokeball:741809195338432612> ' : ''}**${generatedEncounter?.displayName}** ${genderEmoji[generatedEncounter.gender]} ${generatedEncounter?.shiny ? '✨' : ''} ${hasRarityScanner ? rarity[generatedEncounter?.rarity || 0] : ''} appeared.\nLevel ${generatedEncounter?.level}`, image: getImage(generatedEncounter, true, generatedEncounter?.shiny, generatedEncounter?.special), thumbnail: null, author: context.user, footer: `Fight it by using /fight or catch it with /catch`, title: null, color: null, components: [
                                        {
                                            label: 'Fight',
                                            customId: 'fight',
                                            emoji: {
                                            name: '⚔️',
                                            },
                                            type: 1,
                                        }
                                        ]
                                    });
                                    break;
                                }
                            }
                        } else {
                            sendEmbed({ context, message: `You don't have any ${item.name}.`, image: null, thumbnail: null, author: context.user });
                        }
                    } else {
                        sendEmbed({ context, message: `You can't use ${item.name}.`, image: null, thumbnail: null, author: context.user });
                    }
                    return;
                }
            }
            sendEmbed({ context, message: `No item matches **${itemName}**. Check your items by using \`%PREFIX%inventory\`.` });
        }).catch((error) => {
            Logger.error(error);
        });
    },
};
