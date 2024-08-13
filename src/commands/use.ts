import items from "../../data/items";
import { ButtonStyle, ComponentType, InteractionResponse, SlashCommandBuilder } from "discord.js";
import { Inventory } from "../models/inventory";
import { askConfirmation, getImage, makeImageData, sendEmbed } from "../modules/utils";
import { Command } from "../types/command";
import { addStats, addToInventory, evolvePokemon, giveLevel } from "../modules/database";
import { getPokemon, rarity, rarityText } from "../modules/pokedex";
import moment from "moment";
import { generateRarity, randomNature } from "../modules/world";
import Fuse from "fuse.js";
import { MegaRaidLog } from "../models/megaRaidLog";

export const Use: Command = {
    commandName: "use",
    displayName: "Use",
    fullDescription: "Use item from your inventory that is usable like Stones to evolve currently selected pokemon or Rare Candies to gain a level. You can see what\"s in your inventory by using the command `%PREFIX%inventory`.\n\nUsage: `%PREFIX%use <name of item to use>`\n\nExample: `%PREFIX%use fire stone` to use a Fire Stone.\nExample: `%PREFIX%use rare candy` to use a Rare Candy.",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("use")
        .setDescription("Use an item.")
        .addStringOption(input => input.setName("item").setDescription("Item name").setRequired(true).setAutocomplete(true))
        .addIntegerOption(input => input.setName("quantity").setDescription("Quantity to use"))
        .setDMPermission(true),

    async handler(context) {
        if (!context.player) return;
        const inventory = await Inventory.findOne({ discord_id: context.user.id }).exec();
        const amount = context.interaction.options.getInteger("quantity") ?? 1;
        if (amount <= 0) {
            return sendEmbed(context, { description: "Quantity should be greater than 0." });
        }
        const itemName: string = context.interaction.options.getString("item", true);
        for (const [key, item] of Object.entries(items)) {
            if (item.name.toLowerCase().includes(itemName.toLowerCase())) {
                if (item.canUse) {
                    if (inventory && inventory.inventory[key]?.quantity >= amount) {
                        switch (item.effect) {
                            case "level": {
                                await sendEmbed(context, { description: `You used ${item.name}.` });
                                giveLevel(context.player.selectedPokemon, context, amount);
                                addToInventory(context.user.id, key, -amount);
                                addStats(context.user.id, "rareCandy", amount);
                                break;
                            }
                            case "evolve": {
                                const matchingEvolutions = getPokemon(context.player.selectedPokemon.dexId, context.player.selectedPokemon.special).evolutions.find((x) => x.condition === "useItem" && x.item === item.name.toLowerCase() && (x.genderCondition === undefined || (x.genderCondition === context.player?.selectedPokemon.gender)));
                                if (matchingEvolutions !== undefined) {
                                    await sendEmbed(context, { description: `You used ${item.name}.` });
                                    let result = await evolvePokemon(context, context.player.selectedPokemon, matchingEvolutions.id, context.user, matchingEvolutions.special);
                                    if (!result) {
                                        await sendEmbed(context, { description: "Your Pokémon is evolution-locked. It has no effect." });
                                    } else {
                                        addToInventory(context.user.id, key, -1);
                                    }
                                } else {
                                    sendEmbed(context, { description: `${item.name} has no effect.` });
                                }
                                break;
                            }
                            case "rarityScanner":
                                if (moment() < moment(context.player.rarityScanner)) {
                                    sendEmbed(context, { description: `You can"t use ${item.name}. You already have a rarity scanner active.`, author: context.user });
                                    return;
                                }
                                let rarityScannerExpireDate = new Date();
                                rarityScannerExpireDate.setHours(rarityScannerExpireDate.getHours() + 12);
                                context.player.rarityScanner = rarityScannerExpireDate;
                                addToInventory(context.user.id, key, -1);
                                context.player.save();
                                sendEmbed(context, { description: `You used ${item.name}. You will now see rarities of wild Pokémons for 12 hours.`, author: context.user });
                                break;
                            case "shinyScanner":
                                if (moment() < moment(context.player?.shinyScanner)) {
                                    sendEmbed(context, { description: `You can"t use ${item.name}. You already have a shiny scanner active.`, author: context.user });
                                    return;
                                }
                                let shinyScannerExpireDate = new Date();
                                shinyScannerExpireDate.setHours(shinyScannerExpireDate.getHours() + 12);
                                addToInventory(context.user.id, key, -1);
                                context.player.shinyScanner = shinyScannerExpireDate;
                                context.player.save();
                                sendEmbed(context, { description: `You used ${item.name}. You will have more chances to find Shiny Pokémons for 12 hours.`, author: context.user });
                                break;
                            case "premiumRarityScanner":
                                if (context.player.premiumRarityScanner > 0) {
                                    sendEmbed(context, { description: `You can"t use ${item.name}. You already have a premium rarity scanner active.`, author: context.user });
                                    return;
                                }
                                addToInventory(context.user.id, key, -1);
                                context.player.premiumRarityScanner = 2500;
                                context.player.save();
                                sendEmbed(context, { description: `You used ${item.name}. You will now see rarities of wild Pokémons for 2500 Pokémons.`, author: context.user });
                                break;
                            case "premiumShinyScanner":
                                if (context.player.premiumShinyScanner > 0) {
                                    sendEmbed(context, { description: `You can"t use ${item.name}. You already have a premium shiny scanner active.`, author: context.user });
                                    return;
                                }
                                addToInventory(context.user.id, key, -1);
                                context.player.premiumShinyScanner = 2500;
                                sendEmbed(context, { description: `You used ${item.name}. You will have more chances to find Shiny Pokémons for 2500 Pokémon.` });
                                break;
                            case "luckyegg": {
                                if (context.player.selectedPokemon.luckyEgg) {
                                    sendEmbed(context, { description: "Your Pokémon already has the effect of a Lucky Egg." });
                                } else {
                                    context.player.selectedPokemon.luckyEgg = true;
                                    sendEmbed(context, { description: "Your Pokémon is now under the effect of a Lucky Egg. It will earn 25% more experience!" });
                                    context.player.selectedPokemon.save()
                                    addToInventory(context.user.id, key, -1);
                                }
                                break;
                            }
                            case "megaEvolve": {
                                if (context.player.selectedPokemon.forme) {
                                    sendEmbed(context, { description: "You can\"t Mega evolve this Pokémon because it\"s a promotional Pokémon." });
                                    return;
                                }
                                if (item.target === context.player.selectedPokemon.dexId && context.player.selectedPokemon.special === null) {
                                    if (inventory.inventory[key]?.quantity < (context.player.selectedPokemon.rarity + 1) * 3) {
                                        sendEmbed(context, { description: `You need ${(context.player.selectedPokemon.rarity + 1) * 3} ${item.name} to Mega evolve a ${rarity[context.player.selectedPokemon.rarity]} Pokémon.` });
                                    } else {
                                        if (item.target === 382 || item.target === 383) {
                                            evolvePokemon(context, context.player.selectedPokemon, context.player.selectedPokemon.dexId, context.user, "primal", undefined, true);
                                        } else if (key === "46" || key === "55") {
                                            evolvePokemon(context, context.player.selectedPokemon, context.player.selectedPokemon.dexId, context.user, "megax", undefined, true);
                                        } else if (key === "47" || key === "56") {
                                            evolvePokemon(context, context.player.selectedPokemon, context.player.selectedPokemon.dexId, context.user, "megay", undefined, true);
                                        } else {
                                            evolvePokemon(context, context.player.selectedPokemon, context.player.selectedPokemon.dexId, context.user, "mega", undefined, true);
                                        }
                                        addToInventory(context.user.id, key, -((context.player.selectedPokemon.rarity + 1) * 3));
                                    }
                                } else {
                                    sendEmbed(context, { description: "It has no effect on this Pokémon." });
                                }
                                break;
                            }
                            case "megaPass":
                                const log = await MegaRaidLog.findOne({ discord_id: context.user.id, ok: false }).exec();
                                if (log) {
                                    return sendEmbed(context, { description: "You already use a Mega Raid Pass." });
                                }
                                const newLog = new MegaRaidLog();
                                newLog.discord_id = context.user.id;
                                await newLog.save();
                                await addToInventory(context.user.id, key, -1);
                                sendEmbed(context, { description: "You used a Mega Raid Pass. You can now participate to the current Mega Raid.", image: null, thumbnail: null, author: context.user });
                                break;
                            case "rerollrarity": {
                                if (["mega", "megax", "megay", "primal"].includes(context.player.selectedPokemon.special ?? "")) {
                                    sendEmbed(context, { description: "You can\"t use Rarity Gems on a Mega Pokémon." });
                                    return;
                                }
                                const pokemonData = getPokemon(context.player.selectedPokemon.dexId, context.player.selectedPokemon.special);
                                sendEmbed(context, {
                                    description: `Are you sure that you want reroll rarity of your ${rarity[context.player.selectedPokemon.rarity]} ${pokemonData.displayName}?\n**This action can"t be undone.**`, thumbnail: getImage(context.player.selectedPokemon, true, context.player.selectedPokemon.shiny, context.player.selectedPokemon.special), title: "Rarity Gem"
                                }, [
                                    {
                                        style: ButtonStyle.Primary,
                                        label: "Accept",
                                        emoji: "✅",
                                        customId: "choice_1",
                                    }, {
                                        style: ButtonStyle.Danger,
                                        label: "Decline",
                                        emoji: "❌",
                                        customId: "choice_2",
                                    },
                                ]
                                ).then(async (message) => {
                                    if (message instanceof InteractionResponse) return;
                                    askConfirmation(message, context, async () => {
                                        const inventory = await Inventory.findOne({ discord_id: context.user.id }).exec();
                                        if (inventory === null || context.player === null) return;
                                        if (inventory.inventory[key]?.quantity > 0) {
                                            const newRarity = generateRarity();
                                            sendEmbed(context, { description: `Your ${rarity[context.player.selectedPokemon.rarity]} ${pokemonData.displayName} became... A ${rarity[newRarity.rarity]} ${pokemonData.displayName}!`, image: null, thumbnail: null, author: context.user });
                                            addToInventory(context.user.id, key, -1);
                                            context.player.selectedPokemon.rarity = newRarity.rarity;
                                            context.player.selectedPokemon.ivs = newRarity.ivs;
                                            context.player.selectedPokemon.save();
                                        }
                                    });
                                });
                                break;
                            }
                            case "natureMint": {
                                if (context.player.selectedPokemon.mint === undefined) {
                                    context.player.selectedPokemon.mint = 0;
                                }
                                const pokemonData = getPokemon(context.player.selectedPokemon.dexId, context.player.selectedPokemon.special);
                                if (inventory.inventory[key]?.quantity < (context.player.selectedPokemon.mint + 1)) {
                                    return sendEmbed(context, { description: `You need ${(context.player.selectedPokemon.mint + 1)} Nature Mints to reroll nature on this Pokémon.`, image: null, thumbnail: null, author: context.user });
                                }
                                sendEmbed(
                                    context, { description: `Are you sure that you want reroll nature of your **${context.player.selectedPokemon.nature}** ${pokemonData.displayName}?\n**It will use ${context.player.selectedPokemon.mint + 1} Nature Mints.** (increase by 1 every time you use)\n\n**This action can"t be undone.**`, image: null, thumbnail: getImage(context.player.selectedPokemon, true, context.player.selectedPokemon.shiny, context.player.selectedPokemon.special), title: "Nature Mint" })
                                    .then(async (message) => {
                                        if (message instanceof InteractionResponse) return;
                                        askConfirmation(message, context, async () => {
                                            const inventory = await Inventory.findOne({ discord_id: context.user.id }).exec();
                                            if (inventory === null || context.player === null) return;
                                            if (context.player.selectedPokemon.mint === undefined) {
                                                context.player.selectedPokemon.mint = 0;
                                            }
                                            if (inventory.inventory[key]?.quantity >= (context.player.selectedPokemon.mint + 1)) {
                                                const newNature = randomNature();
                                                sendEmbed(context, { description: `Your ${context.player.selectedPokemon.nature} ${pokemonData.displayName} became... A ${newNature} ${pokemonData.displayName}!`, image: null, thumbnail: null, author: context.user });
                                                addToInventory(context.user.id, key, -(context.player.selectedPokemon.mint + 1));
                                                context.player.selectedPokemon.nature = newNature;
                                                context.player.selectedPokemon.mint = context.player.selectedPokemon.mint + 1;
                                                context.player.selectedPokemon.save();
                                            } else {
                                                sendEmbed(context, { description: `You need ${(context.player.selectedPokemon.mint + 1)} Nature Mints to reroll nature on this Pokémon.`, image: null, thumbnail: null, author: context.user });
                                            }
                                        });
                                    });
                                break;
                            }
                            case "patronTicket": {
                                if (context.player?.patronLevel === undefined || context.player?.patronLevel < 2) {
                                    sendEmbed(context, { description: "You need to subscribe to Patreon to use this ticket.\nIf you are subscribed, make sure to do /patreon while being in Pokeventure server with your role to use it." });
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
                                sendEmbed(context, {
                                    description: "You used a Patron Ticket. Here are different picks. Choose wisely!", image: `http://image.pokeventure.com/gym_show.php?d=${makeImageData(picks ?? null)}`
                                }, [
                                    {
                                        label: `${getPokemon(picks[0].dexId, picks[0].special).displayName} ${picks[0].shiny ? "Shiny" : ""} (at least ${rarityText[picks[0].rarity]})`,
                                        customId: "choice_0",
                                        style: ButtonStyle.Primary,
                                    }, {
                                        label: `${getPokemon(picks[1].dexId, picks[1].special).displayName} ${picks[1].shiny ? "Shiny" : ""} (at least ${rarityText[picks[1].rarity]})`,
                                        customId: "choice_1",
                                        style: ButtonStyle.Primary,
                                    }, {
                                        label: `${getPokemon(picks[2].dexId, picks[2].special).displayName} ${picks[2].shiny ? "Shiny" : ""} (at least ${rarityText[picks[2].rarity]})`,
                                        customId: "choice_2",
                                        style: ButtonStyle.Primary,
                                    }
                                ]).then((message) => {
                                    /* choiceMaker(context.client.discordClient, context.user.id, message.id, async (interaction: ButtonInteraction, user: string, choice: number) => {
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
                                    }, 60000, true);*/
                                });
                                break;
                            }
                            /* case "lure": {
                                if (context.interaction.channel?.type === "GUILD_TEXT" && context.client.channelPokemons[context.interaction.channelId ?? ""] === undefined) {
                                    const pokemon = getRandomPokemonForLottery(true);
                                    if (pokemon !== null) {
                                        sendEmbed(context, { description: "You used an **Lure**.\n\nA mystery Pokémon appeared! Quick, catch it!", image: getImage(pokemon, true, pokemon?.shiny, pokemon?.special), thumbnail: null, author: null, footer: "Catch it with !catch command", title: "Wow!" }).then((mes) => {
                                            context.client.channelPokemons[context.interaction.channelId ?? ""] = {
                                                pokemon,
                                                message: context.commandInterction,
                                                timeout: setTimeout(() => {
                                                    context.commandInterction.deleteReply();
                                                    delete context.client.channelPokemons[context.interaction.channelId ?? ""];
                                                }, 30000),
                                            };
                                            addToInventory(context.user.id, i, -1);
                                        }).catch((reason) => {
                                            Logger.error(reason);
                                        });
                                    }
                                } else if (context.client.channelPokemons[context.interaction.channelId ?? ""] !== undefined) {
                                    sendEmbed(context, { description: "There\"s already a Mystery Pokémon." });
                                } else {
                                    sendEmbed(context, { description: "You can\"t use lure in DMs." });
                                }
                                break;
                            } */
                            /*case "shinyTicket": {
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
                            //let win = /*pity <= 0 ? true :*/ chance.integer({ min: 0, max: 2 }) === 0 ? true : false;
                            /* let result: string;
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
                                result = "You won nothing this time. But here is a Rarity Gem <:raritygem:861529796009132032> to compensate.";
                                addToInventory(context.user.id, 145, 1);
                            }
                            console.log(`Used ticket ${context.user.id}`);
                            sendEmbed(context, { description: result, image: `http://image.pokeventure.com/slot.php?d=${JSON.stringify({ data: rearanged })}`, thumbnail: null, author: context.user, footer: null, title: "Shiny Slot Machine" });
                            break;
                        }*/
                            case "treats": {
                                addToInventory(context.user.id, key, -1);
                                context.player.selectedPokemon.friendship += item.amount ?? 0;
                                //addFriendship(context.player?.selectedPokemon._id, item.amount ?? 0);
                                //await increaseResearch(context, context.user.id, Research.feed, context.player?.selectedPokemon.dexId, context.player?.research?.data);
                                await sendEmbed(context, { description: `${getPokemon(context.player.selectedPokemon.dexId, context.player.selectedPokemon.special)} ate ${item.name}! You gained ${item.amount} points of friendship. It feels stronger now!` });
                                break;
                            }
                            /* case "birthdayticket": {
                                sendEmbed({
                                    context, message: "You Birthday Ticket. Here are different picks. Choose wisely!", author: context.user, components: [
                                        {
                                            label: "Birthday Articuino",
                                            customId: "choice_144",
                                        },
                                        {
                                            label: "Birthday Zapdos",
                                            customId: "choice_145",
                                        },
                                        {
                                            label: "Birthday Moltres",
                                            customId: "choice_146",
                                        },
                                        {
                                            label: "Birthday Mewtwo",
                                            customId: "choice_150",
                                        },
                                        {
                                            label: "Birthday Mew",
                                            customId: "choice_151",
                                        },
                                        {
                                            label: "Birthday Raikou",
                                            customId: "choice_243",
                                        },
                                        {
                                            label: "Birthday Entei",
                                            customId: "choice_244",
                                        },
                                        {
                                            label: "Birthday Suicune",
                                            customId: "choice_245",
                                        },
                                        {
                                            label: "Birthday Lugia",
                                            customId: "choice_249",
                                        },

                                        {
                                            label: "Birthday Celebi",
                                            customId: "choice_251",
                                        },
                                        {
                                            label: "Birthday Regirock",
                                            customId: "choice_377",
                                        },
                                        {
                                            label: "Birthday Regice",
                                            customId: "choice_378",
                                        },
                                        {
                                            label: "Birthday Registeel",
                                            customId: "choice_379",
                                        },
                                        {
                                            label: "Birthday Latias",
                                            customId: "choice_380",
                                        },
                                        {
                                            label: "Birthday Latios",
                                            customId: "choice_381",
                                        },
                                        {
                                            label: "Birthday Kyogre",
                                            customId: "choice_382",
                                        },
                                        {
                                            label: "Birthday Groudon",
                                            customId: "choice_383",
                                        },
                                        {
                                            label: "Birthday Rayquaza",
                                            customId: "choice_384",
                                        },
                                        {
                                            label: "Birthday Jirachi",
                                            customId: "choice_385",
                                        }
                                    ]
                                }).then((message) => {
                                    choiceMaker(context.client.discordClient, context.user.id, message.id, async (interaction: ButtonInteraction, user: string, choice: number) => {
                                        await addToInventory(context.user.id, i, -1);
                                        const reward = randomPokemon(choice, 1, [], -1, undefined, 5, "bday");
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
                            }*/
                            /* case "halloween": {
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
                                    context, message: `A wild ${caught ? "<:pokeball:741809195338432612> " : ""}**${generatedEncounter?.displayName}** ${genderEmoji[generatedEncounter.gender]} ${generatedEncounter?.shiny ? "✨" : ""} ${hasRarityScanner ? rarity[generatedEncounter?.rarity || 0] : ""} appeared.\nLevel ${generatedEncounter?.level}`, image: getImage(generatedEncounter, true, generatedEncounter?.shiny, generatedEncounter?.special), thumbnail: null, author: context.user, footer: `Fight it by using /fight or catch it with /catch`, title: null, color: null, components: [
                                        {
                                            label: "Fight",
                                            customId: "fight",
                                            emoji: {
                                                name: "⚔️",
                                            },
                                            type: 1,
                                        }
                                    ]
                                });
                                break;
                            } */
                        }
                    } else {
                        sendEmbed(context, { description: `You don"t have any ${item.name}.` });
                    }
                } else {
                    sendEmbed(context, { description: `You can"t use ${item.name}.` });
                }
                return;
            }
        }
        sendEmbed(context, { description: `No item matches **${itemName}**. Check your items by using \`%PREFIX%inventory\`.` });
    },
    autocompleteHandler(client, interaction) {
        if (interaction.options.getFocused() === "") {
            let result = Object.values(items).slice(0, 5).map((item: any) => {
                return {
                    value: item.name,
                    name: item.name,
                };
            });
            return interaction.respond(result);
        }
        const fuse = new Fuse(Object.values(items), {
            threshold: 0.6,
            keys: [
                "name",
            ],
        });

        let result = fuse.search(interaction.options.getFocused()).map(x => x.item).slice(0, 5).map((item: any) => {
            return {
                value: item.name,
                name: item.name,
            };
        });
        interaction.respond(result);
    },
};
