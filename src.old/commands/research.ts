import { Command, CommandContext } from 'command';
import { PokemonSpecies } from 'pokemon';
import {
  getImage, paginationEmbed, sendEmbed, upperCaseFirstLetter,
} from '../modules/utils';
import {
  getPokemon, resist, typeEmoji, weakness, immune, normalizeName, pokedexBase,
} from '../modules/pokedex';
import {
  countPokemons, getPokemons, updatePokedex, getPokedex, createPokedex, addToInventory, updateResearch,
} from '../modules/database';
import { Pokedex as PokedexImport } from '../../simulator/.data-dist/pokedex';
import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';
import { catchable, raidable, cannotEvolve, lureCatchable } from '../../data/research';
import { catchAmount, catchRaidAmount, evolvedAmount, feedAmount, Research as ResearchEnum, usedAmount } from '../modules/research';
import { encounters } from '../modules/world';

const PokedexData: any = PokedexImport;

function taskResult(value: number, amounts: number[]) {
  let res = '';
  amounts.forEach((task, index) => {
    if (value >= task && index === amounts.length - 1) {
      res += '✅';
    } else if(value >= task) {
      res += '✅ - ';
    } else if (index === amounts.length - 1) {
      res += `${task}`;
    } else {
      res += `${task} - `;
    }
  });
  return res;
}

function countTask(value: number, amounts: number[]) {
  let res = 0;
  amounts.forEach((task) => {
    if (value >= task) {
      res += 1;
    }
  });
  return res;
}

export function calculateTasks(pokemon: any, data: any) {
  let completed = 0;
  let total = 0;
  if (encounters.indexOf(pokemon) !== -1) {
    completed += countTask(data[ResearchEnum.catch] ?? 0, catchAmount);
    total += catchAmount.length;
  } else if (raidable.indexOf(pokemon) !== -1 || lureCatchable.indexOf(pokemon) !== -1) {
    completed += countTask(data[ResearchEnum.catch] ?? 0, catchRaidAmount);
    total += catchRaidAmount.length;
  }
  completed += countTask(data[ResearchEnum.used] ?? 0, usedAmount);
  total += usedAmount.length;
  completed += countTask(data[ResearchEnum.feed] ?? 0, feedAmount);
  total += feedAmount.length;
  if (cannotEvolve.indexOf(pokemon) === -1) {
    completed += countTask(data[ResearchEnum.evolving] ?? 0, evolvedAmount);
    total += evolvedAmount.length;
  }
  return [completed, total];
}

export const Research: Command = {
  name: 'Research',
  keywords: ['research'],
  category: 'Pokémon',
  fullDesc: '',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('research')
    .setDescription('Display your tasks progression on Pokémons')
    .addSubcommand(input => input.setName('tasks').setDescription('Check your Pokemon tasks').addStringOption(option => option.setName('pokemon').setDescription('Pokémon name').setAutocomplete(true)))
    .addSubcommand(input => input.setName('claim').setDescription('Claim rewards from researches')),

  handler(context: CommandContext): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (context.commandInterction.options.getString('pokemon') !== null) {
        let pokemon = null;
        pokemon = getPokemon(context.commandInterction.options.getString('pokemon', true).toLowerCase());
        if (pokemon === null) {
          pokemon = Object.entries(PokedexData).find((x: any) => x[1].name.toLowerCase().includes(context.commandInterction.options.getString('pokemon', true)));
          if (pokemon) {
            pokemon = getPokemon((<any>pokemon[1]).num, (<any>pokemon[1]).forme);
          } else {
            pokemon = null;
          }
        }
        if (pokemon !== null && pokemon !== undefined) {
          let data = context.player?.research?.data[pokemon.dexId] ?? {};
          let tasksAmount = calculateTasks(pokemon.dexId, data);
          let text = `**Research tasks done: ${tasksAmount[0]}/${tasksAmount[1]}**\n\n`;
          if (catchable.indexOf(pokemon.dexId) !== -1) {
            text += `Times caught: (${data[ResearchEnum.catch] ?? 0})\n${taskResult(data[ResearchEnum.catch] ?? 0, catchAmount)}\n`;
          } else if (raidable.indexOf(pokemon.dexId) !== -1 || lureCatchable.indexOf(pokemon.dexId) !== -1) {
            text += `Times caught: (${data[ResearchEnum.catch] ?? 0})\n${taskResult(data[ResearchEnum.catch] ?? 0, catchRaidAmount)}\n`;
          }
          text += `Times used: (${data[ResearchEnum.used] ?? 0})\n${taskResult(data[ResearchEnum.used] ?? 0, usedAmount)}
          Times fed: (${data[ResearchEnum.feed] ?? 0})\n${taskResult(data[ResearchEnum.feed] ?? 0, feedAmount)}\n`;
          if (cannotEvolve.indexOf(pokemon.dexId) === -1) {
            text += `Times evolved: (${data[ResearchEnum.evolving] ?? 0})\n${taskResult(data[ResearchEnum.evolving] ?? 0, evolvedAmount)}\n`;
          }
          sendEmbed({
            context, message: text, thumbnail: getImage(pokemon, true), title: `${pokemon.displayName} research tasks`
          });
        } else {
          context.commandInterction.editReply('No Pokémon match.');
        }
      } else if(context.commandInterction.options.getSubcommand(true) === 'claim') {
        let data = context.player?.research?.data ?? {};
        let count = 0;
        for (const [key, value] of Object.entries(data)) {
          // @ts-ignore
          if(value[-1] !== undefined) {
            // @ts-ignore
            if(value[-1] === 0) {
              data[key][-1] = 1;
              console.log(`Give shiny ticket to ${context.user.id} for ${key}`);
              count++;
            }
          }
        }
        if(count > 0) {
          await updateResearch(context.user.id, data);
          await addToInventory(context.user.id, 271, Math.max(1, count));
          sendEmbed({context, message: `You received x${count} Shiny Ticket <:shinyticket:878363313321414676> for completing your researches.`});
        } else {
          sendEmbed({context, message: 'You have nothing to claim.'});
        }
      } else {
        let startingPage = 0;
        let completion = pokedexBase.map(x => calculateTasks(x.dexId, context.player?.research?.data[x.dexId] ?? {})).reduce((a: number[], b: number[]) => {
          return [a[0] + b[0], a[1] + b[1], a[2] + (b[0] === b[1] ? 1 : 0)]; 
        }, [0, 0, 0]);
        let pageData: any[] = [];
          const pages: any[] = [];
          for (let i = 0; i < Object.entries(pokedexBase).length; i++) {
            const pokedexData: any = Object.entries(pokedexBase)[i][1];
            if(pokedexData.dexId <= 0) {
              continue;
            }
            pageData.push({
              name: pokedexData.name,
              num: pokedexData.dexId,
              displayName: pokedexData.displayName,
            });
            if (pageData.length >= 20) {
              const embed = new MessageEmbed();
              let text = '';
              let text1 = '';
              for (let j = 0; j < pageData.length && j < 10; j++) {
                text += `${pageData[j].num}. ${pageData[j].displayName} ${calculateTasks(pageData[j].num, context.player?.research?.data[pageData[j].num] ?? {}).join('/')}\n`;
              }
              for (let j = 10; j < pageData.length && j < 20; j++) {
                text1 += `${pageData[j].num}. ${pageData[j].displayName} ${calculateTasks(pageData[j].num, context.player?.research?.data[pageData[j].num] ?? {}).join('/')}\n`;
              }
              embed.addField('\u2800', text, true);
              embed.addField('\u2800', '\u2800', true);
              embed.addField('\u2800', text1, true);
              embed.setTitle('Pokédex');
              embed.setDescription(`Pokémon with all completed tasks: ${completion[2]}/905\nTotal tasks completed: ${completion[0]}/${completion[1]}\n\nComplete all tasks to get rewards!`);
              embed.setAuthor(context.user.username, context.user.avatarURL);
              pages.push(embed);
              pageData = [];
            }
          }
          paginationEmbed(context, pages, startingPage);
          resolve({});
      }
      resolve({});
    });
  },
};
