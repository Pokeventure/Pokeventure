import { Command, CommandContext } from 'command';
import { PokemonSpecies } from 'pokemon';
import {
  getImage, paginationEmbed, sendEmbed, upperCaseFirstLetter,
} from '../modules/utils';
import {
  getPokemon, resist, typeEmoji, weakness, immune, normalizeName,
} from '../modules/pokedex';
import {
  countPokemons, getPokemons, updatePokedex, getPokedex, createPokedex,
} from '../modules/database';
import { Pokedex as PokedexImport } from '../../simulator/.data-dist/pokedex';
import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';

const PokedexData: any = PokedexImport;

async function sendPokedex(context: CommandContext, pokemon: PokemonSpecies, shiny: boolean) {
  let count: any = null;
  try {
    count = await context.client.redis.get(`pokedex_count_${shiny}_${pokemon.dexId}_${pokemon.forme}`);
  } catch (e) {
    console.log(e);
  }
  if (count === null || isNaN(count)) {
    count = await countPokemons(pokemon.dexId, pokemon.forme, shiny);
    // Cache for 60 minutes
    context.client.redis.set(`pokedex_count_${shiny}_${pokemon.dexId}_${pokemon.forme}`, count, 'EX', 3600).catch((e: any) => { });
  } else {
    count = parseInt(count);
  }
  const owned: any = await countPokemons(pokemon.dexId, pokemon.forme, shiny, context.user.id);

  const embed = new MessageEmbed();

  embed.addField('**Types**', `${typeEmoji[pokemon.types[0]]} ${pokemon.types[0]} ${pokemon.types[1] !== undefined ? `\n${typeEmoji[pokemon.types[1]]} ${pokemon.types[1]}` : ''}`, true);
  // Weakness
  const weaknesses: any[] = [];
  for (let i = 0; i < weakness[pokemon.types[0]].length; i++) {
    weaknesses.push(weakness[pokemon.types[0]][i]);
  }
  if (pokemon.types[1] !== undefined) {
    for (let i = 0; i < weakness[pokemon.types[1]].length; i++) {
      if (weaknesses.indexOf(weakness[pokemon.types[1]][i]) === -1) {
        weaknesses.push(weakness[pokemon.types[1]][i]);
      }
    }
    for (let i = 0; i < resist[pokemon.types[0]].length; i++) {
      if (weaknesses.indexOf(resist[pokemon.types[0]][i]) !== -1) {
        weaknesses.splice(weaknesses.indexOf(resist[pokemon.types[0]][i]), 1);
      }
    }
    for (let i = 0; i < resist[pokemon.types[1]].length; i++) {
      if (weaknesses.indexOf(resist[pokemon.types[1]][i]) !== -1) {
        weaknesses.splice(weaknesses.indexOf(resist[pokemon.types[1]][i]), 1);
      }
    }
  }
  const immunities: any[] = [];
  for (let i = 0; i < immune[pokemon.types[0]].length; i++) {
    immunities.push(immune[pokemon.types[0]][i]);
    if (weaknesses.indexOf(immune[pokemon.types[0]][i]) !== -1) {
      weaknesses.splice(weaknesses.indexOf(immune[pokemon.types[0]][i]), 1);
    }
  }
  if (pokemon.types[1] !== undefined) {
    for (let i = 0; i < immune[pokemon.types[1]].length; i++) {
      immunities.push(immune[pokemon.types[1]][i]);
      if (weaknesses.indexOf(immune[pokemon.types[1]][i]) !== -1) {
        weaknesses.splice(weaknesses.indexOf(immune[pokemon.types[1]][i]), 1);
      }
    }
  }
  for (let i = 0; i < weaknesses.length; i++) {
    weaknesses[i] = `${typeEmoji[weaknesses[i]]} ${weaknesses[i]}`;
  }
  for (let i = 0; i < immunities.length; i++) {
    immunities[i] = `${typeEmoji[immunities[i]]} ${immunities[i]}`;
  }
  embed.addField('**Weak against**', `${weaknesses.join('\n')}`, true);

  if (immunities.length > 0) {
    embed.addField('**Immune to**', `${immunities.join('\n')}`, true);
  } else {
    embed.addField('\u200B', '\u200B');
  }
  const abilites = Object.entries(PokedexData[pokemon.name].abilities).map((x) => x[1]);

  embed.addField('**Height**', `${pokemon.height} m`, true)
    .addField('**Weight**', `${pokemon.weight} kg`, true)
    .addField('**Abilities**', abilites.join('\n'), true)
    .addField('**Count**', count.toString(), true)
    .addField('**Owned**', owned.toString(), true);

  if (pokemon.location !== undefined) {
    embed.addField('Location', pokemon.location, true);
  } else {
    embed.addField('\u200B', '\u200B');
  }

  const stats = PokedexData[pokemon.name].baseStats;
  embed.addField('**Base Stats**', `**HP**: ${stats.hp} | **ATK**: ${stats.atk} | **DEF**: ${stats.def} | **Sp. ATK**: ${stats.spa} | **Sp. DEF**: ${stats.spd} | **SPE**: ${stats.spe}`);

  let textEvolution = '';
  pokemon.evolutions.forEach((evo) => {
    switch (evo.condition) {
      case 'level':
        textEvolution += `Evolves into ${evo.name} at level ${evo.level} ${evo.genderCondition !== undefined ? `${evo.genderCondition === 'M' ? 'if Pokémon is ♂' : 'if Pokémon is ♀'}` : ''}\n`;
        break;
      case 'useItem':
        textEvolution += `Evolves into ${evo.name} by using a ${evo.item} ${evo.genderCondition !== undefined ? `${evo.genderCondition === 'M' ? 'if Pokémon is ♂' : 'if Pokémon is ♀'}` : ''}\n`;
        break;
      case 'trade':
        textEvolution += `Evolves into ${evo.name} when traded\n`;
        break;
      case 'levelMove':
        textEvolution += `Evolves into ${evo.name} when leveling up and knowing ${evo.move}\n`;
        break;
      case 'moveType':
        textEvolution += `Evolves into ${evo.name} when leveling up and knowing a move of ${evo.type} type\n`;
        break;
      case 'levelRandom':
        textEvolution += `Can evolve into ${evo.name} at level ${evo.level}\n`;
        break;
      case 'levelZone':
        textEvolution += `Evolve into ${evo.name} at level ${evo.level} in a Hisuian location\n`;
        break;
      case 'levelForm':
        textEvolution += `Evolves into ${evo.name} at level ${evo.level}\n`;
        break;
    }
  });
  embed.setFooter(textEvolution);
  embed.setTitle(`${upperCaseFirstLetter(pokemon.displayName)} #${pokemon.dexId}`);
  embed.setThumbnail(getImage(pokemon, true, shiny, pokemon.forme));

  context.commandInterction.editReply({ embeds: [embed] });
}

export const Pokedex: Command = {
  name: 'Pokedex',
  keywords: ['pokedex', 'pkdx', 'pdex', 'dex', 'pd'],
  category: 'Pokémon',
  fullDesc: 'Use the Pokédex to learn more about the Pokémon you want. It will diplays the Pokémon type, its height and its weight. You will be able to see all the Pokémon you caught.\n\nUsage: `%PREFIX%pokedex [id|name]`\nUsage: `%PREFIX%pokedex`\nUsage: `%PREFIX%pokedex update` to update your Pokédex data.\n\nExample: `%PREFIX%pokedex 25` to see the Pokédex entry for the Pokémon with the number 25\nExample: `%PREFIX%pokedex pikachu` to see Pokédex entry for Pikachu.',
  requireStart: true,
  needPlayer: false,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('pokedex')
    .setDescription('Use the Pokédex to learn more about the Pokémon you want.')
    .addStringOption(option => option.setName('pokemon').setDescription('Pokémon name').setAutocomplete(true))
    .addIntegerOption(option => option.setName('id').setDescription('Pokémon pokedex number'))
    .addBooleanOption(option => option.setName('shiny').setDescription('Shiny Pokémon')),

  handler(context: CommandContext): Promise<any> {
    return new Promise(async (resolve, reject) => {
      /* TODO if (context.args.includes('update')) {
        const can = await context.client.redis.get(`pokedex_${context.user.id}`);
        if (can !== null) {
          sendEmbed({ context, message: 'You can\'t run an update of your Pokédex yet.' });
          return;
        }
        context.client.redis.set(`pokedex_${context.user.id}`, '1', 'EX', 60 * 60).catch(() => { });
        getPokemons(context.user.id, context.player?.sort ?? '_ID_ASC').then((res) => {
          getPokedex(context.user.id).then(async (pokedex) => {
            if (pokedex === null) {
              await createPokedex(context.user.id);
            }
            if (res.length === 0) {
              return;
            }
            let pokedexCalculated: any = {};
            if (pokedex !== null) { pokedexCalculated = pokedex.data; }
            for (let i = 0; i < res.length; i++) {
              if (res[i].firstOwner === context.user.id && res[i].owner === context.user.id) {
                const pokemonDexName = normalizeName(getPokemon(res[i].dexId, res[i].special).name);
                let data: any;
                if (pokedexCalculated[pokemonDexName] !== undefined) {
                  data = pokedexCalculated[pokemonDexName];
                } else {
                  data = {};
                }
                data.caught = true;
                if (res[i].shiny) {
                  data.shiny = true;
                }
                pokedexCalculated[pokemonDexName] = data;
              }
            }
            const shiny = Object.entries(pokedexCalculated).filter((x: any) => x[1].shiny !== undefined).length;
            updatePokedex(context.user.id, {
              count: Object.keys(pokedexCalculated).length,
              shiny,
              data: pokedexCalculated,
            });
            sendEmbed({ context, message: 'Pokédex data have been updated.', image: null, thumbnail: null, author: context.user });
            resolve({});
          }).catch((error) => {
            reject(error);
          });
        }).catch((error) => {
          reject(error);
        });
      }*/
      if (context.commandInterction.options.getString('pokemon') !== null || context.commandInterction.options.getInteger('id') !== null) {
        let shiny = false;
        if (context.commandInterction.options.getBoolean('shiny')) { shiny = true; }
        let pokemon = null;
        if (context.commandInterction.options.getInteger('id') !== null) {
          pokemon = getPokemon(context.commandInterction.options.getInteger('id', true));
        } else {
          pokemon = getPokemon(context.commandInterction.options.getString('pokemon', true).toLowerCase());
        }
        if (pokemon === null) {
          pokemon = Object.entries(PokedexData).find((x: any) => x[1].name.toLowerCase().includes(context.commandInterction.options.getString('pokemon', true)));
          if (pokemon) {
            pokemon = getPokemon((<any>pokemon[1]).num, (<any>pokemon[1]).forme);
          } else {
            pokemon = null;
          }
        }
        if (pokemon !== null && pokemon !== undefined) {
          sendPokedex(context, pokemon, shiny);
        } else {
          context.commandInterction.editReply('No Pokémon match.');
        }
        resolve({});
      } else {
        let startingPage = 0;
        /* TODO if (context.args.find((x) => !isNaN(parseInt(x)))) {
          startingPage = Math.max(parseInt(context.args.filter((x) => !isNaN(parseInt(x)))[0]) - 1, 0);
        } */
        getPokedex(context.user.id).then((pokedex) => {
          let pageData: any[] = [];
          const pages: any[] = [];
          for (let i = 0; i < Object.entries(PokedexData).length; i++) {
            const pokedexData: any = Object.entries(PokedexData)[i];
            if (pokedexData[1].num <= 0) { continue; }
            if (pokedexData[0].endsWith('totem')) { continue; }
            pageData.push({
              name: pokedexData[0],
              num: pokedexData[1].num,
              displayName: pokedexData[1].name,
            });
            if (pageData.length >= 20) {
              const embed = new MessageEmbed();
              let text = '';
              let text1 = '';
              for (let j = 0; j < pageData.length && j < 10; j++) {
                let caught = false;
                let shiny = false;
                if (pokedex !== null) {
                  if (pokedex.data[pageData[j].name] !== undefined) {
                    if (pokedex.data[pageData[j].name].caught !== undefined) {
                      caught = true;
                    }
                    if (pokedex.data[pageData[j].name].shiny !== undefined) {
                      shiny = true;
                    }
                  }
                }
                text += `${pageData[j].num}. ${caught ? '<:pokeball:741809195338432612>' : '<:ballblack:804326307281502208>'}${shiny ? '<:star:804155523779395584>' : '<:starblack:804326307475095572>'} ${pageData[j].displayName}\n`;
              }
              for (let j = 10; j < pageData.length && j < 20; j++) {
                let caught = false;
                let shiny = false;
                if (pokedex !== null) {
                  if (pokedex.data[pageData[j].name] !== undefined) {
                    if (pokedex.data[pageData[j].name].caught !== undefined) {
                      caught = true;
                    }
                    if (pokedex.data[pageData[j].name].shiny !== undefined) {
                      shiny = true;
                    }
                  }
                }
                text1 += `${pageData[j].num}. ${caught ? '<:pokeball:741809195338432612>' : '<:ballblack:804326307281502208>'}${shiny ? '<:star:804155523779395584>' : '<:starblack:804326307475095572>'} ${pageData[j].displayName}\n`;
              }
              embed.addField('\u2800', text, true);
              embed.addField('\u2800', '\u2800', true);
              embed.addField('\u2800', text1, true);
              embed.setTitle('Pokédex');
              embed.setDescription(`<:pokeball:741809195338432612> Pokémons caught: ${pokedex?.count ?? 0}\n<:star:804155523779395584> Shiny caught: ${pokedex?.shiny ?? 0}`);
              embed.setAuthor(context.user.username, context.user.avatarURL);
              pages.push(embed);
              pageData = [];
            }
          }
          if(pageData.length > 0) {
            const embed = new MessageEmbed();
            let text = '';
            let text1 = '';
            for (let j = 0; j < pageData.length && j < 10; j++) {
              let caught = false;
              let shiny = false;
              if (pokedex !== null) {
                if (pokedex.data[pageData[j].name] !== undefined) {
                  if (pokedex.data[pageData[j].name].caught !== undefined) {
                    caught = true;
                  }
                  if (pokedex.data[pageData[j].name].shiny !== undefined) {
                    shiny = true;
                  }
                }
              }
              text += `${pageData[j].num}. ${caught ? '<:pokeball:741809195338432612>' : '<:ballblack:804326307281502208>'}${shiny ? '<:star:804155523779395584>' : '<:starblack:804326307475095572>'} ${pageData[j].displayName}\n`;
            }
            for (let j = 10; j < pageData.length && j < 20; j++) {
              let caught = false;
              let shiny = false;
              if (pokedex !== null) {
                if (pokedex.data[pageData[j].name] !== undefined) {
                  if (pokedex.data[pageData[j].name].caught !== undefined) {
                    caught = true;
                  }
                  if (pokedex.data[pageData[j].name].shiny !== undefined) {
                    shiny = true;
                  }
                }
              }
              text1 += `${pageData[j].num}. ${caught ? '<:pokeball:741809195338432612>' : '<:ballblack:804326307281502208>'}${shiny ? '<:star:804155523779395584>' : '<:starblack:804326307475095572>'} ${pageData[j].displayName}\n`;
            }
            embed.addField('\u2800', text, true);
            embed.addField('\u2800', '\u2800', true);
            if(pageData.length > 10) {
              embed.addField('\u2800', text1, true);
            }
            embed.setTitle('Pokédex');
            embed.setDescription(`<:pokeball:741809195338432612> Pokémons caught: ${pokedex?.count ?? 0}\n<:star:804155523779395584> Shiny caught: ${pokedex?.shiny ?? 0}`);
            embed.setAuthor(context.user.username, context.user.avatarURL);
            pages.push(embed);
            pageData = [];
          }
          paginationEmbed(context, pages, startingPage);
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      }
    });
  },
};
