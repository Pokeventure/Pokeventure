import { Command, CommandContext } from 'command';
import { Pokemon } from 'pokemon';
import { sendEmbed, getRndInteger, getImage, isTrainer } from '../modules/utils';
import {
  getInventory, addToInventory, createPokemon, addStats, getBingo, updateBingo, generateBingo,
} from '../modules/database';
import { incrementQuest } from '../modules/quests';
import { genderEmoji, getPokemon, registerPokemon } from '../modules/pokedex';
import { randomPokemon } from '../modules/world';
import Logger from '../modules/logger';
import { SlashCommandBuilder } from '@discordjs/builders';
import { giveCurrency, giveCurrencyChance } from '../modules/event';
import { Chance } from 'chance';
import { increaseResearch, Research } from '../modules/research';

const ballToId: any = {
  pokeball: 0, greatball: 1, ultraball: 2, masterball: 3, pb: 0, gb: 1, ub: 2, mb: 3,
};
const ballToStats: any = {
  pokeball: 'pokeball', greatball: 'greatball', ultraball: 'ultraball', masterball: 'masterball', pb: 'pokeball', gb: 'greatball', ub: 'ultraball', mb: 'masterball',
};
const ballNames: any = ['Pokéball', 'Greatball', 'Ultraball', 'Masterball'];
const ballChances: any = [20, 33, 40, 1000];
const rarityModifier: any = [15, 8, 4, -4, -8, -15];
const rarity = ['<:n_:744200749600211004>', '<:u_:744200749541621851>', '<:r_:744200749554073660>', '<:sr:744200749189431327>', '<:ur:744200749537558588>', '<:lr:746745321660481576>'];

export const Catch: Command = {
  name: 'Catch',
  keywords: ['catch', 'c'],
  category: 'Fight',
  fullDesc: 'Use this command to send a Pokéball to the wild Pokémon you are facing. You can just send a message with the type of the Pokéball to go faster.\n\nUsage: `%PREFIX%catch <type of Pokéball>`\n\nExample : `%PREFIX%catch masterball` to use a Masterball.\nExample : `pokeball` to use a Pokéball quickly.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('catch')
    .setDescription('Catch a Pokémon.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('pokeball')
        .setDescription('Use a Pokeball'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('greatball')
        .setDescription('Use a Greatball'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('ultraball')
        .setDescription('Use a Ultraball'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('masterball')
        .setDescription('Use a Masterball')),

  handler(context: CommandContext): Promise<any> {
    return new Promise<any>(async (resolve, reject) => {
      let raidTries = await context.client.redis.get(`tries-${context.user.id}`);
      const caught = await context.client.redis.get(`caught-${context.user.id}`);
      if (raidTries !== null) {
        raidTries = parseInt(raidTries);
      }
      if (caught !== null && raidTries > 0) {
        raidTries = 0;
        context.client.redis.set(`tries-${context.user.id}`, 0, 'EX', 15 * 60).catch(() => { });
        context.client.redis.set(`caught-${context.user.id}`, 1, 'EX', 30).catch(() => { });
      }
      if (context.client.encounter[context.user.id] === undefined
        && (raidTries === null || raidTries <= 0)
        && context.client.channelPokemons[context.interaction.channelId ?? ''] === undefined) {
        sendEmbed({ context, message: 'You are not facing any Pokémon', image: null, thumbnail: null, author: context.user }).then(() => {
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.client.encounter[context.user.id] !== undefined && isTrainer(context.client.encounter[context.user.id])) {
        sendEmbed({ context, message: 'You can\'t catch trainers.', image: null, thumbnail: null, author: context.user }).then(() => {
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.client.encounter[context.user.id] !== undefined && context.client.encounter[context.user.id].fighting) {
        sendEmbed({ context, message: 'You are currently fighting a Pokémon. You will be able to catch it if you defeat it.', image: null, thumbnail: null, author: context.user }).then(() => {
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else {
        let ball = 'pokeball';
        if (context.interaction.isButton()) {
          if (context.args !== undefined) {
            ball = ballToStats[context.args[1]];
          }
        } else if (context.interaction.isCommand()) {
          ball = ballToStats[context.commandInterction.options.getSubcommand(true)];
        }
        getInventory(context.user.id).then(async (result: any) => {
          if (result !== null && result.inventory !== undefined && result.inventory !== null && result.inventory[ballToId[ball]] !== undefined && result.inventory[ballToId[ball]].quantity > 0) {
            let pokemon: Pokemon | undefined;
            let isRaid = false;
            let isLottery = false;

            if (context.client.encounter[context.user.id] !== undefined) {
              pokemon = context.client.encounter[context.user.id];
            } else if (context.client.channelPokemons[context.interaction.channelId ?? ''] !== undefined) {
              pokemon = context.client.channelPokemons[context.interaction.channelId ?? ''].pokemon;
              isLottery = true;
            } else if (raidTries !== null && raidTries > 0) {
              raidTries--;
              context.client.redis.set(`tries-${context.user.id}`, raidTries, 'EX', 15 * 60).catch(() => { });
              const raid = await context.client.redis.get('raid');
              if (raid === null) {
                return;
              }
              pokemon = JSON.parse(raid);
              isRaid = true;
            }
            if (pokemon === undefined) { return; }
            addToInventory(context.user.id, ballToId[ball], -1).catch((error) => {
              reject(error);
            });
            addStats(context.user.id, ballToStats[ball], 1);
            const rand = getRndInteger(0, 100);
            if (rand < ballChances[ballToId[ball]] * (pokemon.fainted || isLottery ? 2 : 1) + rarityModifier[pokemon.rarity]) {
              if (isRaid) {
                pokemon = randomPokemon(pokemon.dexId, 20, [], pokemon.shiny ? 1000 : -1, pokemon.special);
              }
              if (isLottery) {
                clearTimeout(context.client.channelPokemons[context.interaction.channelId ?? ''].timeout);
                context.client.channelPokemons[context.interaction.channelId ?? ''].message.deleteReply().catch(() => { });
                delete context.client.channelPokemons[context.interaction.channelId ?? ''];
              }

              const pokemonTypes = getPokemon(pokemon.dexId).types;
              if (isRaid) {
                context.client.redis.set(`tries-${context.user.id}`, -10, 'EX', 15 * 60).catch(() => { });
                context.client.redis.set(`caught-${context.user.id}`, 1, 'EX', 5 * 60).catch(() => { });
              } else {
                if (context.client.encounter[context.user.id] !== undefined) {
                  clearTimeout(context.client.encounter[context.user.id].timeout);
                }
                delete context.client.encounter[context.user.id];
              }
              addStats(context.user.id, 'catch', 1);
              if (pokemon.shiny) {
                addStats(context.user.id, 'shiny', 1);
              }
              registerPokemon(context.user.id, pokemon);

              createPokemon(context.user.id, pokemon.dexId, pokemon.level, pokemon.shiny, pokemon.moves, pokemon.ivs, pokemon.rarity, isRaid, pokemon.special, pokemon.forme, pokemon.abilitySlot, pokemon.nature, pokemon.gender).then(async (res) => {
                if (pokemon !== undefined) {
                  let components: any[] = [];
                  components.push({
                    type: 2,
                    label: 'Release',
                    style: 1,
                    customId: `release_${res.recordId}_u:${context.user.id}`,
                    emoji: {
                      name: '🗑'
                    }
                  });
                  components.push({
                    type: 2,
                    label: 'Favorite',
                    style: 1,
                    customId: `favorite_${res.recordId}_u:${context.user.id}`,
                    emoji: {
                      name: '❤️'
                    }
                  });
                  await sendEmbed({ context, message: `You throw a ${ballNames[ballToId[ball]]} to catch the Pokémon.\nYou caught a ${rarity[pokemon.rarity]} ${pokemon.displayName} ${pokemon.shiny ? '✨' : ''} ${genderEmoji[pokemon.gender] ?? ''} (Lvl. ${pokemon.level})!`, image: getImage(pokemon, true, pokemon.shiny, pokemon.special), thumbnail: null, author: context.user, footer: null, title: null, color: 65280, components: components });
                  incrementQuest(context, context.user, 'catchAny', 1);
                  incrementQuest(context, context.user, 'catchPokemon', 1, pokemon.dexId);
                  incrementQuest(context, context.user, 'catchType', 1, pokemonTypes);
                  incrementQuest(context, context.user, 'catchInLocation', 1, pokemon.location);
                  incrementQuest(context, context.user, 'catchSpecialPokemons', 1, pokemon.forme);
                  incrementQuest(context, context.user, 'tutorialCatch', 1);
                  incrementQuest(context, context.user, 'catchPokemonsSpecific', 1, [pokemon.dexId, pokemon.special]);
                  await increaseResearch(context, context.user.id, Research.catch, pokemon.dexId, context.player?.research?.data);
                  /* if (new Date() >= new Date(context.client.event.startDate) && new Date() < new Date(context.client.event.endDate)) {
                    await getBingo(context.user.id).then((res) => {
                      if (res === null) {
                        return;
                      }
                      if (res.card.some((row: any) => row.includes(pokemon?.dexId))) {
                        for (let y = 0; y < 5; y++) {
                          for (let x = 0; x < 5; x++) {
                            if (res.card[y][x] === pokemon?.dexId) {
                              res.card[y][x] = -res.card[y][x];
                            }
                          }
                        }

                        // Check for line
                        let lineFinished: number = 0;
                        for (let y = 0; y < 5; y++) {
                          let lineCompleted = true;
                          for (let x = 0; x < 5; x++) {
                            if (res.card[y][x] > 0) {
                              lineCompleted = false;
                            }
                          }
                          if (lineCompleted) {
                            lineFinished++;
                          }
                        }
                        for (let x = 0; x < 5; x++) {
                          let lineCompleted = true;
                          for (let y = 0; y < 5; y++) {
                            if (res.card[y][x] > 0) {
                              lineCompleted = false;
                            }
                          }
                          if (lineCompleted) {
                            lineFinished++;
                          }
                        }

                        let lineCompleted = true;
                        for (let i = 0; i < 5; i++) {
                          if (res.card[i][i] > 0) {
                            lineCompleted = false;
                          }
                        }
                        if (lineCompleted) {
                          lineFinished++;
                        }

                        lineCompleted = true;
                        for (let i = 4; i > 0; i--) {
                          if (res.card[i][4 - i] > 0) {
                            lineCompleted = false;
                          }
                        }
                        if (lineCompleted) {
                          lineFinished++;
                        }

                        if (lineFinished < 2) {
                          updateBingo(context.user.id, res.card);
                        } else {
                          addStats(context.user.id, 'bingo', 1);
                          generateBingo(context.user.id).then(async (res) => {
                            await sendEmbed({ context, message: 'You completed your Bingo card. Here\'s your new Bingo card. You can check the card again by doing `/event` again.', image: `http://image.pokeventure.com/bingo.php?d=${JSON.stringify({ data: res.bingo })}` });
                            await incrementQuest(context, context.user, 'completeBingo', 1);
                          }).catch((error) => {
                            Logger.error(error);
                          });
                        }
                      }
                    }).catch((error) => {
                      reject(error);
                    });
                    resolve({});
                  } */
                  if (pokemon.forme === 'xmas') {
                    let chance = Chance();
                    let amount = chance.weighted([1, 2, 3], [3, 2 ,1]);
                    await giveCurrency(context, amount);
                  }
                }
              }).catch((error) => {
                reject(error);
              });
            } else if (isRaid) {
              if (raidTries !== null && raidTries > 0) {
                sendEmbed({ context, message: `You throw a ${ballNames[ballToId[ball]]} to catch ${pokemon.name}. Oh no! The pokemon got out of it. You have only ${raidTries} tries left.`, image: null, thumbnail: null, author: context.user }).then(() => {
                  resolve({});
                }).catch((error) => {
                  reject(error);
                });
              } else {
                sendEmbed({ context, message: `You throw a ${ballNames[ballToId[ball]]} to catch ${pokemon.name}. Oh no! The pokemon got out of it and you don't have any try left.`, image: null, thumbnail: null, author: context.user }).then(() => {
                  resolve({});
                }).catch((error) => {
                  reject(error);
                });
              }
            } else if (isLottery) {
              sendEmbed({ context, message: `You throw a ${ballNames[ballToId[ball]]} to catch ${pokemon.name}. The pokemon got out of it. Try again!`, image: null, thumbnail: null, author: context.user }).then(() => {
                resolve({});
              }).catch((error) => {
                reject(error);
              });
            } else {
              clearTimeout(context.client.encounter[context.user.id].timeout);
              delete context.client.encounter[context.user.id];
              sendEmbed({ context, message: `You throw a ${ballNames[ballToId[ball]]} to catch ${pokemon.name}. The pokemon got out of it and escaped.`, image: null, thumbnail: null, author: context.user }).then(() => {
                resolve({});
              }).catch((error) => {
                reject(error);
              });
            }
          } else {
            sendEmbed({ context, message: `You don't have any ${ballNames[ballToId[ball]]}. You can buy some or wait for your reward.`, image: null, thumbnail: null, author: context.user });
            resolve({});
          }
        }).catch((error) => {
          reject(error);
        });
      }
    });
  },
};
