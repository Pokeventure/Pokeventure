import { Pokemon } from 'pokemon';
import { User as UserContext } from 'command';
import { Db, ObjectID } from 'mongodb';
import { CommandContext } from 'command';
import { Chance } from 'chance';
import moment from 'moment';
import { gql, GraphQLClient } from 'graphql-request';
import {
  getAbilities, getPokemon as getPokemonDex, registerPokemon, getPokemon as getPokemonById,
} from './pokedex';
import {
  calculateLevelExperience, sendEmbed, getImage, calculateLevelFromExperience, sendDM
} from './utils';
import { incrementQuest } from './quests';
import { Moves } from '../../simulator/.data-dist/moves';
import { GET_ALL_POKEMONS, GET_POKEMON_BY_NUMBER, GET_POKEMON_BY_ID, CREATE_POKEMON, UPDATE_POKEMON, UPDATE_POKEMONS, DELETE_POKEMON, DELETE_POKEMONS, GET_POKEMON_BY_NICKNAME, ADD_FRIENDSHIP } from '../queries/pokemon';
import { ADD_COINS, ADD_STAT, COUNT_PLAYERS, CREATE_PLAYER, GET_PLAYER, GET_PLAYER_QUESTS, GET_PLAYER_TEAMS, GET_STATS, SET_PLAYER_SELECTED_TEAM, UPDATE_PLAYER, UPDATE_PLAYERS, ADD_BATTLE_POINTS, GET_PATRONS, GET_PLAYER_CLAN, ADD_CURRENCY } from '../queries/player';
import { ADD_TO_INVENTORY, GET_INVENTORY, ADD_LOOTBOX } from '../queries/inventory';
import { CREATE_TEAM, GET_TEAM_BY_NAME, ADD_TO_TEAM, REMOVE_FROM_TEAM, UPDATE_TEAM, DELETE_TEAM } from '../queries/team';
import { ADD_TO_MARKET, GET_MARKET, DELETE_OFFER, DELETE_OFFERS } from '../queries/market';
import { CLEAR_RAID_LOG, CREATE_RAID, DELETE_RAID, GET_RAID, START_RAID_TIMER } from '../queries/raid';
import { CREATE_GUILD, GET_GUILD, UPDATE_GUILD } from '../queries/guild';
import { UPDATE_GYM, GET_GYM, CREATE_GYM, DELETE_GYM } from '../queries/gym';
import { UPDATE_QUEST, CREATE_QUEST, DELETE_QUEST, DELETE_QUESTS } from '../queries/quests';
import { CREATE_POKEDEX, GET_POKEDEX, UPDATE_POKEDEX } from '../queries/pokedex';
import { CREATE_MARKET_LOG, CREATE_MONEY_LOG, CREATE_TRADE_LOG, DEAL_MEGA_RAID_DAMAGE, DEAL_RAID_DAMAGE, GET_MEGA_RAID_LOG, GET_MEGA_RAID_LOGS, GET_RAID_LOGS } from '../queries/log';
import { START_MEGA_RAID_TIMER, DELETE_MEGA_RAID, GET_MEGA_RAID, CREATE_MEGA_RAID, CLEAR_MEGA_RAID_LOG } from '../queries/megaRaid';
import { ADD_COINS_TO_CLAN, ADD_EXPERIENCE_TO_CLAN, CREATE_CLAN, DELETE_CLAN, UPDATE_CLAN, ADD_COINS_TO_CLAN_HISTORY, ADD_EXPERIENCE_TO_CLAN_HISTORY, CREATE_CLAN_HISTORY, GET_CLAN_HISTORY, DELETE_CLAN_HISTORY, DELETE_CLAN_HISTORIES, UPDATE_CLAN_HISTORY, CREATE_CLAN_RAID, GET_CLAN_RAID, DEAL_CLAN_RAID_DAMAGE, GET_CLAN_RAID_LOGS, GET_CLAN_RAID_LOG, ADD_POKEMON_TO_CLAN_GYM, REMOVE_POKEMON_FROM_CLAN_GYM, GET_CLAN_GYM, GET_RANDOM_GYM_TO_FIGHT, GET_CLAN, DEAL_CLAN_GYM_DAMAGE, USE_GYM_STAMINA, ADD_DOJO_POINTS, UPDATE_RANKING, GET_TEN_BEST_CLANS, GET_CLANS, RESET_DOJO, RESET_STAMINA } from '../queries/clans';
import { GENERATE_BINGO, GET_BINGO, UPDATE_BINGO } from '../queries/bingo';
import { CREATE_WONDERTRADE, DELETE_WONDERTRADE, GET_WONDERTRADE, GET_WONDERTRADES } from '../queries/wondertrade';
import { CREATE_RESEARCH, UPDATE_RESEARCH } from '../queries/research';
import Logger from './logger';
import { MessageEmbed } from 'discord.js';
import { increaseResearch, Research } from './research';

let db: Db;
let graphqlClient: GraphQLClient;

function connect(connection: Db, client: GraphQLClient) {
  db = connection;
  graphqlClient = client;
}

function createPokemons(pokemons: any[]) {
  const pokemonCollection = db.collection('pokemons');

  return pokemonCollection.insertMany(pokemons);
}

function giveExperience(pokemon: Pokemon, experience: number, context: CommandContext) {
  if (pokemon.level >= 100) {
    return null;
  }
  addExperience(pokemon._id, experience).then(() => {
    getPokemonByObjectID(pokemon._id).then(async (res) => {
      pokemon = res;
      let incLevel = 0;
      if (pokemon.experience >= calculateLevelExperience(pokemon.level + 1)) {
        const pokemonData = getPokemonById(pokemon.dexId, pokemon.special);
        do {
          pokemon.level++;
          incLevel++;
          if (pokemonData.evolutions.length > 0) {
            for (let i = 0; i < pokemonData.evolutions.length; i++) {
              if (pokemonData.evolutions[i].level > 0 && pokemon.level >= pokemonData.evolutions[0].level) {
                if (pokemonData.evolutions[i].genderCondition !== undefined) {
                  if (pokemonData.evolutions[i].genderCondition !== pokemon.gender) {
                    continue;
                  }
                }
                if(pokemonData.evolutions[i].zone !== undefined && pokemonData.evolutions[i].zone.indexOf(context.player?.location) !== -1) {
                  evolvePokemon(context, pokemon, pokemonData.evolutions[i].id, context.user, pokemonData.evolutions[i].special);
                } else if (pokemonData.evolutions[i].condition === 'levelRandom') {
                  let chance = new Chance();
                  evolvePokemon(context, pokemon, <any>chance.pickset(pokemonData.evolutions[i].randomId)[0], context.user);
                } else if (pokemonData.evolutions[i].condition === 'levelForm') {
                  let chance = new Chance();
                  evolvePokemon(context, pokemon, pokemonData.evolutions[i].id, context.user, undefined, <any>chance.pickset(pokemonData.evolutions[i].randomForm)[0]);
                } else {
                  evolvePokemon(context, pokemon, pokemonData.evolutions[i].id, context.user);
                }
                break;
              } else if (pokemonData.evolutions[i].move !== undefined && pokemon.moves.includes(pokemonData.evolutions[0].move)) {
                evolvePokemon(context, pokemon, pokemonData.evolutions[i].id, context.user);
                break;
              } else if (pokemonData.evolutions[i].type !== undefined) {
                const movesData: any = Moves;
                for (let j = 0; j < pokemon.moves.length; j++) {
                  if (movesData[pokemon.moves[j]].type === pokemonData.evolutions[i].type) {
                    evolvePokemon(context, pokemon, pokemonData.evolutions[i].id, context.user);
                    break;
                  }
                }
              }
            }
          }
        } while (pokemon.experience >= calculateLevelExperience(pokemon.level + 1));

        await sendEmbed({ context, message: `${pokemon.nickname !== null ? pokemon.nickname : pokemonData.displayName} leveled up to ${pokemon.level}!`, followUp: true });
      }
      if (pokemon.level === 100) {
        pokemon.experience = calculateLevelExperience(100);
      }
      if (incLevel > 0) {
        setLevel(pokemon._id, pokemon.experience, pokemon.level);
      }
    }).catch((error) => {
      Logger.error(error);
    });
  }).catch((error) => {
    Logger.error(error);
  });
}

async function giveLevel(pokemon: Pokemon, context: CommandContext, amount: number = 1) {
  const pokemonData = getPokemonById(pokemon.dexId, pokemon.special);
  if (pokemon.level >= 100 && pokemonData.evolutions.length === 0) {
    return null;
  }

  if (pokemon.level < 100) {
    pokemon.experience = calculateLevelExperience(pokemon.level + amount);
    pokemon.level += amount;
  }
  if (pokemonData.evolutions.length > 0) {
    for (let i = 0; i < pokemonData.evolutions.length; i++) {
      if (pokemonData.evolutions[i].level > 0 && pokemon.level >= pokemonData.evolutions[i].level) {
        if (pokemonData.evolutions[i].genderCondition !== undefined) {
          if (pokemonData.evolutions[i].genderCondition !== pokemon.gender) {
            continue;
          }
        }
        if(pokemonData.evolutions[i].zone !== undefined && pokemonData.evolutions[i].zone.indexOf(context.player?.location) !== -1) {
          evolvePokemon(context, pokemon, pokemonData.evolutions[i].id, context.user, pokemonData.evolutions[i].special);
        } else if (pokemonData.evolutions[i].condition === 'levelRandom') {
          let chance = new Chance();
          evolvePokemon(context, pokemon, <any>chance.pickset(pokemonData.evolutions[i].randomId)[0], context.user);
        } else if (pokemonData.evolutions[i].condition === 'levelForm') {
          let chance = new Chance();
          evolvePokemon(context, pokemon, pokemonData.evolutions[i].id, context.user, null, <any>chance.pickset(pokemonData.evolutions[i].randomForm)[0]);
        } else {
          evolvePokemon(context, pokemon, pokemonData.evolutions[i].id, context.user);
        }
        break;
      } else if (pokemonData.evolutions[i].move !== undefined && pokemon.moves.includes(pokemonData.evolutions[0].move)) {
        evolvePokemon(context, pokemon, pokemonData.evolutions[i].id, context.user);
        break;
      } else if (pokemonData.evolutions[i].type !== undefined) {
        const movesData: any = Moves;
        for (let j = 0; j < pokemon.moves.length; j++) {
          if (movesData[pokemon.moves[j]].type === pokemonData.evolutions[i].type) {
            evolvePokemon(context, pokemon, pokemonData.evolutions[i].id, context.user);
            break;
          }
        }
      }
    }
  }

  await sendEmbed({ context, message: `${pokemon.nickname !== null ? pokemon.nickname : pokemonData.displayName} leveled up to ${Math.min(pokemon.level, 100)}!`, followUp: true });
  if (pokemon.level >= 100) {
    pokemon.level = 100;
    pokemon.experience = calculateLevelExperience(100);
  }

  return setLevel(pokemon._id, pokemon.experience, pokemon.level);
}

async function evolvePokemon(context: CommandContext, pokemon: Pokemon, id: number, author: UserContext | undefined, special?: any, forme?: any, ignoreLock?: boolean, sendToDm?: boolean) {
  if (pokemon.evolutionLock && !ignoreLock) {
    return false;
  }
  if (pokemon.forme === 'xmas') {
    return false;
  }
  const oldId = pokemon.dexId;
  const oldName = pokemon.name.toString();
  await increaseResearch(context, context.user.id, Research.evolving, oldId, context.player?.research?.data);
  if (pokemon.name === getPokemonById(pokemon.dexId, pokemon.special).displayName) {
    pokemon.name = getPokemonById(id).displayName;
  }
  if (pokemon.dexId === 562 || pokemon.dexId === 222 || pokemon.dexId === 264) {
    pokemon.special = undefined;
  }
  if (forme !== undefined) {
    pokemon.forme = forme;
  }
  pokemon.dexId = id;

  if (special !== undefined) {
    pokemon.special = special;
  }

  const abilities = getAbilities(pokemon.dexId, special);
  if (abilities[pokemon.abilitySlot] === undefined) {
    pokemon.abilitySlot = '0';
  }

  if (sendToDm) {
    const embed = new MessageEmbed();
    embed.setDescription(`What? ${getPokemonById(oldId, pokemon.special).displayName} is evolving!\nCongratulations! Your ${oldName} evolved into ${getPokemonById(id, special).displayName}!`)
      .setImage(getImage(pokemon, true, pokemon.shiny, pokemon.special))
      .setAuthor({
        name: author?.username ?? '',
        iconURL: author?.avatarURL,
      });
    await sendDM(context.client, author?.id ?? '', { embeds: [embed] });
  } else {
    await sendEmbed({ context, message: `What? ${getPokemonById(oldId, special !== undefined ? undefined : pokemon.special).displayName} is evolving!\nCongratulations! Your ${oldName} evolved into ${getPokemonById(id, special).displayName}!`, image: getImage(pokemon, true, pokemon.shiny, pokemon.special), thumbnail: null, author, followUp: true });
  }

  if (author !== undefined) {
    let u: UserContext = {
      id: author.id,
      username: author.username,
      avatarURL: author.avatarURL,
    };
    incrementQuest(context, u, 'evolve', 1, id);
  }
  if (author !== undefined) { registerPokemon(author.id, pokemon); }

  const pokemonCollection = db.collection('pokemons');

  return pokemonCollection.updateOne(
    { _id: new ObjectID(pokemon._id) }, {
    $set: {
      dexId: id, name: pokemon.name, special: pokemon.special, forme: pokemon.forme, abilitySlot: pokemon.abilitySlot,
    },
  },
  );
}

function countPokemons(dexId: number, special: any = undefined, shiny = false, owner: any = undefined) {
  const pokemonCollection = db.collection('pokemons');

  let search: any = {
    dexId,
  };

  if (special !== undefined) {
    search = {
      ...search,
      special,
    };
  }

  if (shiny) {
    search = {
      ...search,
      shiny: true,
    };
  }

  if (owner !== undefined) {
    search = {
      ...search,
      owner,
    };
  }

  return pokemonCollection.countDocuments(search);
}


function addExperience(pokemonId: string, experience: number) {
  const pokemonCollection = db.collection('pokemons');

  return pokemonCollection.updateOne(
    { _id: new ObjectID(pokemonId) }, { $inc: { experience, use: 1 } },
  );
}

function setLevel(pokemonId: string, experience: number, level: number) {
  const pokemonCollection = db.collection('pokemons');

  return pokemonCollection.updateOne(
    { _id: new ObjectID(pokemonId) }, { $set: { experience, level } },
  );
}

export async function resetPokemonReward() {
  try {
    const variables = {
      record: { pokemonReward: false },
      filter: { pokemonReward: true },
    };
    const request = await graphqlClient.request(UPDATE_PLAYERS, variables);
    return request.updatePlayers;
  } catch (e) {
    throw e;
  }
}

export async function resetEvent() {
  try {
    const variables = {
      record: { event: false },
      filter: { event: true },
    };
    const request = await graphqlClient.request(UPDATE_PLAYERS, variables);
    return request.updatePlayers;
  } catch (e) {
    throw e;
  }
}

function generateNextId(lastId: string, idLength = 4) {
  if (lastId.length !== idLength) { throw new Error(`Last ID '${lastId}' length should be same as requested length '${idLength}'`); }

  // The digits in the space are aliased by these characters:
  const charPool = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'j', 'k', 'm',
    'n', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '2', '3', '4', '5', '6', '7', '8', '9'];
  const base = charPool.length;

  // Translate the last ID from our custom character pool to its corresponding
  // numeric value in the correct base.
  let lastNum: any = '';
  for (let i = 0; i < idLength; i++) {
    lastNum += charPool.indexOf(lastId[i]).toString(base);
  }

  // Switch to Base 10 and add our custom increment to get the next ID.
  // If the size of charPool changes, make sure "increment" is
  // relatively prime with the new base.
  lastNum = parseInt(lastNum, base);
  const increment = 3 * Math.pow(base, 3) + 11 * Math.pow(base, 2) + 9 * base + 21;
  let nextNum: any = (lastNum + increment) % Math.pow(base, idLength);

  // switch back to designated base
  nextNum = nextNum.toString(base);

  // Pad the number with zeroes so we always get the correct length.
  const nextNumStr = ('0'.repeat(idLength) + nextNum).substr((-1) * idLength, idLength);

  // Translate from the designated base to our custom character pool.
  let nextId = '';
  for (let i = 0; i < idLength; i++) { nextId += charPool[parseInt(nextNumStr[i], base)]; }
  return nextId;
}

async function giveMarketId() {
  const marketCollection = db.collection('market');

  const lastId = (await marketCollection.find({ marketId: { $exists: true } }).sort({ _id: -1 }).toArray())[0];
  let id = generateNextId(lastId?.marketId ?? 'aaaa', 4);
  marketCollection.find({ marketId: { $exists: false } }).toArray((err, res) => {
    if (res.length === 0) { return; }
    const toUpdate: any[] = [];
    res.forEach((element) => {
      toUpdate.push({
        updateOne: {
          filter: {
            _id: new ObjectID(element._id),
          },
          update: {
            $set: {
              marketId: id,
            },
          },
        },
      });
      id = generateNextId(id, 4);
    });
    marketCollection.bulkWrite(toUpdate);
  });
}

// New

export async function getPokemonByNumber(discordId: string, number: number, sort: string) {
  try {
    const variables = {
      owner: discordId,
      number,
      sort,
    };
    const request = await graphqlClient.request(GET_POKEMON_BY_NUMBER, variables);
    return request.pokemon;
  } catch (e) {
    throw e;
  }
}

export async function getPokemons(discordId: string, sort: string): Promise<Pokemon[]> {
  try {
    const variables = {
      owner: discordId,
      sort: sort,
    };
    const request = await graphqlClient.request(GET_ALL_POKEMONS, variables);
    return request.pokemons;
  } catch (e) {
    throw e;
  }
}

export async function getPlayer(discordId: string) {
  try {
    const variables = {
      discord_id: discordId,
    };
    const request = await graphqlClient.request(GET_PLAYER, variables);
    return request.player;
  } catch (e) {
    throw e;
  }
}

export async function getInventory(discordId: string) {
  try {
    const variables = {
      discord_id: discordId,
    };
    const request = await graphqlClient.request(GET_INVENTORY, variables);
    return request.inventory;
  } catch (e) {
    throw e;
  }
}

export async function getQuests(discordId: string) {
  try {
    const variables = {
      discord_id: discordId,
    };
    const request = await graphqlClient.request(GET_PLAYER_QUESTS, variables);
    return request.player?.quests;
  } catch (e) {
    throw e;
  }
}

export async function getPokemonByObjectID(id: string) {
  try {
    const variables = {
      id,
    };
    const request = await graphqlClient.request(GET_POKEMON_BY_ID, variables);
    return request.pokemon;
  } catch (e) {
    throw e;
  }
}

export async function getTeams(discordId: string) {
  try {
    const variables = {
      discord_id: discordId,
    };
    const request = await graphqlClient.request(GET_PLAYER_TEAMS, variables);
    return request.teams;
  } catch (e) {
    throw e;
  }
}

export async function createTeam(discordId: string, name: string) {
  try {
    const variables = {
      discord_id: discordId,
      name
    };
    const request = await graphqlClient.request(CREATE_TEAM, variables);
    return request.createTeam;
  } catch (e) {
    throw e;
  }
}

export async function updateTeam(teamId: string, data: any) {
  try {
    const variables = {
      team_id: teamId,
      data,
    };
    const request = await graphqlClient.request(UPDATE_TEAM, variables);
    return request.updateTeam;
  } catch (e) {
    throw e;
  }
}

export async function deleteTeam(teamId: string) {
  try {
    const variables = {
      team_id: teamId,
    };
    const request = await graphqlClient.request(DELETE_TEAM, variables);
    return request.deleteTeam;
  } catch (e) {
    throw e;
  }
}

export async function getTeamByName(discordId: string, name: string) {
  try {
    const variables = {
      discord_id: discordId,
      name
    };
    const request = await graphqlClient.request(GET_TEAM_BY_NAME, variables);
    return request.team;
  } catch (e) {
    throw e;
  }
}

export async function setSelectedTeam(discordId: string, teamId: string) {
  try {
    const variables = {
      discord_id: discordId,
      teamId
    };
    const request = await graphqlClient.request(SET_PLAYER_SELECTED_TEAM, variables);
    return request.team;
  } catch (e) {
    throw e;
  }
}

export async function addToTeam(team: string, pokemonId: string, slot: number) {
  try {
    const variables = {
      team,
      pokemon: pokemonId,
      slot
    };
    const request = await graphqlClient.request(ADD_TO_TEAM, variables);
    return request.addToTeam;
  } catch (e) {
    throw e;
  }
}

export async function removeFromTeam(team: string, slot: number) {
  try {
    const variables = {
      team,
      slot
    };
    const request = await graphqlClient.request(REMOVE_FROM_TEAM, variables);
    return request.removeFromTeam;
  } catch (e) {
    throw e;
  }
}

export async function getMarket(filter: any, sort: string = '_ID_DESC') {
  try {
    const variables = {
      filter,
      sort,
    };
    const request = await graphqlClient.request(GET_MARKET, variables);
    return request.marketAll;
  } catch (e) {
    throw e;
  }
}

export function addToInventory(discordId: string, item: number, quantity: number) {
  const inventoryCollection = db.collection('inventory');

  let inventory: any = {};
  inventory[`inventory.${item}.quantity`] = quantity;

  return inventoryCollection.updateOne({
    discord_id: discordId
  }, {
    $inc: inventory
  }, {
    upsert: true
  }).then((res) => {
    return res;
  }).catch((error) => {
    throw error;
  });
  /* try {
    const variables = {
      discord_id: discordId,
      item,
      quantity
    };
    const request = await graphqlClient.request(ADD_TO_INVENTORY, variables);
    return request.addItem;
  } catch (e) {
    throw e;
  } */
}

export async function addCoins(discordId: string, coins: number, source: string) {
  if (coins > 20000000) {
    console.log(`Add ${coins} from ${source}`);
  }
  if (coins > 1000000000) {
    coins = 0;
    console.log(`Prevented ${discordId} Add ${coins} from ${source}`);
  }
  if (isNaN(coins)) { coins = 0; }

  try {
    const variables = {
      discord_id: discordId,
      quantity: coins,
    };
    const request = await graphqlClient.request(ADD_COINS, variables);
    return request.ok;
  } catch (e) {
    throw e;
  }
}

export async function addCurrency(discordId: string, amount: number) {
  if (isNaN(amount)) { amount = 0; }

  try {
    const variables = {
      discord_id: discordId,
      quantity: amount,
    };
    const request = await graphqlClient.request(ADD_CURRENCY, variables);
    return request.ok;
  } catch (e) {
    throw e;
  }
}

export async function holdItem(pokemonId: string, item: any) {
  updatePokemon(pokemonId, { item: item });
}

export async function createPokemon(discordId: string, pokemonId: number, level: number, shiny: boolean, moves: any, ivs: any, rarity: number, isRaid: boolean = false, special: any, forme: any, abilitySlot: string, nature: string, gender: string, locked: boolean = false) {
  try {
    const variables = {
      pokemon: {
        owner: discordId,
        firstOwner: discordId,
        name: getPokemonDex(pokemonId).displayName,
        dexId: pokemonId,
        level: level,
        shiny: shiny,
        moves: moves,
        experience: calculateLevelExperience(level),
        ivs: ivs,
        rarity: rarity,
        fav: (isRaid || shiny) ? true : false,
        special: special ?? null,
        forme,
        nature,
        abilitySlot,
        gender,
        locked
      },
    };
    const request = await graphqlClient.request(CREATE_POKEMON, variables);
    return request.createPokemon;
  } catch (e) {
    throw e;
  }
}

export async function updatePokemon(pokemonId: string, data: any) {
  let pokemon = { ...data };
  delete pokemon._id;
  try {
    const variables = {
      pokemon,
      filter: { _id: new ObjectID(pokemonId) },
    };
    const request = await graphqlClient.request(UPDATE_POKEMON, variables);
    return request.updatePokemon;
  } catch (e) {
    throw e;
  }
}

export async function updatePokemonsByIds(pokemonIds: string[], data: any) {
  try {
    const variables = {
      data,
      filters: { _operators: { _id: { in: pokemonIds } } },
    };
    const request = await graphqlClient.request(UPDATE_POKEMONS, variables);
    return request.updatePokemons;
  } catch (e) {
    throw e;
  }
}

export async function updatePokemons(filters: any, data: any) {
  try {
    const variables = {
      data,
      filters,
    };
    const request = await graphqlClient.request(UPDATE_POKEMONS, variables);
    return request.updatePokemons;
  } catch (e) {
    throw e;
  }
}

export async function favPokemons(idsToFav: string[]) {
  return updatePokemonsByIds(idsToFav, { fav: true });
}

export async function unfavPokemons(idsToUnfav: string[]) {
  return updatePokemonsByIds(idsToUnfav, { fav: false });
}

export async function deleteNickname(pokemonId: string) {
  return updatePokemon(pokemonId, { nickname: null });
}

export async function addPokemon(pokemon: any) {
  delete pokemon._id;
  try {
    const variables = {
      pokemon,
    };
    const request = await graphqlClient.request(CREATE_POKEMON, variables);
    return request.recordId;
  } catch (e) {
    throw e;
  }
}

export async function addToMarket(discordId: string, pokemon: any, price: number) {
  try {
    const variables = {
      seller: discordId,
      pokemon,
      price
    };
    const request = await graphqlClient.request(ADD_TO_MARKET, variables);
    return request.recordId;
  } catch (e) {
    throw e;
  }
}

export async function deletePokemon(id: string) {
  try {
    const variables = {
      id,
    };
    const request = await graphqlClient.request(DELETE_POKEMON, variables);
    return request.deletePokemon;
  } catch (e) {
    throw e;
  }
}

export async function deletePokemons(ids: string[]) {
  const pokemonCollection = db.collection('pokemons');

  let objectIds = ids.map((element) => {
    return new ObjectID(element);
  });

  return pokemonCollection.deleteMany({
    _id: { $in: objectIds }
  });
  /* try {
    const variables = {
      ids,
    };
    const request = await graphqlClient.request(DELETE_POKEMONS, variables);
    return request.deletePokemons;
  } catch (e) {
    throw e;
  } */
}

export async function deleteFromMarket(id: string) {
  try {
    const variables = {
      id,
    };
    const request = await graphqlClient.request(DELETE_OFFER, variables);
    return request.deleteMarket;
  } catch (e) {
    throw e;
  }
}

export async function deleteMutilpleFromMarket(ids: string[]) {
  try {
    const variables = {
      ids,
    };
    const request = await graphqlClient.request(DELETE_OFFERS, variables);
    return request.deleteMarkets;
  } catch (e) {
    throw e;
  }
}

export async function createPlayer(discordId: string, username: string) {
  try {
    const variables = {
      player: {
        discord_id: discordId,
        username,
        location: 0,
        money: {
          coins: 3000,
          gems: 0,
          tickets: 0,
        },
        started_at: new Date(),
      },
    };
    const request = await graphqlClient.request(CREATE_PLAYER, variables);
    return request.createPlayer;
  } catch (e) {
    throw e;
  }
}

export async function updatePlayer(discordId: string, data: any) {
  try {
    const variables = {
      player: data,
      discord_id: discordId,
    };
    const request = await graphqlClient.request(UPDATE_PLAYER, variables);
    return request.createPlayer;
  } catch (e) {
    throw e;
  }
}

export async function addLootbox(discordId: string, item: number, quantity: number) {
  item = Math.min(3, item);
  try {
    const variables = {
      discord_id: discordId,
      item,
      quantity
    };
    const request = await graphqlClient.request(ADD_LOOTBOX, variables);
    return request.addLootbox;
  } catch (e) {
    throw e;
  }
}

export async function createGuild(guildId: string) {
  try {
    const variables = {
      guild_id: guildId,
    };
    const request = await graphqlClient.request(CREATE_GUILD, variables);
    return request.createGuild;
  } catch (e) {
    throw e;
  }
}

export async function updateGuild(guildId: string, guild: any) {
  try {
    const variables = {
      guild_id: guildId,
      data: guild,
    };
    const request = await graphqlClient.request(UPDATE_GUILD, variables);
    return request.updateGuild;
  } catch (e) {
    throw e;
  }
}

export async function updateGym(discordId: string, data: any) {
  try {
    const variables = {
      discord_id: discordId,
      data,
    };
    const request = await graphqlClient.request(UPDATE_GYM, variables);
    return request.updateGuild;
  } catch (e) {
    throw e;
  }
}

export async function createGym(data: any) {
  try {
    const variables = {
      data,
    };
    const request = await graphqlClient.request(CREATE_GYM, variables);
    return request.updateGuild;
  } catch (e) {
    throw e;
  }
}

export async function updateQuest(questId: any, quest: any) {
  delete quest._id;
  try {
    const variables = {
      questId,
      quest,
    };
    const request = await graphqlClient.request(UPDATE_QUEST, variables);
    return request.updateQuest;
  } catch (e) {
    throw e;
  }
}

export async function removeQuest(questId: ObjectID) {
  try {
    const variables = {
      questId,
    };
    const request = await graphqlClient.request(DELETE_QUEST, variables);
    return request.deleteQuest;
  } catch (e) {
    throw e;
  }
}

export async function addQuest(discordId: string, quest: any) {
  quest.discord_id = discordId;
  try {
    const variables = {
      quest,
    };
    const request = await graphqlClient.request(CREATE_QUEST, variables);
    return request.createQuest;
  } catch (e) {
    throw e;
  }
}

export async function addQuests(discordId: string, quests: any[]) {
  await quests.forEach(async (element) => {
    await addQuest(discordId, element);
  });
}

export async function deleteEventQuests() {
  try {
    const variables = {
      filter: {
        event: true,
      },
    };
    const request = await graphqlClient.request(DELETE_QUESTS, variables);
    return request.deleteQuests;
  } catch (e) {
    throw e;
  }
}

export async function resetGym(discordId: string) {
  try {
    const variables = {
      discord_id: discordId,
    };
    const request = await graphqlClient.request(DELETE_GYM, variables);
    return request.deleteGym;
  } catch (e) {
    throw e;
  }
}

export async function getGym(discordId: string) {
  try {
    const variables = {
      discord_id: discordId,
    };
    const request = await graphqlClient.request(GET_GYM, variables);
    return request.gym;
  } catch (e) {
    throw e;
  }
}

export async function getGuild(guildId: string) {
  try {
    const variables = {
      guild_id: guildId,
    };
    const request = await graphqlClient.request(GET_GUILD, variables);
    return request.guild;
  } catch (e) {
    throw e;
  }
}

export async function getGuildData(guildId: string) {
  return getGuild(guildId).then((res) => {
    if (res === null) {
      return createGuild(guildId).then((guild) => {
        return guild.record;
      });
    }
    return res;
  });
}

export async function getPokedex(discordId: string) {
  try {
    const variables = {
      discord_id: discordId,
    };
    const request = await graphqlClient.request(GET_POKEDEX, variables);
    return request.pokedex;
  } catch (e) {
    throw e;
  }
}

export async function countUsers() {
  try {
    const request = await graphqlClient.request(COUNT_PLAYERS);
    return request.playerPagination.count;
  } catch (e) {
    throw e;
  }
}

export async function createMarketLog(data: any) {
  try {
    const variables = {
      data
    };
    const request = await graphqlClient.request(CREATE_MARKET_LOG, variables);
    return request.pokedex;
  } catch (e) {
    throw e;
  }
}

export async function createMoneyLog(giver: string, receiver: string, amount: number) {
  try {
    const variables = {
      data: {
        giver,
        receiver,
        amount
      }
    };
    const request = await graphqlClient.request(CREATE_MONEY_LOG, variables);
    return request.pokedex;
  } catch (e) {
    throw e;
  }
}

export async function getStats(discordId: string) {
  try {
    const variables = {
      discord_id: discordId,
    };
    const request = await graphqlClient.request(GET_STATS, variables);
    return request.stats;
  } catch (e) {
    throw e;
  }
}

export async function addStats(discordId: string, stat: string, amount: number) {
  try {
    const variables = {
      discord_id: discordId,
      stat,
      amount,
    };
    const request = await graphqlClient.request(ADD_STAT, variables);
    return request.pokedex;
  } catch (e) {
    throw e;
  }
}

export async function updatePokedex(discordId: string, data: any) {
  try {
    const variables = {
      discord_id: discordId,
      data,
    };
    const request = await graphqlClient.request(UPDATE_POKEDEX, variables);
    return request.updatePokedex;
  } catch (e) {
    throw e;
  }
}

export async function createPokedex(discordId: string) {
  try {
    const variables = {
      discord_id: discordId,
    };
    const request = await graphqlClient.request(CREATE_POKEDEX, variables);
    return request.createPokedex;
  } catch (e) {
    throw e;
  }
}

export async function addBattlePoints(discordId: string, battlePoints: number) {
  if (isNaN(battlePoints)) { battlePoints = 0; }
  try {
    const variables = {
      discord_id: discordId,
      quantity: battlePoints,
    };
    const request = await graphqlClient.request(ADD_BATTLE_POINTS, variables);
    return request.ok;
  } catch (e) {
    throw e;
  }
}

export async function getPokemonByNickname(discordId: string, nickname: string) {
  try {
    const variables = {
      owner: discordId,
      nickname,
    };
    const request = await graphqlClient.request(GET_POKEMON_BY_NICKNAME, variables);
    return request.pokemonByNickname;
  } catch (e) {
    throw e;
  }
}

export async function dealDamagesRaid(raidId: string, discordId: string, damage: number, pokemonData: any) {
  if (isNaN(damage)) {
    damage = 0;
  }
  try {
    const variables = {
      raid_id: raidId,
      discord_id: discordId,
      damage,
      pokemonData,
    };
    const request = await graphqlClient.request(DEAL_RAID_DAMAGE, variables);
    return request.ok;
  } catch (e) {
    throw e;
  }
}

export async function dealDamagesMegaRaid(raidId: string, discordId: string, damage: number, pokemonData: any) {
  if (isNaN(damage)) {
    damage = 0;
  }
  try {
    const variables = {
      raid_id: raidId,
      discord_id: discordId,
      damage,
      pokemonData,
    };
    const request = await graphqlClient.request(DEAL_MEGA_RAID_DAMAGE, variables);
    return request.ok;
  } catch (e) {
    throw e;
  }
}

export async function startTimerRaid() {
  try {
    const request = await graphqlClient.request(START_RAID_TIMER);
    return request.ok;
  } catch (e) {
    throw e;
  }
}

export async function startTimerMegaRaid() {
  try {
    const request = await graphqlClient.request(START_MEGA_RAID_TIMER);
    return request.ok;
  } catch (e) {
    throw e;
  }
}

export async function deleteRaid(id: string) {
  try {
    const variables = {
      raid_id: id,
    };
    const request = await graphqlClient.request(DELETE_RAID, variables);
    return request.ok;
  } catch (e) {
    throw e;
  }
}

export async function deleteMegaRaid(id: string) {
  try {
    const variables = {
      raid_id: id,
    };
    const request = await graphqlClient.request(DELETE_MEGA_RAID, variables);
    return request.ok;
  } catch (e) {
    throw e;
  }
}

export async function getMegaRaid() {
  try {
    const variables = {
      filter: { _operators: { time: { exists: true } } },
    };
    const request = await graphqlClient.request(GET_MEGA_RAID, variables);
    return request.megaRaid;
  } catch (e) {
    throw e;
  }
}

export async function getRaid() {
  try {
    const variables = {
      filter: { _operators: { time: { exists: true } } },
    };
    const request = await graphqlClient.request(GET_RAID, variables);
    return request.raid;
  } catch (e) {
    throw e;
  }
}

export async function createRaid(pokemon: any) {
  try {
    const variables = {
      pokemon,
      hp: 999999999,
      maxHp: 999999999,
    };
    const request = await graphqlClient.request(CREATE_RAID, variables);
    return request.ok;
  } catch (e) {
    throw e;
  }
}

export async function createMegaRaid(pokemon: any) {
  try {
    const variables = {
      pokemon,
      hp: 2500000 + (pokemon.rarityLevel * 1250000),
      maxHp: 2500000 + (pokemon.rarityLevel * 1250000),
    };
    const request = await graphqlClient.request(CREATE_MEGA_RAID, variables);
    return request.ok;
  } catch (e) {
    throw e;
  }
}

export async function clearRaidLogs() {
  try {
    const request = await graphqlClient.request(CLEAR_RAID_LOG);
    return request.ok;
  } catch (e) {
    throw e;
  }
}

export async function clearMegaRaidLogs() {
  try {
    const request = await graphqlClient.request(CLEAR_MEGA_RAID_LOG);
    return request.ok;
  } catch (e) {
    throw e;
  }
}

export async function getRaidLogs() {
  try {
    const request = await graphqlClient.request(GET_RAID_LOGS);
    return request.raidLogs;
  } catch (e) {
    throw e;
  }
}

export async function getMegaRaidLogs() {
  try {
    const request = await graphqlClient.request(GET_MEGA_RAID_LOGS);
    return request.megaRaidLogs;
  } catch (e) {
    throw e;
  }
}

export async function getMegaRaidLog(discordId: string) {
  try {
    const variables = {
      discord_id: discordId,
    };
    const request = await graphqlClient.request(GET_MEGA_RAID_LOG, variables);
    return request.megaRaidLog;
  } catch (e) {
    throw e;
  }
}

export async function getPatrons() {
  try {
    const request = await graphqlClient.request(GET_PATRONS);
    return request.players;
  } catch (e) {
    throw e;
  }
}

export async function createTradeLog(data: any) {
  try {
    const variables = {
      data,
      date: new Date(),
    };
    const request = await graphqlClient.request(CREATE_TRADE_LOG, variables);
    return request.createTradeLog;
  } catch (e) {
    throw e;
  }
}

export async function getClanOfUser(discordId: string) {
  try {
    const variables = {
      discord_id: discordId,
    };
    const request = await graphqlClient.request(GET_PLAYER_CLAN, variables);
    return request.player.clan;
  } catch (e) {
    throw e;
  }
}

export async function getBestClans() {
  try {
    const request = await graphqlClient.request(GET_TEN_BEST_CLANS);
    return request.clans;
  } catch (e) {
    throw e;
  }
}

export async function joinClan(clan: string, discordId: string) {
  updatePlayer(discordId, { clan: clan });
}

export async function createClan(owner: string, name: string) {
  try {
    const variables = {
      owner,
      name
    };
    const request = await graphqlClient.request(CREATE_CLAN, variables);
    return request.createClan;
  } catch (e) {
    throw e;
  }
}

export async function deleteClan(clanId: string) {
  try {
    const variables = {
      id: clanId,
    };
    const request = await graphqlClient.request(DELETE_CLAN, variables);
    return request.deleteClan;
  } catch (e) {
    throw e;
  }
}

export async function updateClan(clanId: string, data: any) {
  try {
    const variables = {
      id: clanId,
      data,
    };
    const request = await graphqlClient.request(UPDATE_CLAN, variables);
    return request.deleteClan;
  } catch (e) {
    throw e;
  }
}

export async function addCoinsToClan(clan: string, discord_id: string, amount: number) {
  try {
    const variables = {
      clan_id: clan,
      quantity: amount,
    };
    graphqlClient.request(ADD_COINS_TO_CLAN_HISTORY, {
      discord_id,
      quantity: amount,
    });
    const request = await graphqlClient.request(ADD_COINS_TO_CLAN, variables);
    return request.addCoinsToClan;
  } catch (e) {
    throw e;
  }
}

export async function addExperienceToClan(clan: string, discord_id: string, amount: number) {
  try {
    const variables = {
      clan_id: clan,
      quantity: amount,
    };
    graphqlClient.request(ADD_EXPERIENCE_TO_CLAN_HISTORY, {
      discord_id,
      quantity: amount,
    });
    const request = await graphqlClient.request(ADD_EXPERIENCE_TO_CLAN, variables);
    return request.addExperienceToClan;
  } catch (e) {
    throw e;
  }
}

export async function createClanHistory(clan: string, discord_id: string) {
  try {
    const variables = {
      clan: clan,
      discord_id: discord_id,
    };
    const request = await graphqlClient.request(CREATE_CLAN_HISTORY, variables);
    return request.createClanHistory;
  } catch (e) {
    throw e;
  }
}

export async function deleteClanHistory(clan: string, discord_id: string) {
  try {
    const variables = {
      clan: clan,
      discord_id: discord_id,
    };
    const request = await graphqlClient.request(DELETE_CLAN_HISTORY, variables);
    return request.deleteClanHistory;
  } catch (e) {
    throw e;
  }
}

export async function deleteClanHistories(clan: string) {
  try {
    const variables = {
      clan: clan,
    };
    const request = await graphqlClient.request(DELETE_CLAN_HISTORIES, variables);
    return request.deleteClanHistorie;
  } catch (e) {
    throw e;
  }
}

export async function updateClanHistory(clan: string, discord_id: string, data: any) {
  try {
    const variables = {
      clan,
      discord_id,
      data,
    };
    const request = await graphqlClient.request(UPDATE_CLAN_HISTORY, variables);
    return request.updateClanHistory;
  } catch (e) {
    throw e;
  }
}

export async function getClanHistory(clan: string, discord_id: string) {
  try {
    const variables = {
      clan_id: clan,
      discord_id: discord_id,
    };
    const request = await graphqlClient.request(GET_CLAN_HISTORY, variables);
    return request.clanHistory;
  } catch (e) {
    throw e;
  }
}

export async function createClanRaid(raid: any) {
  try {
    const variables = {
      data: raid,
    };
    const request = await graphqlClient.request(CREATE_CLAN_RAID, variables);
    return request.createClanRaid;
  } catch (e) {
    throw e;
  }
}

export async function getClanRaid(clan: string) {
  try {
    const variables = {
      clan,
    };
    const request = await graphqlClient.request(GET_CLAN_RAID, variables);
    return request.clanRaid;
  } catch (e) {
    throw e;
  }
}

export async function dealClanRaidDamage(discordId: string, raid: string, damage: number, pokemonData: any) {
  try {
    const variables = {
      raid,
      damage,
      discord_id: discordId,
      pokemonData,
    };
    const request = await graphqlClient.request(DEAL_CLAN_RAID_DAMAGE, variables);
    return request.dealClanRaidDamage;
  } catch (e) {
    throw e;
  }
}

export async function getClanRaidLogs(raid: string) {
  try {
    const variables = {
      raid,
    };
    const request = await graphqlClient.request(GET_CLAN_RAID_LOGS, variables);
    return request.clanRaidLogs;
  } catch (e) {
    throw e;
  }
}

export async function getClanRaidLog(raid: string, discordId: string) {
  try {
    const variables = {
      raid,
      discord_id: discordId,
    };
    const request = await graphqlClient.request(GET_CLAN_RAID_LOG, variables);
    return request.clanRaidLog;
  } catch (e) {
    throw e;
  }
}

export async function generateBingo(discordId: string) {
  try {
    const variables = {
      discord_id: discordId,
    };
    const request = await graphqlClient.request(GENERATE_BINGO, variables);
    return request.generateBingo;
  } catch (e) {
    throw e;
  }
}

export async function getBingo(discordId: string) {
  try {
    const variables = {
      discord_id: discordId,
    };
    const request = await graphqlClient.request(GET_BINGO, variables);
    return request.bingo;
  } catch (e) {
    throw e;
  }
}

export async function updateBingo(discordId: string, data: any) {
  try {
    const variables = {
      discord_id: discordId,
      data
    };
    const request = await graphqlClient.request(UPDATE_BINGO, variables);
    return request.bingo;
  } catch (e) {
    throw e;
  }
}

export async function addFriendship(pokemon: string, amount: number) {
  try {
    const variables = {
      pokemon,
      amount
    };
    const request = await graphqlClient.request(ADD_FRIENDSHIP, variables);
    return request.ok;
  } catch (e) {
    throw e;
  }
}



export async function addPokemonToClanGym(discordId: string, clan: string, pokemon: any) {
  try {
    const variables = {
      discord_id: discordId,
      clan,
      pokemon,
    };
    const request = await graphqlClient.request(ADD_POKEMON_TO_CLAN_GYM, variables);
    return request.addPokemonToGym;
  } catch (e) {
    throw e;
  }
}

export async function removePokemonFromClanGym(discordId: string, clan: string) {
  try {
    const variables = {
      discord_id: discordId,
      clan,
    };
    const request = await graphqlClient.request(REMOVE_POKEMON_FROM_CLAN_GYM, variables);
    return request.removePokemonFromClanGym;
  } catch (e) {
    throw e;
  }
}

export async function getClanGym(clan: string) {
  try {
    const variables = {
      clan,
    };
    const request = await graphqlClient.request(GET_CLAN_GYM, variables);
    return request.clanGym;
  } catch (e) {
    throw e;
  }
}

export async function getRandomGymToFight(clan: string) {
  try {
    const variables = {
      clan,
    };
    const request = await graphqlClient.request(GET_RANDOM_GYM_TO_FIGHT, variables);
    return request.getRandomGymToFight;
  } catch (e) {
    throw e;
  }
}

export async function getClan(clan: string) {
  try {
    const variables = {
      clan,
    };
    const request = await graphqlClient.request(GET_CLAN, variables);
    return request.clan;
  } catch (e) {
    throw e;
  }
}

export async function dealClanGymDamage(clan: string, pokemon: string, amount: number) {
  try {
    const variables = {
      clan,
      pokemon,
      damage: Math.max(amount, 0),
    };
    const request = await graphqlClient.request(DEAL_CLAN_GYM_DAMAGE, variables);
    return request.dealClanGymDamage;
  } catch (e) {
    throw e;
  }
}

export async function createWondertrade(discordId: string, pokemon: object) {
  try {
    const variables = {
      discord_id: discordId,
      pokemon,
    };
    const request = await graphqlClient.request(CREATE_WONDERTRADE, variables);
    return request.createWondertrade;
  } catch (e) {
    throw e;
  }
}

export async function getWondertrade(discordId: string) {
  try {
    const variables = {
      discord_id: discordId,
    };
    const request = await graphqlClient.request(GET_WONDERTRADE, variables);
    return request.wondertrade;
  } catch (e) {
    throw e;
  }
}

export async function getWondertrades() {
  try {
    const variables = {
    };
    const request = await graphqlClient.request(GET_WONDERTRADES, variables);
    return request.wondertrades;
  } catch (e) {
    throw e;
  }
}

export async function deleteWondertrade(id: string) {
  try {
    const variables = {
      id,
    };
    const request = await graphqlClient.request(DELETE_WONDERTRADE, variables);
    return request.deleteWondertrade;
  } catch (e) {
    throw e;
  }
}

export async function useDojoStamina(discordId: string) {
  try {
    const variables = {
      discord_id: discordId,
    };
    const request = await graphqlClient.request(USE_GYM_STAMINA, variables);
    return request.useGymStamina;
  } catch (e) {
    throw e;
  }
}

export async function addDojoPoints(discordId: string, amount: number) {
  try {
    const variables = {
      discord_id: discordId,
      amount,
    };
    const request = await graphqlClient.request(ADD_DOJO_POINTS, variables);
    return request.useGymStamina;
  } catch (e) {
    throw e;
  }
}

export async function updateRanking() {
  try {
    const request = await graphqlClient.request(UPDATE_RANKING);
    return request.updateRanking;
  } catch (e) {
    throw e;
  }
}

export async function getClans() {
  try {
    const request = await graphqlClient.request(GET_CLANS);
    return request.clans;
  } catch (e) {
    throw e;
  }
}

export async function resetDojo() {
  try {
    const request = await graphqlClient.request(RESET_DOJO);
    return request.ok;
  } catch (e) {
    throw e;
  }
}

export async function resetStamina() {
  try {
    const request = await graphqlClient.request(RESET_STAMINA);
    return request.ok;
  } catch (e) {
    throw e;
  }
}

export async function updateResearch(discordId: string, data: any) {
  try {
    const variables = {
      discord_id: discordId,
      data,
    };
    const request = await graphqlClient.request(UPDATE_RESEARCH, variables);
    return request.recordId;
  } catch (e) {
    throw e;
  }
}

export async function createResearch(discordId: string, data: any) {
  try {
    const variables = {
      discord_id: discordId,
      data,
    };
    const request = await graphqlClient.request(CREATE_RESEARCH, variables);
    return request.recordId;
  } catch (e) {
    throw e;
  }
}

export {
  // Setter
  connect,

  giveMarketId,

  // Pokemon
  createPokemons, giveExperience, giveLevel, evolvePokemon, addExperience,

  countPokemons,
};
