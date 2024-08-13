import { Command, CommandContext } from 'command';
import { SlashCommandBuilder } from '@discordjs/builders';
import { addDojoPoints, addPokemon, addPokemonToClanGym, dealClanGymDamage, deletePokemon, getClan, getClanGym, getClanOfUser, getPokemonByNumber, getRandomGymToFight, removePokemonFromClanGym, useDojoStamina } from '../modules/database';
import { sendDM, sendEmbed, sleep } from '../modules/utils';
import { Pokemon } from 'pokemon';
import { Chance } from 'chance';
import { getStats, getPokemon, rarity } from '../modules/pokedex';
import { raidMoves } from '../modules/raid';
import Fight from '../modules/fight';
import { MessageEmbed } from 'discord.js';
import Logger from '../modules/logger';

export const Dojo: Command = {
    name: 'Dojo',
    keywords: ['dojo'],
    requireStart: true,
    needPlayer: true,
    category: 'Bot',
    showInHelp: true,
    fullDesc: '',
    earlyAccess: false,
    commandData: new SlashCommandBuilder()
        .setName('dojo')
        .setDescription('Clan\'s Dojo.')
        .addSubcommand((input) => input.setName('fight').setDescription('Fight a random clan\'s Dojo'))
        .addSubcommand((input) => input.setName('add').setDescription('Add a Pokémon to your clan\'s Dojo').addIntegerOption(option => option.setName('pokemon').setDescription('Pokémon ID to add in gym').setRequired(true)))
        // .addSubcommand((input) => input.setName('remove').setDescription('Remove a Pokémon from your clan\'s Dojo'))
        .addSubcommand((input) => input.setName('view').setDescription('View your clan\'s Dojo')),

    handler(context: CommandContext): Promise<any> {
        return new Promise((resolve, reject) => {
            getClanOfUser(context.user.id).then(async (clan: any) => {
                if(clan._id === '') {
                    Logger.info(`${context.user.username} ${context.user.id} using "${context.commandInterction.options.getSubcommand()}" clan command in Unicorn`);
                }
                if (clan === null) {
                    sendEmbed({ context, message: 'You are not in a clan. You can create one with `/clan create`' });
                } else {
                    if (clan.level < 10) {
                        sendEmbed({ context, message: 'Your clan need to be level 10 to unlock Clan Dojo.' });
                    } else {
                        if (context.commandInterction.options.getSubcommand(true) === 'add') {
                            let number = context.commandInterction.options.getInteger('pokemon', true);
                            getClanGym(clan._id).then((gym) => {
                                if (gym !== null) {
                                    for (let i = 0; i < gym.pokemons.length; i++) {
                                        if (gym.pokemons[i].owner === context.user.id) {
                                            sendEmbed({ context, message: 'You can\'t have more than one of your Pokémon defending your gym.' });
                                            resolve({});
                                            return;
                                        }
                                    }
                                }
                                getPokemonByNumber(context.user.id, number - 1, context.player?.sort ?? '_ID_ASC').then((pokemon: Pokemon) => {
                                    if (pokemon === null) {
                                        sendEmbed({ context, message: 'None of your pokemon match this ID' });
                                        resolve({});
                                    } else {
                                        addPokemonToClanGym(context.user.id, clan._id, pokemon).then((res) => {
                                            sendEmbed({ context, message: 'Pokemon added to clan' });
                                            deletePokemon(pokemon._id);
                                            resolve({});
                                        }).catch((error) => {
                                            reject(error);
                                        });
                                    }
                                }).catch((e) => {
                                    reject(e);
                                });
                            }).catch((e) => {
                                reject(e);
                            });
                        } else if (context.commandInterction.options.getSubcommand(true) === 'remove') {
                            getClanGym(clan._id).then(async (gym) => {
                                for (let i = 0; i < gym.pokemons.length; i++) {
                                    if (gym.pokemons[i].owner === context.user.id) {
                                        await removePokemonFromClanGym(context.user.id, clan._id);
                                        addPokemon(gym.pokemons[i].pokemon);
                                        sendEmbed({ context, message: 'You removed your Pokémon from your clan\'s Dojo' });
                                        resolve({});
                                        return;
                                    }
                                }
                                sendEmbed({ context, message: 'You have no Pokémon to remove.' });
                                resolve({});
                            }).catch((e) => {
                                reject(e);
                            });
                        } else if (context.commandInterction.options.getSubcommand(true) === 'fight') {
                            if (context.player?.selectedPokemon === null) {
                                sendEmbed({ context, message: 'You must select a Pokémon before.', author: context.user });
                                resolve({});
                                return;
                            }
                            let gym = await getClanGym(clan._id);
                            let hasPokemon = false;
                            if (gym !== null) {
                                for (let i = 0; i < gym.pokemons.length; i++) {
                                    if (gym.pokemons[i].owner === context.user.id) {
                                        hasPokemon = true;
                                    }
                                }
                            }
                            if (!hasPokemon) {
                                sendEmbed({ context, message: 'You can\'t fight an other Dojo without having a Pokémon defending your Dojo.' });
                                resolve({});
                                return;
                            }
                            // Fight
                            getRandomGymToFight(clan._id).then((enemyGym) => {
                                if (enemyGym.clan !== null && enemyGym.clan.length > 0) {
                                    // Fight clan
                                    let enemyClan = enemyGym.clan[0];
                                    let playerClan = clan;
                                    getClan(enemyClan.clan).then((clan) => {
                                        let chance = new Chance();
                                        let randomPokemon: any = chance.pickone(enemyClan.pokemons);
                                        if (playerClan.history?.stamina <= 0) {
                                            sendEmbed({ context, message: 'You don\'t have enough stamina to fight.' });
                                            return;
                                        }
                                        useDojoStamina(context.user.id);
                                        sendEmbed({ context, message: `You will fight against the clan **${clan.name}**. ${getPokemon(randomPokemon.pokemon.dexId, randomPokemon.pokemon.special).displayName} is defending the Dojo.` }).then(async () => {
                                            await sleep(1000);

                                            let playerPokemon = context.player?.selectedPokemon;

                                            /* let playerPokemonData = getPokemon(playerPokemon.dexId, playerPokemon.special);
                                            let playerPokemonStats = getStats(playerPokemon.dexId, playerPokemon.level, playerPokemon.ivs, playerPokemon.special, playerPokemon.nature);
                                            let moves: any[] = [];
                                            playerPokemonData.types.forEach((type: any) => {
                                                moves.push(raidMoves[type][playerPokemonStats.atk > playerPokemonStats.spa ? 0 : 1]);
                                            }); 
                                            playerPokemon.moves = moves; */


                                            let pokemonRaidData = getPokemon(randomPokemon.pokemon.dexId, randomPokemon.pokemon.special);
                                            /* let raidPokemonStats = getStats(randomPokemon.pokemon.dexId, randomPokemon.pokemon.level, randomPokemon.pokemon.ivs, randomPokemon.pokemon.special, randomPokemon.pokemon.nature);
                                            let pokemonRaidMoves: any[] = [];
                                            pokemonRaidData.types.forEach((type: any) => {
                                                pokemonRaidMoves.push(raidMoves[type][raidPokemonStats.atk > raidPokemonStats.spa ? 0 : 1]);
                                            });
                                            randomPokemon.pokemon.moves = pokemonRaidMoves;
                                            randomPokemon.pokemon.level = randomPokemon.pokemon.level; */

                                            let fight: Fight = new Fight();
                                            if(randomPokemon.pokemon.item === 'assaultvest') {
                                                randomPokemon.pokemon.item = null;
                                            }

                                            fight.start(context, [playerPokemon], [randomPokemon.pokemon], 3, randomPokemon.maxHp, randomPokemon.hp).then(async (result: any) => {
                                                let damageDealt = result.victory ? randomPokemon.hp : Math.max(0, randomPokemon.hp - result.hp);
                                                damageDealt = Math.round(damageDealt);
                                                dealClanGymDamage(clan._id, randomPokemon.pokemon._id, damageDealt).then(async (res) => {
                                                    let points = 0;
                                                    points = Math.min(Math.floor(damageDealt / 1000), 5);
                                                    points += 2;
                                                    if (res.killed) {
                                                        // addDojoPoints(randomPokemon.owner, 4);
                                                        await addPokemon(randomPokemon.pokemon);
                                                        await removePokemonFromClanGym(randomPokemon.owner, clan._id);
                                                        sendDM(context.client, randomPokemon.owner, `${getPokemon(randomPokemon.pokemon.dexId, randomPokemon.pokemon.special).displayName} is back from your Clan's Dojo.`);
                                                        points += 5;
                                                    } else {
                                                        addDojoPoints(randomPokemon.owner, 1);
                                                    }
                                                    addDojoPoints(context.user.id, points);
                                                    sendEmbed({ context, message: `You dealt ${damageDealt} damage to **${pokemonRaidData.displayName}**.\n\nYou won ${points} points.`, image: result.image, author: context.user });
                                                    // Give one point for victory
                                                    // Give 5 points for defeat
                                                    // 
                                                    /* if (res.died || res.ended) {
                                                      endRaid(raid, clan, context, res);
                                                    }
                                                    context.client.redis.set(`clan-raid-cooldown-${context.user.id}`, '1', 'EX', 10).catch(() => { });
                                                    let duration = Math.max(moment(raid.time).add(15, 'minutes').diff(moment(), 'seconds'), 0);
                                                    sendEmbed(context, context.channel, `You dealt ${damageDealt} damage to **${pokemonRaidData.displayName}**.\nYou can fight raid again in ${10} seconds.\n\n`, result.image, null, null, context.message.author, `Raid ends in ${moment.duration(duration, 'seconds').humanize()}`, 'Clan Raid'); */
                                                }).catch((error) => {
                                                    reject(error);
                                                });
                                            }).catch((error) => {
                                                reject(error);
                                            });
                                        }).catch((error) => {
                                            reject(error);
                                        });
                                        resolve({});
                                    }).catch((e) => {
                                        reject(e);
                                    });
                                } else {
                                    sendEmbed({ context, message: 'No clan could be found to be fought. Try again later.' });
                                    resolve({});
                                }
                            }).catch((e) => {
                                reject(e);
                            });
                        } else if (context.commandInterction.options.getSubcommand(true) === 'view') {
                            getClanGym(clan._id).then((gym) => {
                                let date = new Date();
                                if(date.getHours() >= 23) {
                                    date.setDate(date.getDate() + 1);
                                }
                                date.setHours(23, 0);
                                if (gym === null || gym.pokemons.length === 0) {
                                    let embed = new MessageEmbed();
                                    embed.setTitle(`${clan.name}'s Dojo`);
                                    embed.setDescription(`**Your stamina ⚡️: ${clan.history?.stamina}/10 (reset <t:${Math.round(date.getTime() / 1000)}:R>)**\n\nYou have no Pokémon to protect your Dojo.\nAdd one by doing \`/dojo add <pokemon number>\``);
                                    context.commandInterction.editReply({ embeds: [embed] });
                                } else {
                                    let embed = new MessageEmbed();
                                    gym.pokemons.map((pokemon: any) => {
                                        let pokemonData = pokemon.pokemon;
                                        let pokedexData = getPokemon(pokemonData.dexId, pokemonData.special);
                                        embed.addField(`${pokedexData.displayName}`, `${rarity[pokemonData.rarity]} - lvl. ${pokemonData.level}\n${pokemon.hp}/${pokemon.maxHp}\n<@${pokemonData.owner}>`, true);
                                    });
                                    embed.setTitle(`${clan.name}'s Dojo`);
                                    embed.setDescription(`Your stamina ⚡️: ${clan.history?.stamina}/10 (reset <t:${Math.round(date.getTime() / 1000)}:R>)\nPokémon defending your clan\'s Dojo:`);
                                    context.commandInterction.editReply({ embeds: [embed] });
                                }
                                resolve({});
                            }).catch((error) => {
                                reject(error);
                            });
                        }
                    }
                }
            }).catch((error) => {
                reject(error);
            });
        });
    }
};