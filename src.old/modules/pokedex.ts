import { Pokemon, PokemonSpecies } from 'pokemon';
import { CommandContext } from 'command';
import { Pokedex } from '../../simulator/.data-dist/pokedex';
import { Learnsets } from '../../simulator/.data-dist/learnsets';
import { Moves as MovesImport } from '../../simulator/.data-dist/moves';
import experience from '../../data/experience';
import { getPokemonLocation, move } from './world';
import items from '../../data/items';
import { ItemsText as ItemsTextImport } from '../../simulator/.data-dist/text/items';
import { MovesText as MovesTextImport } from '../../simulator/.data-dist/text/moves';
import { AbilitiesText as AbilitiesImport } from '../../simulator/.data-dist/text/abilities';
import { Natures as NaturesImport } from '../../simulator/.data-dist/natures';
import { createPokedex, getPokedex, updatePokedex } from './database';
import { calculateLevelExperience, getImage } from './utils';
import Logger from './logger';
import { MessageEmbed } from 'discord.js';
import Fuse from 'fuse.js';

const Moves: any = MovesImport;
const ItemsText: any = ItemsTextImport;
const MovesText: any = MovesTextImport;
const Abilities: any = AbilitiesImport;
const Natures: any = NaturesImport;
const pokedexId: PokemonSpecies[] = [];
const pokedexName: { [key: string]: PokemonSpecies } = {};
let pokedexBase: PokemonSpecies[] = [];

const rarity = ['<:n_:744200749600211004>', '<:u_:744200749541621851>', '<:r_:744200749554073660>', '<:sr:744200749189431327>', '<:ur:744200749537558588>', '<:lr:746745321660481576>'];
export const rarityText = ['N', 'U', 'R', 'SR', 'UR', 'LR'];
const typeEmoji: any = {
  Water: '<:Water:768609487333621771>',
  Steel: '<:Steel:768609487450931231>',
  Rock: '<:Rock:768609487279489055>',
  Psychic: '<:Psychic:768609487313043487>',
  Poison: '<:Poison:768609487497461771>',
  Normal: '<:Normal:768609487396929627>',
  Ice: '<:Ice:768609487182889014>',
  Ground: '<:Ground:768609487464300624>',
  Fairy: '<:Fairy:768609487480291348>',
  Fighting: '<:Fighting:768609487493529600>',
  Fire: '<:Fire:768609487031894088>',
  Bug: '<:Bug:768609487468494878>',
  Flying: '<:Flying:768609487392866324>',
  Dark: '<:Dark:768609487464431626>',
  Dragon: '<:Dragon:768609487652651059>',
  Ghost: '<:Ghost:768609487451848734>',
  Grass: '<:Grass:768609487530623026>',
  Electric: '<:Electric:768609487480160276>',
  water: '<:Water:768609487333621771>',
  steel: '<:Steel:768609487450931231>',
  rock: '<:Rock:768609487279489055>',
  psychic: '<:Psychic:768609487313043487>',
  poison: '<:Poison:768609487497461771>',
  normal: '<:Normal:768609487396929627>',
  ice: '<:Ice:768609487182889014>',
  ground: '<:Ground:768609487464300624>',
  fairy: '<:Fairy:768609487480291348>',
  fighting: '<:Fighting:768609487493529600>',
  fire: '<:Fire:768609487031894088>',
  bug: '<:Bug:768609487468494878>',
  flying: '<:Flying:768609487392866324>',
  dark: '<:Dark:768609487464431626>',
  dragon: '<:Dragon:768609487652651059>',
  ghost: '<:Ghost:768609487451848734>',
  grass: '<:Grass:768609487530623026>',
  electric: '<:Electric:768609487480160276>',
  Various: '<:various:828637593817186354>',
  various: '<:various:828637593817186354>',
};
const moveClassEmoji: any = { Special: '<:special:797459780661936148>', Status: '<:status:797459780423647252>', Physical: '<:physical:797459780456939550>' };
const strength: any = {
  Normal: [],
  Fighting: [
    'Normal',
    'Rock',
    'Steel',
    'Ice',
    'Dark',
  ],
  Flying: [
    'Fighting',
    'Bug',
    'Grass',
  ],
  Poison: [
    'Grass',
    'Fairy',
  ],
  Ground: [
    'Poison',
    'Rock',
    'Steel',
    'Fire',
    'Electric',
  ],
  Rock: [
    'Flying',
    'Bug',
    'Fire',
    'Ice',
  ],
  Bug: [
    'Grass',
    'Psychic',
    'Dark',
  ],
  Ghost: [
    'Ghost',
    'Psychic',
  ],
  Steel: [
    'Rock',
    'Ice',
    'Fairy',
  ],
  Fire: [
    'Bug',
    'Steel',
    'Grass',
    'Ice',
  ],
  Water: [
    'Ground',
    'Rock',
    'Fire',
  ],
  Grass: [
    'Ground',
    'Rock',
    'Water',
  ],
  Electric: [
    'Flying',
    'Water',
  ],
  Psychic: [
    'Fighting',
    'Poison',
  ],
  Ice: [
    'Flying',
    'Ground',
    'Grass',
    'Dragon',
  ],
  Dragon: [
    'Dragon',
  ],
  Dark: [
    'Ghost',
    'Psychic',
  ],
  Fairy: [
    'Fighting',
    'Dragon',
    'Dark',
  ],
};
const weakness: any = {
  Normal: [
    'Fighting',
  ],
  Fighting: [
    'Flying',
    'Psychic',
    'Fairy',
  ],
  Flying: [
    'Rock',
    'Electric',
    'Ice',
  ],
  Poison: [
    'Ground',
    'Psychic',
  ],
  Ground: [
    'Water',
    'Grass',
    'Ice',
  ],
  Rock: [
    'Fighting',
    'Ground',
    'Steel',
    'Water',
    'Grass',
  ],
  Bug: [
    'Flying',
    'Rock',
    'Fire',
  ],
  Ghost: [
    'Ghost',
    'Dark',
  ],
  Steel: [
    'Fighting',
    'Ground',
    'Fire',
  ],
  Fire: [
    'Ground',
    'Rock',
    'Water',
  ],
  Water: [
    'Grass',
    'Electric',
  ],
  Grass: [
    'Flying',
    'Poison',
    'Bug',
    'Fire',
    'Ice',
  ],
  Electric: [
    'Ground',
  ],
  Psychic: [
    'Bug',
    'Ghost',
    'Dark',
  ],
  Ice: [
    'Fighting',
    'Rock',
    'Steel',
    'Fire',
  ],
  Dragon: [
    'Ice',
    'Dragon',
    'Fairy',
  ],
  Dark: [
    'Fighting',
    'Bug',
    'Fairy',
  ],
  Fairy: [
    'Poison',
    'Steel',
  ],
};

const resist: any = {
  Normal: [],
  Fighting: ['Rock', 'Bug', 'Dark'],
  Flying: ['Fighting', 'Bug', 'Grass'],
  Poison: ['Fighting', 'Poison', 'Bug', 'Grass', 'Fairy'],
  Ground: ['Poison', 'Rock'],
  Rock: ['Normal', 'Flying', 'Poison', 'Fire'],
  Bug: ['Fighting', 'Ground', 'Grass'],
  Ghost: ['Poison', 'Bug'],
  Steel: ['Normal', 'Flying', 'Bug', 'Steel', 'Grass', 'Psychic', 'Ice', 'Dragon', 'Fairy', 'Rock'],
  Fire: ['Bug', 'Steel', 'Fire', 'Grass', 'Ice', 'Fairy'],
  Water: ['Steel', 'Fire', 'Water', 'Ice'],
  Grass: ['Ground', 'Water', 'Grass', 'Electric'],
  Electric: ['Flying', 'Steel', 'Electric'],
  Psychic: ['Fighting', 'Psychic'],
  Ice: ['Ice'],
  Dragon: ['Fire', 'Water', 'Grass', 'Electric'],
  Dark: ['Ghost', 'Dark'],
  Fairy: ['Fighting', 'Bug', 'Dark'],
};

const immune: any = {
  Normal: ['Ghost'],
  Fighting: [],
  Flying: ['Ground'],
  Poison: [],
  Ground: ['Electric'],
  Rock: [],
  Bug: [],
  Ghost: ['Normal', 'Fighting'],
  Steel: ['Poison'],
  Fire: [],
  Water: [],
  Grass: [],
  Electric: [],
  Psychic: [],
  Ice: [],
  Dragon: [],
  Dark: ['Psychic'],
  Fairy: ['Dragon'],
};

const genderEmoji: any = { M: '♂', F: '♀', N: '' };

function normalizeName(name: string) {
  if (name === undefined) {
    return '';
  }
  name = name.replace(/-/g, '');
  name = name.replace(/ /g, '');
  name = name.replace(/:/g, '');
  name = name.replace(/’/g, '');
  name = name.replace(/\./g, '');
  name = name.replace(/é/g, 'e');
  name = name.replace(/'/g, '');
  name = name.toLowerCase();
  return name;
}

function initializePokedex() {
  Logger.info('Loading pokemons...');
  const experienceCopy: any = experience;
  const pokemons: any = Pokedex;
  for (const [key, value] of Object.entries(Pokedex)) {
    const pokemon: any = value;
    if (pokemon.num <= 0) {
      //continue;
    }
    let evolutions: any[] = [];
    if (pokemon.evos) {
      pokemon.evos.forEach((element: any) => {
        const name = normalizeName(element);
        if (pokemons[name].evoType !== undefined) {
          switch (pokemons[name].evoType) {
            case 'useItem':
              if (name === 'raichualola' || name === 'exeggutoralola' || name === 'marowakalola') {
                evolutions.push({
                  id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'sun stone', special: 'alola',
                });
              } else if (name === 'gallade') {
                evolutions.push({
                  id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'dawn stone', genderCondition: 'M',
                });
              } else if (name === 'froslass') {
                evolutions.push({
                  id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'dawn stone', genderCondition: 'F',
                });
              } else if (name === 'basculegion') {
                evolutions.push({
                  id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'love sweet', genderCondition: 'M',
                });
              } else if (name === 'basculegionf') {
                evolutions.push({
                  id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'love sweet', genderCondition: 'F', special: 'f',
                });
              } else if (pokemons[name].num === 549 && pokemons[name].forme === 'Hisui') {
                evolutions.unshift({
                  id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'star sweet', special: 'hisui',
                });
              } else {
                evolutions.push({
                  id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: pokemons[name].evoItem.toLowerCase(),
                });
              }
              break;
            case 'trade':
              evolutions.push({ id: pokemons[name].num, name: pokemons[name].name, condition: 'trade' });
              break;
            case 'other':
              if (name === 'urshifurapidstrike') {
                evolutions.push({
                  id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'star sweet', special: 'rapidstrike',
                });
              } else {
                evolutions.push({
                  id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'love sweet',
                });
              }
              break;
            case 'levelFriendship':
              if (pokemons[name].num === 197) { // If Umbreon
                evolutions.push({
                  id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'star sweet',
                });
              } else {
                evolutions.push({
                  id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'love sweet',
                });
              }
              break;
            case 'levelMove':
              evolutions.push({
                id: pokemons[name].num, name: pokemons[name].name, condition: 'levelMove', move: normalizeName(pokemons[name].evoMove),
              });
              break;
            case 'levelExtra':
              if (pokemons[name].num === 700) {
                evolutions.push({
                  id: pokemons[name].num, name: pokemons[name].name, condition: 'moveType', type: 'Fairy',
                });
              } else {
                evolutions.push({
                  id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'love sweet',
                });
              }
              break;
            case 'levelHold':
              evolutions.push({
                id: pokemons[name].num, name: pokemons[name].name, condition: 'level', level: 40,
              });
              break;
            case 'levelHold':
              evolutions.push({
                id: pokemons[name].num, name: pokemons[name].name, condition: 'level', level: 40,
              });
              break;
            default:
              break;
          }
        }
        if (pokemons[name].evoLevel > 0) {
          if (pokemons[name].num === 745) {
            if (name === 'lycanroc') {
              evolutions.push({
                id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'dawn stone',
              });
            } else if (name === 'lycanrocdusk') {
              evolutions.push({
                id: pokemons[name].num, name: pokemons[name].name, special: 'dusk', condition: 'useItem', item: 'dusk stone',
              });
            } else if (name === 'lycanrocmidnight') {
              evolutions.push({
                id: pokemons[name].num, name: pokemons[name].name, special: 'midnight', condition: 'useItem', item: 'love sweet',
              });
            }
          } else if (pokemons[name].num === 266 || pokemons[name].num === 268) {
            evolutions.push({
              id: pokemons[name].num, name: pokemons[name].name, condition: 'levelRandom', level: pokemons[name].evoLevel, randomId: [266, 268],
            });
          } else if (pokemons[name].num === 291 || pokemons[name].num === 292) {
            evolutions.push({
              id: pokemons[name].num, name: pokemons[name].name, condition: 'levelRandom', level: pokemons[name].evoLevel, randomId: [291, 292],
            });
          } else if (pokemons[name].num === 421) {
            evolutions.push({
              id: pokemons[name].num, name: pokemons[name].name, condition: 'levelForm', level: pokemons[name].evoLevel, randomForm: [null, 'sunshine'],
            });
          } else if (pokemons[name].num === 666) {
            evolutions.push({
              id: pokemons[name].num, name: pokemons[name].name, condition: 'levelForm', level: pokemons[name].evoLevel, randomForm: [null, 'archipelago', 'continental', 'elegant', 'fancy', 'garden', 'highplains', 'icysnow', 'jungle', 'marine', 'modern', 'monsoon', 'ocean', 'pokeball', 'polar', 'river', 'sandstorm', 'savanna', 'sun', 'tundra'],
            });
          } else if (pokemons[name].num === 413 || pokemons[name].num === 416 || pokemons[name].num === 758) {
            evolutions.push({
              id: pokemons[name].num, name: pokemons[name].name, condition: 'level', level: pokemons[name].evoLevel, genderCondition: 'F',
            });
          } else if (pokemons[name].num === 414) {
            evolutions.push({
              id: pokemons[name].num, name: pokemons[name].name, condition: 'level', level: pokemons[name].evoLevel, genderCondition: 'M',
            });
          } else if (pokemons[name].num === 713 && pokemons[name].forme === 'Hisui') {
            evolutions.unshift({
              id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'star sweet', special: 'hisui',
            });
          } else if (pokemons[name].num === 157 && pokemons[name].forme === 'Hisui') {
            evolutions.unshift({
              id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'star sweet', special: 'hisui',
            });
          } else if (pokemons[name].num === 503 && pokemons[name].forme === 'Hisui') {
            evolutions.unshift({
              id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'star sweet', special: 'hisui',
            });
          } else if (pokemons[name].num === 549 && pokemons[name].forme === 'Hisui') {
            evolutions.unshift({
              id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'star sweet', special: 'hisui',
            });
          } else if (pokemons[name].num === 628 && pokemons[name].forme === 'Hisui') {
            evolutions.unshift({
              id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'star sweet', special: 'hisui',
            });
          } else if (pokemons[name].num === 705 && pokemons[name].forme === 'Hisui') {
            evolutions.unshift({
              id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'star sweet', special: 'hisui',
            });
          }else if (pokemons[name].num === 724 && pokemons[name].forme === 'Hisui') {
            evolutions.unshift({
              id: pokemons[name].num, name: pokemons[name].name, condition: 'useItem', item: 'star sweet', special: 'hisui',
            });
          } else {
            evolutions.push({
              id: pokemons[name].num, name: pokemons[name].name, condition: 'level', level: pokemons[name].evoLevel,
            });
          }
        }
      });
    }
    if (pokemon.forme) {
      if (pokemon.forme === 'Mega') {
        pokedexId[pokemon.num].mega = true;
      }
    }
    const name = normalizeName(pokemon.name);
    if (!pokedexId[pokemon.num]) {
      pokedexId[pokemon.num] = {
        dexId: pokemon.num,
        name: key,
        displayName: pokemon.name,
        base_experience: experienceCopy[key]?.exp ?? 100,
        types: pokemon.types,
        evolutions,
        height: pokemon.heightm,
        weight: pokemon.weightkg,
        gender: pokemon.gender,
        genderRatio: pokemon.genderRatio,
        forme: pokemon.forme?.toLowerCase(),
        location: getPokemonLocation(pokemon.num, pokemon.forme),
      };
      pokedexName[name] = pokedexId[pokemon.num];
    }
    if (!pokedexName[name]) {
      pokedexName[name] = {
        dexId: pokemon.num,
        name: key,
        displayName: pokemon.name,
        base_experience: experienceCopy[key]?.exp ?? 100,
        types: pokemon.types,
        evolutions,
        height: pokemon.heightm,
        weight: pokemon.weightkg,
        gender: pokemon.gender,
        genderRatio: pokemon.genderRatio,
        forme: pokemon.forme?.toLowerCase(),
        location: getPokemonLocation(pokemon.num, pokemon.forme),
      };
    }
    const copy = {
      ...pokedexName,
    };
    pokedexBase = Object.values(copy).filter(x => x.forme === undefined);
  }
  Logger.info('Loaded pokemons');
}

function getPokemon(id: number | string, special?: string) {
  if (id === undefined) {
    throw new Error('Undefined Pokémon ID');
  }
  if (special) {
    if (typeof id === 'number') {
      return pokedexName[pokedexId[id].name + special] || pokedexName[pokedexId[id].name];
    }
    return pokedexName[pokedexName[id].name + special] || pokedexName[pokedexName[id].name];
  }
  if (typeof id === 'number') {
    return pokedexId[id];
  }
  return pokedexName[id];
}

const ignoredSpecial: string[] = ['mega', 'megax', 'megay', 'bug', 'dark', 'dragon', 'electric', 'fairy', 'fighting', 'fire', 'flying', 'ghost', 'grass', 'ground', 'ice', 'poison', 'psychic', 'rock', 'steel', 'water', 'attack', 'speed', 'defense', 'heat', 'frost', 'fan', 'mow', 'wash', 'sky', 'origin', 'resolute', 'gmax', 'primal', 'super', 'large', 'small', 'pompom', 'pau', 'sensu'];

function getAbilities(id: number | string, special: string | undefined) {
  const { name } = getPokemon(id, special);

  const pokemons: any = Pokedex;

  return pokemons[name].abilities;
}

function getMoves(id: number | string, special: string | undefined): any {
  if (ignoredSpecial.includes(special || '')) {
    special = undefined;
  }
  const { name } = getPokemon(id, special);
  let moves = [];

  const movesets: any = Learnsets;
  const movesData: any = Moves;

  if (movesets[name] !== undefined) {
    for (const [key, value] of Object.entries(movesets[name].learnset)) {
      const move: any = value;
      let level = 0;
      for (let i = 0; i < move.length; i++) {
        if (move[i].charAt(1) === 'L') {
          level = parseInt(move[i].substr(2));
          break;
        } else {
          break;
        }
      }
      moves.push({
        move: key, name: movesData[key].name, power: movesData[key].basePower, category: movesData[key].category, type: movesData[key].type, level,
      });
    }
  }
  if (moves.length < 3 && special !== undefined) {
    moves = moves.concat(getMoves(id, undefined));
  }
  moves = moves.filter((value, index, self) =>
    index === self.findIndex((t) => (
      t.name === value.name
    ))
  );
  return moves;
}

function getStats(id: number | string, level: number, ivs: any, special: string | undefined, nature: string) {
  const { name } = getPokemon(id, special);

  const pokedex: any = Pokedex;
  const { baseStats } = pokedex[name];
  const calculatedStats: any = {};
  const natureChange = Natures[nature.toLowerCase()];

  for (const [key, value] of Object.entries(baseStats)) {
    const iv = ivs[key];
    const ev = 0;
    if (key === 'hp') {
      calculatedStats[key] = Math.floor(((2 * <number>value + iv + (ev / 4)) * level) / 100 + level + 10);
    } else {
      calculatedStats[key] = Math.floor(((2 * <number>value + iv + (ev / 4)) * level) / 100 + 5);
      if (natureChange.plus !== undefined && natureChange.plus === key) {
        calculatedStats[key] = Math.floor(calculatedStats[key] * 1.1);
      } else if (natureChange.plus !== undefined && natureChange.minus === key) {
        calculatedStats[key] = Math.floor(calculatedStats[key] * 0.9);
      }
    }
  }

  return calculatedStats;
}

function findPokemon(name: string) {
  return pokedexId.filter((x) => x.displayName.toLocaleLowerCase().includes(name));
}

function registerPokemon(discordId: string, pokemon: Pokemon) {
  if (pokemon === undefined) { return; }
  getPokedex(discordId).then(async (pokedex) => {
    if (pokedex === null) {
      await createPokedex(discordId);
    }
    pokedex = pokedex?.data;
    const pokemonDexName = normalizeName(pokemon.name);
    let needToUpdate = false;
    if (pokedex === null || pokedex === undefined) {
      pokedex = {};
    }
    let data: any;
    if (pokedex[pokemonDexName] !== undefined) {
      data = pokedex[pokemonDexName];
    } else {
      data = {};
      needToUpdate = true;
    }
    data.caught = true;
    if (pokemon.shiny) {
      data.shiny = true;
      needToUpdate = true;
    }
    if (needToUpdate) {
      pokedex[pokemonDexName] = data;
      const shiny = Object.entries(pokedex).filter((x: any) => x[1].shiny !== undefined).length;
      updatePokedex(discordId, {
        count: Object.keys(pokedex).length,
        shiny,
        data: pokedex,
      });
    }
  }).catch((error) => {
    Logger.error(error);
  });
}

const statsName: any = {
  atk: 'ATK', def: 'DEF', spa: 'Sp. ATK', spd: 'Sp. DEF', spe: 'SPE',
};

function calculateHiddenPowerType(hp: number, attack: number, defense: number, speed: number, spattack: number, spdefense: number) {
  const types = ['Fighting',
    'Flying',
    'Poison',
    'Ground',
    'Rock',
    'Bug',
    'Ghost',
    'Steel',
    'Fire',
    'Water',
    'Grass',
    'Electric',
    'Psychic',
    'Ice',
    'Dragon',
    'Dark'];
  hp = hp % 2;
  attack = attack % 2;
  defense = defense % 2;
  speed = speed % 2;
  spattack = spattack % 2;
  spdefense = spdefense % 2;

  const calc = Math.floor(((hp + 2 * attack + 4 * defense + 8 * speed + 16 * spattack + 32 * spdefense) * 15) / 63);

  return types[calc];
}

async function sendInfo(res: Pokemon, context: CommandContext, isMarket = false, marketOffer = '', debug = false) {
  const pokemon = { ...getPokemon(res.dexId, res.special) };
  const embed = new MessageEmbed();
  pokemon.forme = res.forme;
  const stats = getStats(res.dexId, res.level, res.ivs, res.special, res.nature);
  let friendshipDisplay = '';
  for (let i = 0; i < 10; i++) {
    if (res.friendship >= (i + 1) * 10) {
      friendshipDisplay += '❤️';
    } else {
      friendshipDisplay += '🖤';
    }
  }
  let bday = false;
  let halloween = false;
  if (pokemon.forme === 'bday') {
    bday = true;
  }
  if (pokemon.forme === 'halloween') {
    halloween = true;
  }
  const info = `${rarity[res.rarity]} ${res.nickname !== undefined && res.nickname !== null ? `${res.nickname} (${getPokemon(res.dexId, res.special).displayName})` : getPokemon(res.dexId, res.special).displayName} ${bday ? '🎂' : ''}${halloween ? '🎃' : ''} ${res.shiny ? '✨' : ''} ${genderEmoji[res.gender] ?? ''} (lvl. ${res.level})${debug ? `\nID: ${res._id.toString()}` : ''}\n\n${!isMarket ? `**Friendship**:\n${friendshipDisplay} (${res.friendship}/100)` : ''}`;

  let movesText = '';
  const hpType = calculateHiddenPowerType(res.ivs.hp, res.ivs.atk, res.ivs.def, res.ivs.spe, res.ivs.spa, res.ivs.spd);
  res.moves.forEach((element: string) => {
    if (element === null) {
      return;
    }
    if (element === 'hiddenpower') {
      movesText += `- ${typeEmoji[hpType]} **${MovesText[element].name}**\n`;
    } else {
      movesText += `- ${typeEmoji[Moves[element].type]} **${MovesText[element].name}**\n`;
    }
  });
  embed.addField('**Moves**', movesText, true);

  let item = items.find((x) => x.holdname === res.item);
  embed.addField('**Item**', `${res.item !== undefined && item !== undefined ? `${item?.emoji}**${item?.name}**\n${ItemsText[res.item].desc}` : 'None'}`, true);
  embed.addField('\u2800', '\u2800');
  const statsText = `HP: ${stats.hp}
ATK: ${stats.atk}
DEF: ${stats.def}
Sp. ATK: ${stats.spa}
Sp. DEF: ${stats.spd}
SPE: ${stats.spe}
Experience: ${res.experience}/${calculateLevelExperience(Math.min(100, res.level + 1))}`;
  embed.addField('**Stats**', statsText, true);
  const nature = Natures[res.nature.toLowerCase()];
  embed.addField('**Nature**', `**${res.nature}**\n${nature.plus !== undefined ? `${statsName[nature.plus]}+\n${statsName[nature.minus]}-` : ''}`, true);
  embed.addField('\u2800', '\u2800');
  const ability = res.abilitySlot !== undefined ? normalizeName(getAbilities(res.dexId, res.special)[res.abilitySlot]) || normalizeName(getAbilities(res.dexId, res.special)['0']) : normalizeName(getAbilities(res.dexId, res.special)['0']);
  if (Abilities[ability] !== undefined) {
    embed.addField('**Ability**', `**${Abilities[ability].name}**\n${Abilities[ability].shortDesc}`, true);
  }

  let bonusText = '';
  if (res.owner !== res.firstOwner) {
    bonusText += '**Pokémon traded**: 50% more Exp.\n';
  }
  if (res.luckyEgg) {
    bonusText += '**Lucky Egg**: 25% more Exp.\n(Bonus lost when traded)\n';
  }
  if (bonusText.length > 0 && isMarket === false) {
    embed.addField('**Bonus**', bonusText, true);
  }
  if (!marketOffer) {
    embed.setAuthor(context.user.username, context.user.avatarURL);
  }
  if (marketOffer) {
    embed.setTitle(`Market offer \`${marketOffer}\``);
  }
  embed.setThumbnail(getImage(pokemon, true, res.shiny, res.special))
    .setDescription(info);
  let footer = '';
  if (res.evolutionLock) {
    footer += 'Evolution has been disabled on this Pokémon\n';
  }
  if (res.mint !== undefined && res.mint > 0) {
    footer += `Nature mint used ${res.mint} times\n`;
  }
  footer += `Hidden Power type: ${hpType}\n`;
  embed.setFooter(footer);
  await context.commandInterction.editReply({ embeds: [embed] });
}

function searchPokemon(search: string) {
  if (search === '') {
    return Object.values(pokedexName).slice(0, 5);
  }
  const fuse = new Fuse(Object.values(pokedexName), {
    threshold: 0.6,
    keys: [
      'name',
      'displayName',
    ],
  });

  return fuse.search(search).map(x => x.item).slice(0, 5);
}


export function searchPokemonBase(search: string) {
  if (search === '') {
    return pokedexBase.slice(0, 5);
  }
  const fuse = new Fuse(pokedexBase, {
    threshold: 0.6,
    keys: [
      'name',
      'displayName',
    ],
  });

  return fuse.search(search).map(x => x.item).slice(0, 5);
}

export {
  initializePokedex, getPokemon, getStats,
  getMoves, normalizeName, rarity,
  typeEmoji, strength, weakness,
  resist, immune, findPokemon,
  moveClassEmoji, getAbilities, registerPokemon,
  sendInfo, genderEmoji, searchPokemon,
  pokedexBase
};
