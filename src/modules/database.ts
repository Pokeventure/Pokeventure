import { Db } from 'mongodb';
import { Player } from '../models/player';
import Logger from './logger';
import { IQuest } from '../types/game';
import { Quest } from '../models/quest';
import { Pokemon } from '../models/pokemon';
import { IPokemon, PokemonSpecies } from '../types/pokemon';
import { ButtonContext, CommandContext, Context } from '../types/command';
import { calculateLevelExperience, getImage, sendEmbed } from './utils';
import { getAbilities, getPokemon } from './pokedex';
import { Chance } from 'chance';
import { User } from 'discord.js';
import { Moves } from '../../simulator/.data-dist/moves';
import { Inventory } from '../models/inventory';
import { Log } from '../models/log';
import { Stats } from '../models/stats';
import { Pokedex } from '../models/pokedex';
import { Research } from '../models/research';

let db: Db;

export function connect(database: Db) {
    db = database;
}

export async function createPlayer(userId: string) {
    const player = new Player({
        discord_id: userId,
        location: 0,
        money: {
            coins: 3000,
            gems: 0,
            tickets: 0,
        },
        started_at: new Date(),
    });
    await player.save();
    return player;
}

export function addQuest(quest: IQuest) {
    const newQuest = new Quest(quest);
    return newQuest.save().catch((error) => {
        Logger.error(error);
    });
}

export async function createPokemon(userId: string, pokemon: IPokemon) {
    const newPokemon = new Pokemon({
        ...pokemon,
        owner: userId,
        firstOwner: userId
    });
    await newPokemon.save();
    return newPokemon;
    /* try {
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
    } */
}



export function updatePlayer(discordId: string, data: any) {
    throw new Error('Not implemented');

    /* try {
      const variables = {
        player: data,
        discord_id: discordId,
      };
      const request = await graphqlClient.request(UPDATE_PLAYER, variables);
      return request.createPlayer;
    } catch (e) {
      throw e;
    } */
}

export async function giveLevel(pokemon: Pokemon, context: CommandContext, amount: number = 1) {
    const pokemonData = getPokemon(pokemon.dexId, pokemon.special);
    if (pokemon.level >= 100 && pokemonData.evolutions.length === 0) {
        return null;
    }

    if (pokemon.level < 100) {
        pokemon.experience = calculateLevelExperience(pokemon.level + amount);
        pokemon.level += amount;
    }
    checkPokemonEvolution(pokemonData, pokemon, context);

    if (pokemon.level >= 100) {
        pokemon.level = 100;
        pokemon.experience = calculateLevelExperience(100);
    }

    pokemon.save();
    await sendEmbed(context, { description: `${pokemon.nickname !== null ? pokemon.nickname : pokemonData.displayName} leveled up to ${Math.min(pokemon.level, 100)}!` });
}

async function checkPokemonEvolution(pokemonData: PokemonSpecies, pokemon: Pokemon, context: Context) {
    if (pokemonData.evolutions.length > 0) {
        for (let i = 0; i < pokemonData.evolutions.length; i++) {
            if (pokemonData.evolutions[i].level > 0 && pokemon.level >= pokemonData.evolutions[i].level) {
                if (pokemonData.evolutions[i].genderCondition !== undefined) {
                    if (pokemonData.evolutions[i].genderCondition !== pokemon.gender) {
                        continue;
                    }
                }
                if (pokemonData.evolutions[i].zone !== undefined && pokemonData.evolutions[i].zone.indexOf(context.player?.location) !== -1) {
                    evolvePokemon(context, pokemon, pokemonData.evolutions[i].id, context.user, pokemonData.evolutions[i].special);
                } else if (pokemonData.evolutions[i].condition === 'levelRandom') {
                    evolvePokemon(context, pokemon, <any>context.client.chance.pickset(pokemonData.evolutions[i].randomId)[0], context.user);
                } else if (pokemonData.evolutions[i].condition === 'levelForm') {
                    evolvePokemon(context, pokemon, pokemonData.evolutions[i].id, context.user, null, <any>context.client.chance.pickset(pokemonData.evolutions[i].randomForm)[0]);
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
}

export function addQuests(userId: string, quests: IQuest[]) {
    quests.forEach(quest => {
        let newQuest = new Quest(quest);
        newQuest.discord_id = userId;
        newQuest.save();
    });
}

export async function addExperience(pokemon: Pokemon, experience: number, context: Context) {
    if (pokemon.level >= 100) {
        return null;
    }
    pokemon.experience += experience;
    if (pokemon.experience >= calculateLevelExperience(pokemon.level + 1)) {
        do {
            const pokemonData = getPokemon(pokemon.dexId, pokemon.special);
            pokemon.level++;
            checkPokemonEvolution(pokemonData, pokemon, context);
        } while (pokemon.experience >= calculateLevelExperience(pokemon.level + 1));
        const pokemonData = getPokemon(pokemon.dexId, pokemon.special);

        await sendEmbed(context, { description: `${pokemon.nickname !== undefined && pokemon.nickname !== null ? pokemon.nickname : pokemonData.displayName} leveled up to ${pokemon.level}!` });
    }
    if (pokemon.level === 100) {
        pokemon.experience = calculateLevelExperience(100);
    }
    pokemon.save();
}

export async function evolvePokemon(context: CommandContext | ButtonContext, pokemon: Pokemon, id: number, author: User, special?: any, forme?: any, ignoreLock?: boolean, sendToDm?: boolean) {
    if (pokemon.evolutionLock && !ignoreLock) {
        return false;
    }
    if (pokemon.forme === 'xmas') {
        return false;
    }
    const oldId = pokemon.dexId;
    // await increaseResearch(context, context.user.id, Research.evolving, oldId, context.player?.research?.data);
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
        /* const embed = new MessageEmbed();
        embed.setDescription(`What? ${getPokemonById(oldId, pokemon.special).displayName} is evolving!\nCongratulations! Your ${oldName} evolved into ${getPokemonById(id, special).displayName}!`)
          .setImage(getImage(pokemon, true, pokemon.shiny, pokemon.special))
          .setAuthor({
            name: author?.username ?? '',
            iconURL: author?.avatarURL,
          });
        await sendDM(context.client, author?.id ?? '', { embeds: [embed] });*/
    } else {
        await sendEmbed(context, { description: `What? ${getPokemon(oldId, special !== undefined ? undefined : pokemon.special).displayName} is evolving!\nCongratulations! Your ${getPokemon(oldId, special !== undefined ? undefined : pokemon.special).displayName} evolved into ${getPokemon(id, special).displayName}!`, image: getImage(pokemon, true, pokemon.shiny, pokemon.special), author });
    }

    if (author !== undefined) {
        /* let u: UserContext = {
          id: author.id,
          username: author.username,
          avatarURL: author.avatarURL,
        };
        incrementQuest(context, u, 'evolve', 1, id); */
        // registerPokemon(author.id, pokemon); 
    }

    /* const pokemonCollection = db.collection('pokemons');
  
    return pokemonCollection.updateOne(
      { _id: new ObjectID(pokemon._id) }, {
      $set: {
        dexId: id, name: pokemon.name, special: pokemon.special, forme: pokemon.forme, abilitySlot: pokemon.abilitySlot,
      },
    },
    );*/
}

export function countPokemons(dexId: number, special: any = undefined, shiny = false, owner: any = undefined) {
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

    return Pokemon.find(search).countDocuments();
}

export function addCoins(userId: string, coins: number, source: string) {
    if (coins > 20000000) {
        Logger.info(`Add ${coins} from ${source}`);
    }
    if (coins > 1000000000) {
        coins = 0;
        Logger.info(`Prevented ${userId} Add ${coins} from ${source}`);
    }
    if (isNaN(coins)) { coins = 0; }

    return Player.updateOne({ discord_id: userId }, { $inc: { "money.coins": coins } }).exec();
}

export function addBattlePoints(player: Player | null, battlePoints: number) {
    if (!player) return;
    if (isNaN(battlePoints)) { battlePoints = 0; }

    player.money.gems += battlePoints;
    return player.save();
}

export function addToInventory(userId: string, item: number | string, quantity: number) {
    let inventory: { [s: string]: number } = {};
    inventory[`inventory.${item}.quantity`] = quantity;

    return Inventory.updateOne({
        discord_id: userId
    }, {
        $inc: inventory
    });
}

export function getPokemonByNumber(player: Player, number: number): Promise<Pokemon | null> {
    if (number < 0) {
        number = 0;
    }
    return Pokemon.findOne({ owner: player.discord_id }, {}, { skip: number, sort: player.sort }).exec();
}


export function createMoneyLog(sender: string, receiver: string, money: number) {
    let log = new Log();
    log.type = "money";
    log.data = {
        sender,
        receiver,
        money
    };
    log.save();
}

export function addStats(userId: string, stat: string, amount: number) {
    const statObject: any = {};
    statObject[`stats.${stat}`] = amount;

    Stats.updateOne({
        discord_id: userId
    }, {
        $inc: statObject
    }, {
        upsert: true
    }).exec();
}

export async function addLootbox(discordId: string, item: number, quantity: number) {
    item = Math.min(3, item);
    const inventory: { [s: string]: number } = {};
    inventory[`lootbox.${item}`] = quantity;

    return Inventory.updateOne({
        discord_id: discordId
    }, {
        $inc: inventory
    });
}

export async function updateResearch(discordId: string, data: any) {
    return Research.updateOne({
        discord_id: discordId
    }, {
        $set: {
            data
        }
    }, {
        upsert: true
    });
}

export async function createResearch(discordId: string, data: any) {
    const research = new Research({
        discord_id: discordId,
        data
    });
    return research.save();
}