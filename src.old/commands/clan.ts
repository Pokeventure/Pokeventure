import { Command, CommandContext, User } from 'command';
import { choiceMaker, getImage, sendEmbed } from '../modules/utils';
import {
  addCoins, addCoinsToClan, addExperienceToClan, addPokemon, createClan, createClanHistory, createClanRaid, createPokemon, dealClanRaidDamage, deleteClan, deleteClanHistories, deleteClanHistory, getBestClans, getClanGym, getClanOfUser, getClanRaid, getClanRaidLog, getClanRaidLogs, getPlayer, joinClan, removePokemonFromClanGym, updateClan, updateClanHistory, updatePlayer,
} from '../modules/database';
import { broadcastClanMessage, generateClanRaid } from '../modules/clan';
import moment from 'moment';
import { ObjectId } from 'bson';
import Fight from '../modules/fight';
import { genderEmoji, getPokemon, getStats, rarity } from '../modules/pokedex';
import { raidMoves } from '../modules/raid';
import { Chance } from 'chance';
import { randomPokemon } from '../modules/world';
import Logger from '../modules/logger';
import { SlashCommandBuilder } from '@discordjs/builders';
import { ButtonInteraction, MessageEmbed, Permissions } from 'discord.js';

const collectors: any = {};

let perks = [
  {
    name: 'Rarity Incense',
    price: [1000000, 5000000, 50000000, 250000000, 250000000 * 2],
    unlocks: [0, 12, 26, 20, 40],
    description: 'Increase chances to get a better rarity',
  }, {
    name: 'Shiny Incense',
    price: [1000000, 5000000, 50000000, 250000000, 250000000 * 2],
    unlocks: [0, 8, 18, 38, 42],
    description: 'Increase chances to get a shiny Pokemon',
  }, {
    name: 'EXP. Boost',
    price: [1000000, 5000000, 50000000, 250000000, 250000000 * 2],
    unlocks: [0, 6, 22, 34, 44],
    description: 'Increase experience gained',
  }, {
    name: 'Raid Booster',
    price: [1000000, 5000000, 50000000, 250000000, 250000000 * 2],
    unlocks: [0, 16, 28, 34, 46],
    description: 'Increase chances to get better raids',
  }, {
    name: 'Member slots',
    price: [1000000, 5000000, 50000000, 250000000, 250000000 * 2],
    unlocks: [0, 10, 20, 36, 48],
    description: 'Add member slots',
  }, {
    name: 'Raid tries',
    price: [100000000, 500000000, 2000000000],
    unlocks: [0, 24, 40],
    description: 'Add more tries to catch a raid Pokémon'
  },
];
let romanNumber = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI'];

function endRaid(raid: any, clan: any, context: CommandContext, res: any) {
  getClanRaidLogs(raid._id).then((raidLogs) => {
    let leaderboard = '';
    let hits = 1;
    raidLogs.forEach((raidLog: any, index: number) => {
      hits += raidLog.hits;
      if (res.died) {
        context.client.redis.set(`clan-raid-tries-${raidLog.discord_id}`, clan.perks[5] + 1 ?? 1, 'EX', 60 * 30).catch(() => { });
        context.client.redis.set(`clan-raid-${raidLog.discord_id}`, JSON.stringify(raid.pokemon), 'EX', 60 * 30).catch(() => { });
      }
      leaderboard += `#${index + 1} <@${raidLog.discord_id}> - ${raidLog.damageDealt.toLocaleString()}\n`;
    });

    const experience = Math.round(
      (1 // a
        * 1
        * 1
        * getPokemon(raid.pokemon.dexId).base_experience // b
        * 100 // L
        / 7)
      * 0.4
      * hits
      * (res.died ? 1 : 1 - (raid.hp / raid.maxHp))
    );
    addExperienceToClan(clan._id, '', experience);
    broadcastClanMessage(context.client, clan.channel, context.channel?.id ?? '', `Raid has ${res.died ? `been defeated, good job. You got ${clan.perks[5] + 1 ?? 1} tries to catch it with \`/clan catch\` if you participated to that raid.` : 'ended but you didn\'t defeat the Pokémon'}.\nThe clan gained **${experience.toLocaleString()}** Exp. Points.\nHere\'s the damage leaderboard:\n\n${leaderboard}`, `Raid ${res.died ? 'defeated!' : 'has ended'}`);
  }).catch((error) => {
    Logger.error(error);
  });
}

export const Clan: Command = {
  name: 'Clan',
  keywords: ['clan', 'clans', 'cl'],
  category: 'Bot',
  fullDesc: `**%PREFIX%clan**
  View details about the clan.

  **%PREFIX%clan create <name>**
  Create a clan. It will cost 10,000,000 coins to create a clan.
  
  **%PREFIX%clan donate <amount>**
  Give money to the clan to be used for buying perks and start raids.
  
  **%PREFIX%clan leave**
  Leave your clan.
  
  **%PREFIX%clan raid**
  Fight the raid clan.
  
  **%PREFIX%clan start-raid**
  Start a raid for your clan. Raid can be started by Leader and Officer. Raid will cost 100,000 to start plus 100,000 coins per clan member joining.
  
  **%PREFIX%clan catch**
  Catch the clan raid if you have tries.
  
  **%PREFIX%clan members**
  Display a list of all members of the clan.
  
  **%PREFIX%clan invite @user**
  Invite an user to your clan.
  
  **%PREFIX%clan promote @user**
  Give Officer role to a clan member
  
  **%PREFIX%clan demote @user**
  Remoke Officer role to a clan member
  
  **%PREFIX%clan shop**
  Display perks available to purchase.

  **%PREFIX%clan perks**
  Display purchased perks
  
  **%PREFIX%clan buy <number>**
  Buy a clan perks. Perks can be purchased only by Leader and Officer.
  
  **%PREFIX%clan banner <link>**
  Change your clan banner

  **%PREFIX%clan logo <link>**
  Change your clan logo

  **%PREFIX%clan motd <message>**
  Change your clan message of the day
  
  **%PREFIX%clan server**
  Redirect announcement messages in this channel (level up, new raid...)
  
  **%PREFIX%clan banner <link>**
  Change you clan banner

  **%PREFIX%clan kick @user**
  Kick member from your clan

  **%PREFIX%clan set-owner @user**
  Give ownership of the clan to a member.

  **%PREFIX%clan delete**
  Delete your clan. Can be done only as clan owner.`,
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  earlyAccess: false,
  canBeBlocked: true,
  commandData: new SlashCommandBuilder()
    .setName('clan')
    .setDescription('Get info of your Pokémon.')
    .addSubcommand(input => input.setName('view').setDescription('View info about your clan'))
    .addSubcommand(input => input.setName('create').setDescription('Create a clan').addStringOption(option => option.setName('name').setDescription('Clan name').setRequired(true)))
    .addSubcommand(input => input.setName('quit').setDescription('Quit your clan'))
    .addSubcommand(input => input.setName('delete').setDescription('Delete your clan'))
    .addSubcommand(input => input.setName('catch').setDescription('Catch Pokémon from Clan Raid'))
    .addSubcommand(input => input.setName('invite').setDescription('Invite a player to your clan').addUserOption(input => input.setName('player').setDescription('Player to invite').setRequired(true)))
    .addSubcommand(input => input.setName('promote').setDescription('Promote a player to officer role').addUserOption(input => input.setName('player').setDescription('Player to promote').setRequired(true)))
    .addSubcommand(input => input.setName('demote').setDescription('Demote a player to simple member').addUserOption(input => input.setName('player').setDescription('Player to demote').setRequired(true)))
    .addSubcommand(input => input.setName('members').setDescription('See members in your clan'))
    .addSubcommand(input => input.setName('perks').setDescription('See your clan\'s perks'))
    .addSubcommand(input => input.setName('shop').setDescription('View clan\'s shop'))
    .addSubcommand(input => input.setName('banner').setDescription('Set your clan\'s banner').addStringOption(input => input.setName('banner').setDescription('Link of the banner').setRequired(true)))
    .addSubcommand(input => input.setName('logo').setDescription('Set your clan\'s logo').addStringOption(input => input.setName('link').setDescription('Link of the logo').setRequired(true)))
    .addSubcommand(input => input.setName('color').setDescription('Set your clan\'s color').addStringOption(input => input.setName('color').setDescription('Hex color (#XXXXXX)').setRequired(true)))
    .addSubcommand(input => input.setName('motd').setDescription('Set message of the day of your clan').addStringOption(input => input.setName('text').setDescription('Message of the day').setRequired(true)))
    .addSubcommand(input => input.setName('kick').setDescription('Kick a player from your clan').addUserOption(input => input.setName('player').setDescription('Player to kick').setRequired(true)))
    .addSubcommand(input => input.setName('buy').setDescription('Buy perk from shop').addIntegerOption(input => input.setName('number').setDescription('Perk number').setRequired(true)))
    .addSubcommand(input => input.setName('start-raid').setDescription('Start a Clan Raid'))
    .addSubcommand(input => input.setName('join-raid').setDescription('Join a Clan Raid'))
    .addSubcommand(input => input.setName('raid').setDescription('Fight Clan Raid'))
    .addSubcommand(input => input.setName('set-owner').setDescription('Give leadership to an other member').addUserOption(input => input.setName('player').setDescription('New leader').setRequired(true)))
    .addSubcommand(input => input.setName('server').setDescription('Redirect announcement messages in this channel (level up, new raid...)'))
    .addSubcommand(input => input.setName('donate').setDescription('Donate money to clan').addIntegerOption(option => option.setName('amount').setDescription('Coin amount to give to clan').setRequired(true)))
    .addSubcommand(input => input.setName('leaderboard').setDescription('View your clan ranking in Dojo battles.')),

  handler(context: CommandContext): Promise<any> {
    return new Promise((resolve, reject) => {
      if (context.commandInterction.options.getSubcommand() === 'create') {
        getClanOfUser(context.user.id).then((clan) => {
          if (clan !== null) {
            sendEmbed({ context, message: 'You are alreay in a clan.' });
          } else if (context.player?.money.coins < 10000000) {
            sendEmbed({ context, message: `You need ${(10000000).toLocaleString()} <:pokecoin:741699521725333534> coins to create a clan.` });
          } else {
            addCoins(context.user.id, -10000000, 'clan');
            sendEmbed({ context, message: `Your clan **${context.commandInterction.options.getString('name', true)}** has been created.` });
            createClan(context.user.id, context.commandInterction.options.getString('name', true)).then((res) => {
              updatePlayer(context.user.id, { clan: res.recordId });
              createClanHistory(res.recordId, context.user.id);
            }).catch((error) => {
              reject(error);
            });
          }
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'donate') {
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan.' });
          } else {
            const amount = context.commandInterction.options.getInteger('amount', true);

            if (amount <= 0) {
              sendEmbed({ context, message: 'You must donate a positive amount of coins.', image: null, thumbnail: null, author: context.user });
            } else if (context.player?.money.coins >= amount) {
              addCoins(context.user.id, -amount, 'clan');
              addCoinsToClan(clan._id, context.user.id, amount);
              sendEmbed({ context, message: `You donated ${amount.toLocaleString()} <:pokecoin:741699521725333534> to your clan.`, image: null, thumbnail: null, author: context.user });
              broadcastClanMessage(context.client, clan.channel, context.channel?.id ?? '', `<@${context.user.id}> donated **${amount.toLocaleString()} <:pokecoin:741699521725333534>** to the clan.`, 'Donation');
            } else {
              sendEmbed({ context, message: `You don't have ${amount.toLocaleString()} <:pokecoin:741699521725333534>.`, image: null, thumbnail: null, author: context.user });
            }
          }
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'quit') {
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan.' });
          } else if (clan.owner === context.user.id) {
            sendEmbed({ context, message: 'You are the leader of the clan. You can\'t quit the clan.' });
            resolve({});
          }
          // Prompt check box
          else {
            getClanGym(clan._id).then(async (gym) => {
              for (let i = 0; i < gym.pokemons.length; i++) {
                if (gym.pokemons[i].owner === context.user.id) {
                  await removePokemonFromClanGym(context.user.id, clan._id);
                  addPokemon(gym.pokemons[i].pokemon);
                }
              }
            }).catch((e) => {
              Logger.error(e);
            });
            sendEmbed({ context, message: `You left **${clan.name}**` });
            deleteClanHistory(clan._id, context.user.id);
            updatePlayer(context.user.id, { clan: null });
          }
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'delete') {
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan.' });
          } else if (clan.owner !== context.user.id) {
            sendEmbed({ context, message: 'You are not the owner of the clan.' });
          } else {
            sendEmbed({
              context, message: `Are you sure you want to delete your Clan **${clan.name}**?`, image: null, thumbnail: null, author: context.user, footer: null, title: 'Delete your clan', color: null, components: [
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
            }).then((message) => {
              choiceMaker(context.client.discordClient, context.user.id, message.id, (interactable: ButtonInteraction, user: string, choice: number) => {
                if (user === context.user.id) {
                  if (choice === 1) {
                    getClanOfUser(context.user.id).then((clan) => {
                      deleteClan(clan._id);
                      deleteClanHistories(clan._id);
                      sendEmbed({ context, message: `Your clan **${clan.name}** has been deleted` });
                    }).catch((error) => {
                      reject(error);
                    });
                  }
                }
              }, 60000);
            }).catch((error) => {
              reject(error);
            });
          }
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'quests') {
        // Display quests
      } else if (context.commandInterction.options.getSubcommand() === 'raid') {
        // Clan raid
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan.' });
          } else {
            getClanRaid(clan._id).then(async (raid) => {
              if (raid === null) {
                sendEmbed({ context, message: `**${clan.name}**\n\nThere's currently no raid.` });
              } else if (moment(raid.time).subtract(5, 'minutes') <= moment(clan.history.createdAt)) {
                sendEmbed({ context, message: 'You joined clan after the beginning of the raid. You will have to wait for next one to join the fight.', image: null, thumbnail: null, author: context.user, footer: null, title: 'Clan Raid' });
              } else {
                if (moment(raid.time) > moment()) {
                  let logs = await getClanRaidLogs(raid._id);
                  sendEmbed({ context, message: `Next raid will start in ${moment(raid.time).diff(new Date(), 'minutes')} minutes.\n${logs.length} members are participating to the raid.`, image: null, thumbnail: null, author: context.user, footer: null, title: 'Clan Raid' });
                } else {
                  getClanRaidLog(raid._id, context.user.id).then(async (log) => {
                    if (log === null) {
                      if (moment(raid.time).add(15, 'minutes') <= moment()) {
                        dealClanRaidDamage('', raid._id, 0, null).then((res) => {
                          if (res.died || res.ended) {
                            endRaid(raid, clan, context, res);
                          }
                        }).catch((error) => {
                          reject(error);
                        });
                      }
                      sendEmbed({ context, message: 'You are not participating to this raid.', image: null, thumbnail: null, author: context.user, footer: null, title: 'Clan Raid' });
                    } else {
                      let cooldown = await context.client.redis.get(`clan-raid-cooldown-${context.user.id}`);
                      if (cooldown === null) {
                        const fight: Fight = new Fight();
                        const pokemon = context.player?.selectedPokemon;
                        if (pokemon === null) {
                          sendEmbed({ context, message: 'You must select a Pokémon before.', image: null, thumbnail: null, author: context.user });
                          resolve({});
                          return;
                        }

                        let playerPokemonData = getPokemon(pokemon.dexId, pokemon.special);
                        let playerPokemonStats = getStats(pokemon.dexId, pokemon.level, pokemon.ivs, pokemon.special, pokemon.nature);
                        let moves: any[] = [];
                        playerPokemonData.types.forEach(type => {
                          moves.push(raidMoves[type][playerPokemonStats.atk > playerPokemonStats.spa ? 0 : 1]);
                        });
                        pokemon.moves = moves;

                        let pokemonRaidData = getPokemon(raid.pokemon.dexId, raid.pokemon.special);
                        let raidPokemonStats = getStats(raid.pokemon.dexId, raid.pokemon.level, raid.pokemon.ivs, raid.pokemon.special, raid.pokemon.nature);
                        let pokemonRaidMoves: any[] = [];
                        pokemonRaidData.types.forEach(type => {
                          pokemonRaidMoves.push(raidMoves[type][raidPokemonStats.atk > raidPokemonStats.spa ? 0 : 1]);
                        });
                        if (pokemonRaidMoves.length === 1) {
                          pokemonRaidMoves.push(raidMoves.Raid[0]);
                        }
                        raid.pokemon.moves = pokemonRaidMoves;

                        raid.pokemon.level = pokemon.level < 100 ? pokemon.level + Math.round(pokemon.level / 100) : 110;
                        raid.pokemon.item = 'raidreduction';

                        fight.start(context, [pokemon], [raid.pokemon], 2, raid.maxHp, raid.hp).then(async (result: any) => {
                          let damageDealt = result.victory === 1 ? raid.hp : Math.max(0, raid.hp - result.hp);
                          damageDealt = Math.round(damageDealt);
                          dealClanRaidDamage(context.user.id, raid._id, damageDealt, { dexId: pokemon.dexId, special: pokemon.special, moves: pokemon.moves }).then((res) => {
                            if (res.died || res.ended) {
                              endRaid(raid, clan, context, res);
                            }
                            context.client.redis.set(`clan-raid-cooldown-${context.user.id}`, '1', 'EX', 10).catch(() => { });
                            let duration = Math.max(moment(raid.time).add(15, 'minutes').diff(moment(), 'seconds'), 0);
                            sendEmbed({ context, message: `You dealt ${damageDealt} damage to **${pokemonRaidData.displayName}**.\nYou can fight raid again in ${10} seconds.\n\n`, image: result.image, thumbnail: null, author: context.user, footer: `Raid ends in ${moment.duration(duration, 'seconds').humanize()}`, title: 'Clan Raid' });
                          }).catch((error) => {
                            reject(error);
                          });
                        }).catch((error) => {
                          reject(error);
                        });
                      }
                    }
                  }).catch((error) => {
                    reject(error);
                  });
                }
              }
            }).catch((error) => {
              reject(error);
            });
          }
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'start-raid') {
        // Clan raid
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan.' });
            return;
          }
          if (clan.owner === context.user.id || clan.history.role > 0) {
            getClanRaid(clan._id).then((raid) => {
              if (raid === null) {
                let choices = [
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
                  }];
                if (clan.rewards !== undefined) {
                  if (clan.rewards.rare > 0) {
                    choices.push({
                      type: 2,
                      label: 'Guaranteed Rare raid',
                      style: 1,
                      customId: 'choice_3',
                    });
                  }
                  if (clan.rewards.shiny > 0) {
                    choices.push({
                      type: 2,
                      label: 'Guaranteed Shiny raid',
                      style: 1,
                      customId: 'choice_4',
                    });
                  }
                  if (clan.rewards.shinyRare > 0) {
                    choices.push({
                      type: 2,
                      label: 'Guaranteed Rare Shiny raid',
                      style: 1,
                      customId: 'choice_5',
                    });
                  }
                }
                sendEmbed({
                  context, message: `Starting a raid will spawn a random raid that has chances to be shiny and will have to be defeated in order to catch it.\n\nTo start a raid it will cost **${(100000).toLocaleString()} <:pokecoin:741699521725333534> coins** then each member joining the raid will cost **${(100000).toLocaleString()} <:pokecoin:741699521725333534> coins**.\nDo you want to start a raid?`, image: null, thumbnail: null, author: context.user, footer: null, title: 'Start a clan raid', color: null, components: choices,
                }).then((message) => {
                  choiceMaker(context.client.discordClient, context.user.id, message.id, (interactable: ButtonInteraction, user: string, choice: number) => {
                    if (user === context.user.id) {
                      if (choice === 1) {
                        getClanOfUser(context.user.id).then((clan) => {
                          if (clan.balance >= 100000) {
                            const randomRaidPokemon = generateClanRaid(clan.perks[3] ?? 0, clan.level);
                            let clanRaid = {
                              pokemon: randomRaidPokemon,
                              hp: 1000000,
                              maxHp: 1000000,
                              time: moment().add(5, 'minutes'),
                              clan: new ObjectId(clan._id),
                            };
                            createClanRaid(clanRaid).then((raid) => {
                              interactable.reply({ content: 'Raid will start in 5 minutes. Clan members can join by doing `/clan join-raid`.' });
                              dealClanRaidDamage(context.user.id, raid.recordId, 0, null);
                            }).catch((error) => {
                              reject(error);
                            });
                            addCoinsToClan(clan._id, '', -100000);
                            broadcastClanMessage(context.client, context.player?.clan.channel, context.channel?.id ?? '', 'Raid will start in 5 minutes. Clan members can join by doing \`/clan join-raid\`.', 'Raid');
                          } else {
                            sendEmbed({ context, message: `Your clan doesn't have enough coins to start a raid. You need ${(100000).toLocaleString()} coins to start one.` });
                          }
                        }).catch((error) => {
                          reject(error);
                        });
                      } else if (choice === 3) {
                        getClanOfUser(context.user.id).then((clan) => {
                          if (clan.rewards?.rare !== undefined && clan.rewards?.rare > 0) {
                            clan.rewards.rare -= 1;
                            const randomRaidPokemon = generateClanRaid(clan.perks[3] ?? 0, clan.level, 2);
                            let clanRaid = {
                              pokemon: randomRaidPokemon,
                              hp: 1000000,
                              maxHp: 1000000,
                              time: moment().add(5, 'minutes'),
                              clan: new ObjectId(clan._id),
                            };
                            createClanRaid(clanRaid).then((raid) => {
                              updateClan(clan._id, { rewards: clan.rewards });
                              interactable.reply({ content: 'Raid will start in 5 minutes. Clan members can join by doing `/clan join-raid`.' });
                              dealClanRaidDamage(context.user.id, raid.recordId, 0, null);
                            }).catch((error) => {
                              reject(error);
                            });
                            broadcastClanMessage(context.client, context.player?.clan.channel, context.channel?.id ?? '', 'Raid will start in 5 minutes. Clan members can join by doing \`/clan join-raid\`.', 'Raid');
                          }
                        }).catch((error) => {
                          reject(error);
                        });
                      } else if (choice === 4) {
                        getClanOfUser(context.user.id).then((clan) => {
                          if (clan.rewards?.shiny !== undefined && clan.rewards?.shiny > 0) {
                            clan.rewards.shiny -= 1;
                            const randomRaidPokemon = generateClanRaid(clan.perks[3] ?? 0, clan.level, undefined, true);
                            let clanRaid = {
                              pokemon: randomRaidPokemon,
                              hp: 1000000,
                              maxHp: 1000000,
                              time: moment().add(5, 'minutes'),
                              clan: new ObjectId(clan._id),
                            };
                            createClanRaid(clanRaid).then((raid) => {
                              updateClan(clan._id, { rewards: clan.rewards });
                              interactable.reply({ content: 'Raid will start in 5 minutes. Clan members can join by doing `/clan join-raid`.' });
                              dealClanRaidDamage(context.user.id, raid.recordId, 0, null);
                            }).catch((error) => {
                              reject(error);
                            });
                            broadcastClanMessage(context.client, context.player?.clan.channel, context.channel?.id ?? '', 'Raid will start in 5 minutes. Clan members can join by doing \`/clan join-raid\`.', 'Raid');
                          }
                        }).catch((error) => {
                          reject(error);
                        });
                      } else if (choice === 5) {
                        getClanOfUser(context.user.id).then((clan) => {
                          if (clan.rewards?.shinyRare !== undefined && clan.rewards?.shinyRare > 0) {
                            clan.rewards.shinyRare -= 1;
                            const randomRaidPokemon = generateClanRaid(clan.perks[3] ?? 0, clan.level, 2, true);
                            let clanRaid = {
                              pokemon: randomRaidPokemon,
                              hp: 1000000,
                              maxHp: 1000000,
                              time: moment().add(5, 'minutes'),
                              clan: new ObjectId(clan._id),
                            };
                            createClanRaid(clanRaid).then((raid) => {
                              updateClan(clan._id, { rewards: clan.rewards });
                              interactable.reply({ content: 'Raid will start in 5 minutes. Clan members can join by doing `/clan join raid`.' });
                              dealClanRaidDamage(context.user.id, raid.recordId, 0, null);
                            }).catch((error) => {
                              reject(error);
                            });
                            broadcastClanMessage(context.client, context.player?.clan.channel, context.channel?.id ?? '', 'Raid will start in 5 minutes. Clan members can join by doing \`/clan join-raid\`.', 'Raid');
                          }
                        }).catch((error) => {
                          reject(error);
                        });
                      }
                    }
                  }, 60000);
                }).catch((error) => {
                  reject(error);
                });
              } else {
                sendEmbed({ context, message: 'A clan raid is currently happening. You will have to wait until it is finished to start a new raid.', image: null, thumbnail: null, author: context.user });
              }
            }).catch((error) => {
              reject(error);
            });
          } else {
            sendEmbed({ context, message: 'You need Officer role to start a raid.', image: null, thumbnail: null, author: context.user });
          }
        }).catch((error) => {
          reject(error);
        });
        resolve({});
      } else if (context.commandInterction.options.getSubcommand() === 'join-raid') {
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan.' });
            return;
          }
          getClanRaid(clan._id).then(async (raid) => {
            if (raid === null) {
              sendEmbed({ context, message: `**${clan.name}**\n\nThere's currently no raid.` });
            } else {
              getClanRaidLog(raid._id, context.user.id).then((log) => {
                if (log === null) {
                  if (moment() < moment(raid.time)) {
                    sendEmbed({
                      context, message: `Do you want to join the clan Raid?\nIt will cost **${(100000).toLocaleString()} <:pokecoin:741699521725333534> coins**`, image: null, thumbnail: null, author: context.user, footer: null, title: 'Join a clan raid', color: null, components: [
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
                    }).then((message) => {
                      choiceMaker(context.client.discordClient, context.user.id, message.id, (interaction: ButtonInteraction, user: string, choice: number) => {
                        if (user === context.user.id) {
                          if (choice === 1) {
                            getClanOfUser(context.user.id).then((clan) => {
                              if (clan.balance >= 100000) {
                                dealClanRaidDamage(context.user.id, raid._id, 0, null);
                                sendEmbed({ context, message: 'You joined the clan raid.' });
                                addCoinsToClan(clan._id, '', -100000);
                              } else {
                                sendEmbed({ context, message: `Your clan doesn't have enough coins for you to join the raid. Your clan need ${(100000).toLocaleString()} coins for you to join it.` });
                              }
                            }).catch((error) => {
                              reject(error);
                            });
                          }
                        }
                      }, 60000);
                    }).catch((error) => {
                      reject(error);
                    });
                  } else {
                    sendEmbed({ context, message: `**${clan.name}**\n\nIt is too late to join this raid.` });
                  }
                } else {
                  sendEmbed({ context, message: `**${clan.name}**\n\nYou already joined this clan Raid.` });
                }
              }).catch((error) => {
                reject(error);
              });
            }
          }).catch((error) => {
            reject(error);
          });
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'catch') {
        getClanOfUser(context.user.id).then(async (clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan. You can create one with \`/clan create\`' });
          } else {
            let tries = await context.client.redis.get(`clan-raid-tries-${context.user.id}`);
            let raid = await context.client.redis.get(`clan-raid-${context.user.id}`);
            if (tries !== null && raid !== null) {
              // Try to catch
              let chance = new Chance();
              let caught = chance.weighted([true, false], [400, 600]);
              if (caught) {
                context.client.redis.del(`clan-raid-tries-${context.user.id}`);
                context.client.redis.del(`clan-raid-${context.user.id}`);
                // Create pokemon
                let raidPokemon = JSON.parse(raid);
                let pokemon = randomPokemon(raidPokemon.dexId, 50, [], raidPokemon.shiny ? 1000 : -1, raidPokemon.special);
                createPokemon(context.user.id, pokemon.dexId, pokemon.level, pokemon.shiny, pokemon.moves, pokemon.ivs, pokemon.rarity, true, pokemon.special, pokemon.forme, pokemon.abilitySlot, pokemon.nature, pokemon.gender);
                sendEmbed({ context, message: `You throw a Premier Ball to catch the Raid Pokémon.\nYou caught a ${rarity[pokemon.rarity]} ${pokemon.displayName} ${pokemon.shiny ? '✨' : ''} ${genderEmoji[pokemon.gender] ?? ''} (Lvl. ${pokemon.level})!`, image: getImage(pokemon, true, pokemon.shiny, pokemon.special), thumbnail: null, author: context.user, footer: null, title: null, color: 65280 });
              } else {
                tries = parseInt(tries);
                let raidPokemon = JSON.parse(raid);
                if (tries > 1) {
                  context.client.redis.set(`clan-raid-tries-${context.user.id}`, tries - 1, 'EX', 60 * 30).catch(() => { });
                  sendEmbed({ context, message: `You throw a Premier Ball to catch ${raidPokemon.name}. Oh no! The pokemon got out of it. You have only ${tries - 1} tries left.`, image: null, thumbnail: null, author: context.user });
                } else {
                  context.client.redis.del(`clan-raid-tries-${context.user.id}`);
                  context.client.redis.del(`clan-raid-${context.user.id}`);
                  sendEmbed({ context, message: `You throw a Premier Ball to catch ${raidPokemon.name}. Oh no! The pokemon got out of it and you don't have any try left.`, image: null, thumbnail: null, author: context.user });
                }
              }
            } else {
              sendEmbed({ context, message: 'You don\'t have Pokemon waiting to be caught.', image: null, thumbnail: null, author: context.user });
            }
          }
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'invite') {
        const mention = context.commandInterction.options.getUser('player', true);
        if (context.player?.clan === null) {
          // Has no clan
          sendEmbed({ context, message: 'You are not in a clan. You can create one with \`/clan create\`' });
        } else if (mention.bot) {
          // Can't invite bot
          sendEmbed({ context, message: 'You can\'t invite bot in a clan.' });
        } else if (context.player?.clan.members.length >= 10 + (context.player?.clan.perks[4] ?? 0) * 5) {
          sendEmbed({ context, message: 'You reached the maximum number of members.' });
        } else {
          getClanOfUser(mention.id).then((clan) => {
            if (clan !== null) {
              sendEmbed({ context, message: 'You can\'t invite this user to your clan, they are already in an other clan.' });
            } else {
              // Ask the other person
              sendEmbed({
                context, message: `Hi <@${mention.id}>! <@${context.user.id}> invited you to join their clan **${context.player?.clan.name}**.`, image: null, thumbnail: null, author: null, footer: 'Invitation will expire in 60 seconds.', components: [
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
              }).then((message) => {
                choiceMaker(context.client.discordClient, mention.id, message.id, (interaction: ButtonInteraction, user: string, choice: number) => {
                  getClanOfUser(mention.id).then((clan) => {
                    if (clan === null) {
                      joinClan(context.player?.clan._id, mention.id);
                      createClanHistory(context.player?.clan._id, mention.id);
                      interaction.reply({ content: `You joined the clan ${context.player?.clan.name}` });
                    } else {
                      interaction.reply({ content: 'You can\'t accept, you are already in a clan.' });
                    }
                  }).catch((error) => {
                    reject(error);
                  });
                }, 60000, true);
              }).catch((error) => {
                reject(error);
              });
            }
          }).catch((error) => {
            reject(error);
          });
        }
      } else if (context.commandInterction.options.getSubcommand() === 'members') {
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan.' });
            resolve({});
            return;
          }
          let members = '';

          clan.histories.forEach((member: any) => {
            members += `- <@${member.discord_id}> ${member.role > 0 ? '- Officer' : ''} ${member.discord_id === clan.owner ? '👑' : ''}\n`;
          });

          sendEmbed({ context, message: `**${clan.name}**\n\nMembers:\n${members}` });
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'promote') {
        // Promote
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan.' });
          } else {
            if (clan.owner === context.user.id) {
              const mention = context.commandInterction.options.getUser('player', true);
              getClanOfUser(mention.id).then((clanOfMentioned) => {
                if (clanOfMentioned !== null && clan._id === clanOfMentioned._id) {
                  updateClanHistory(clan._id, mention.id, { role: 1 });
                  sendEmbed({ context, message: `<@${mention.id}> is now Officer.` });
                } else {
                  sendEmbed({ context, message: 'This user is not in your clan.' });
                }
              }).catch((error) => {
                reject(error);
              });
            } else {
              sendEmbed({ context, message: 'Only the owner can promote/demote.' });
            }
          }
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'demote') {
        // Demote
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan.' });
          } else {
            if (clan.owner === context.user.id) {
              const mention = context.commandInterction.options.getUser('player', true);
              getClanOfUser(mention.id).then((clanOfMentioned) => {
                if (clanOfMentioned !== null && clan._id === clanOfMentioned._id) {
                  updateClanHistory(clan._id, mention.id, { role: 0 });
                  sendEmbed({ context, message: `<@${mention.id}> is now a simple member.` });
                } else {
                  sendEmbed({ context, message: 'This user is not in your clan.' });
                }
              }).catch((error) => {
                reject(error);
              });
            } else {
              sendEmbed({ context, message: 'Only the owner can promote/demote.' });
            }
          }
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'perks') {
        // Show perks
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan.' });
          } else {
            let perksText = '';
            if (clan.perks !== null) {
              for (const [key, value] of Object.entries(clan.perks)) {
                perksText += `**${perks[parseInt(key)].name} ${romanNumber[<number>value]}**: ${perks[parseInt(key)].description}\n\n`;
              }
            }
            sendEmbed({ context, message: `**${clan.name}'s perks**\n\n${perksText}` });
          }
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'set-owner') {
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan.' });
          } else if (clan.owner === context.user.id) {
            const mention = context.commandInterction.options.getUser('player', true);
            getClanOfUser(mention.id).then((clanOfGiven) => {
              if (clan._id === clanOfGiven._id) {
                updateClan(clan._id, { owner: mention.id });
              } else {
                sendEmbed({ context, message: `<@${mention.id}> is not in your clan.` });
              }
            }).catch((error) => {
              reject(error);
            });
          } else {
            sendEmbed({ context, message: 'You are not the owner of the clan.' });
          }
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'shop') {
        // Show shop
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan.' });
            resolve({});
          } else {
            let shop = '';
            perks.forEach((element, index) => {
              let level = clan.perks[index] ?? 0;
              if (level < perks[index].price.length) {
                let levelUnlock = perks[index].unlocks[level];
                shop += `\`#${index + 1}\` ${element.name} ${romanNumber[level + 1]}: ${element.description}\n${clan.level >= levelUnlock ? `Price: ${element.price[level].toLocaleString()} coins <:pokecoin:741699521725333534>` : `**Unlocks at level ${levelUnlock}**`}\n\n`;
              }
            });
            sendEmbed({ context, message: `Clan level: ${clan.level}\nClan balance: ${clan.balance.toLocaleString()} <:pokecoin:741699521725333534>\n\n${shop}`, image: null, thumbnail: null, author: null, footer: null, title: 'Perks shop' });
          }
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'banner') {
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan.' });
            resolve({});
            return;
          }
          if (clan.owner === context.user.id) {
            let regex = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/);
            if (context.commandInterction.options.getString('banner', true).match(regex)) {
              updateClan(clan._id, { banner: context.commandInterction.options.getString('banner', true) });
              sendEmbed({ context, message: 'Your Clan\'s banner has been updated.', image: context.commandInterction.options.getString('banner', true) });
            } else {
              sendEmbed({ context, message: 'Invalid image link.' });
            }
          }
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'logo') {
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan.' });
            resolve({});
            return;
          }
          if (clan.owner === context.user.id) {
            let regex = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/);
            if (context.commandInterction.options.getString('link', true).match(regex)) {
              updateClan(clan._id, { logo: context.commandInterction.options.getString('link', true) });
              sendEmbed({ context, message: 'Your Clan\'s logo has been updated.', image: context.commandInterction.options.getString('link', true) });
            } else {
              sendEmbed({ context, message: 'Invalid image link.' });
            }
          }
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'color') {
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan.' });
            resolve({});
            return;
          }
          if (clan.owner === context.user.id) {
            let regex = new RegExp(/^#([a-fA-F0-9]{6})$/);
            if (context.commandInterction.options.getString('color', true).match(regex)) {
              updateClan(clan._id, { color: context.commandInterction.options.getString('color', true) });
              sendEmbed({ context, message: 'You Clan\'s color has been updated.' });
            } else {
              sendEmbed({ context, message: 'Invalid color link.' });
            }
          }
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'motd') {
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan. You can create one with \`/clan create\`' });
          } else if (clan.owner === context.user.id) {
            updateClan(clan._id, { motd: context.commandInterction.options.getString('text', true) });
            sendEmbed({ context, message: 'Your message of the day has been updated.' });
          }
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'kick') {
        // Kick member
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan.' });
          } else {
            if (clan.owner === context.user.id || clan.history.role > 0) {
              const mention = context.commandInterction.options.getUser('player', true);
              getClanOfUser(mention.id).then((clanOfMentioned) => {
                if (clan.owner !== mention.id && clanOfMentioned !== null && clan._id === clanOfMentioned._id) {
                  sendEmbed({ context, message: `<@${mention.id}> has been kicked.` });
                  getClanGym(clan._id).then(async (gym) => {
                    for (let i = 0; i < gym.pokemons.length; i++) {
                      if (gym.pokemons[i].owner === mention.id) {
                        await removePokemonFromClanGym(mention.id, clan._id);
                        addPokemon(gym.pokemons[i].pokemon);
                      }
                    }
                  }).catch((e) => {
                    Logger.error(e);
                  });
                  deleteClanHistory(clan._id, mention.id);
                  updatePlayer(mention.id, { clan: null });
                } else if (clan.owner !== mention.id) {
                  sendEmbed({ context, message: 'You can\'t kick the owner.' });
                } else {
                  sendEmbed({ context, message: 'This user is not in your clan.' });
                }
              }).catch((error) => {
                reject(error);
              });
            } else {
              sendEmbed({ context, message: 'Only the owner can promote/demote.' });
            }
          }
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'buy') {
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan. You can create one with \`/clan create\`' });
          } else if (clan.owner === context.user.id || clan.history.role > 0) {
            // Prompt purchase
            // Remove money
            let clanPerks: any = clan.perks ?? {};
            let slot = context.commandInterction.options.getInteger('number', true) - 1;
            let currentLevel = clan.perks[slot] ?? 0;
            if (perks[slot] === undefined) {
              sendEmbed({ context, message: 'Invalid perk number' });
            } else if (clan.level >= perks[slot].unlocks[currentLevel]) {
              if (clan.balance >= perks[slot].price[currentLevel]) {
                clanPerks[slot] = (clan.perks[slot] ?? 0) + 1;
                updateClan(clan._id, { perks: clanPerks });
                addCoinsToClan(clan._id, 'purchase', -perks[slot].price[currentLevel]);
                sendEmbed({ context, message: `You clan has now the perks **${perks[slot].name} ${romanNumber[currentLevel + 1]}**` });
              } else {
                sendEmbed({ context, message: `Your clan need ${perks[slot].price[currentLevel].toLocaleString()} <:pokecoin:741699521725333534> in its balance but you have ${clan.balance.toLocaleString()} <:pokecoin:741699521725333534>.` });
              }
            } else {
              sendEmbed({ context, message: `Your clan need to be level **${perks[slot].unlocks[currentLevel]}** but it is level **${clan.level}**.` });
            }
          } else {
            sendEmbed({ context, message: 'You need Officer role to purchase in the shop.', image: null, thumbnail: null, author: context.user });
          }
          resolve({});
        }).catch(error => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'server') {
        getClanOfUser(context.user.id).then((clan) => {
          if (!context.interaction.memberPermissions?.has(Permissions.FLAGS.MANAGE_GUILD)) {
            sendEmbed({ context, message: 'You need Manage Server permission to do that.' });
          } else if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan.' });
          } else if (clan.owner !== context.user.id) {
            sendEmbed({ context, message: 'You are not the owner of the clan.' });
          } else if (clan.channel === context.channel?.id) {
            sendEmbed({ context, message: 'Clan announcements won\'t be only sent here now.' });
            updateClan(clan._id, { channel: '' });
          } else {
            sendEmbed({ context, message: 'Clan announcements will be sent here now.' });
            updateClan(clan._id, { channel: context.channel?.id });
          }
          resolve({});
        }).catch((error) => {
          console.log(error);
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'view') {
        getClanOfUser(context.user.id).then((clan) => {
          if (clan === null) {
            sendEmbed({ context, message: 'You are not in a clan. You can create one with \`/clan create\`' });
          } else {
            let embed = new MessageEmbed();
            embed.setDescription(clan.motd);
            embed.addField('Infos', `Leader: <@${clan.owner}>\nMembers: ${clan.members.length}/${10 + (context.player?.clan.perks[4] ?? 0) * 5}`, true);
            embed.addField('Stats', `**Level**: ${clan.level}\n**Experience**:\n${clan.experience.toLocaleString()}/${clan.requiredExperience.toLocaleString()}\n**Balance**:\n${clan.balance?.toLocaleString() ?? 0} <:pokecoin:741699521725333534>`, true);
            embed.addField('Your contribution', `Experience: ${clan.history?.experience.toLocaleString() ?? 0}\nCoins: ${clan.history?.coins?.toLocaleString() ?? 0} <:pokecoin:741699521725333534>\nDojo points: ${clan.history?.dojoPoints} (${clan.history?.dojoPointsAllTime} all time)`, true);
            embed.addField('Dojo', `Points: ${clan.dojoPoints}\nRanking: ${clan.ranking > 0 ? `#${clan.ranking}` : 'Not ranked yet'}`);
            embed.setTitle(clan.name);
            embed.setImage(clan.banner);
            embed.setThumbnail(clan.logo);
            embed.setColor(clan.color);
            embed.setFooter({
              text: 'Dojo ranking is updated once every 10 minutes',
            });
            context.commandInterction.editReply({ embeds: [embed] });
            // sendEmbed(context, context.channel, `**${clan.name}**\nLevel: ${clan.level}\n\n\n\n\nPerks: none\n\n${clan.motd}\n`, clan.banner, null, clan.logo);
          }
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'leaderboard') {
        getClanOfUser(context.user.id).then((userClan) => {
          if (userClan === null) {
            sendEmbed({ context, message: 'You are not in a clan. You can create one with \`/clan create\`' });
          } else {
            getBestClans().then((clans) => {
              let leaderboard = '';
              let inRanking = false;
              clans.forEach((clan: any, index: any) => {
                if (userClan._id === clan._id) {
                  inRanking = true;
                }
                leaderboard += `${userClan._id === clan._id ? '**' : ''} #${clan.ranking} - ${clan.name} - ${clan.dojoPoints} points${userClan._id === clan._id ? '**' : ''} \n`;
              });
              if (!inRanking && userClan.ranking > 0) {
                leaderboard += `**#${userClan.ranking} - ${userClan.name} - ${userClan.dojoPoints} points**\n`;
              }
              let embed = new MessageEmbed();
              embed.setDescription(leaderboard);
              embed.setTitle('Leaderboard');
              embed.setFooter('Dojo ranking is updated once every 10 minutes');
              context.commandInterction.editReply({ embeds: [embed] });
            }).catch((error) => {
              reject(error);
            });
          }
        }).catch((error) => {
          reject(error);
        });
      }
    });
  },
};
