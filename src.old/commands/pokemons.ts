import { Command, CommandContext } from 'command';
import { paginationEmbed, upperCaseFirstLetter } from '../modules/utils';
import { getPokemons } from '../modules/database';
import { findPokemon, getPokemon } from '../modules/pokedex';
import { mythicals, legendaries, ultrabeasts } from '../../data/pokemons';
import items from '../../data/items';
import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';

const rarity = ['<:n_:744200749600211004>', '<:u_:744200749541621851>', '<:r_:744200749554073660>', '<:sr:744200749189431327>', '<:ur:744200749537558588>', '<:lr:746745321660481576>'];
const types = ['water', 'steel', 'rock', 'psychic', 'poison', 'normal', 'ice', 'ground', 'fairy', 'fighting', 'fire', 'bug', 'flying', 'dark', 'dragon', 'ghost', 'grass', 'electric'];
const emojiSpecials: any = {
  'bday': '🎂',
  'halloween': '🎃',
  'xmas': '🎄',
};

export const Pokemons: Command = {
  name: 'Pokeons',
  keywords: ['box'],
  category: 'Pokémon',
  fullDesc: 'Command will display all your Pokémons with their ID. You can use this ID to select them with the command `%PREFIX%select` or have more informations about it using the command `%PREFIX%info <ID>`. You can apply a filter or sort the list for one time by adding an option. You can add a Pokémon name or number to search it in your Pokémons. You can sort this list in different orders by using `%PREFIX%sort` command.\n\nUsage: `%PREFIX%box [option|pokemon id|pokemon name|rarity|type]`\nNote: Available options: `shiny`,`level`,`rarity`,`favorite`,`traded`,`legendary`,`mythical`,`ultrabeast`,`nickname`,`item`\nNote: Add `-` in front of the option to have the opposite effect.\n\nExample: `%PREFIX%pokemons` will display all your Pokémons\nExample: `%PREFIX%pokemons shiny` will select all your shiny Pokémons.\nExample: `%PREFIX%pokemons -favorite` will display all the Pokémon that are not set as favorite.\nExample: `%PREFIX%pokemons pikachu` will display all Pikachu that you own.\nExample: `%PREFIX%pokemons 151` will display all Pokémon corresponding to ID #151.\nExample: `%PREFIX%pokemons traded` will display all Pokémons that you reveived from a trade',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('box')
    .setDescription('See all your Pokémon.')
    .addBooleanOption(option => option.setName('mythical').setDescription('Select mythicals'))
    .addBooleanOption(option => option.setName('nickname').setDescription('Select that have a nickname'))
    .addBooleanOption(option => option.setName('shiny').setDescription('Select shinies'))
    .addBooleanOption(option => option.setName('ultrabeast').setDescription('Select ultreabeast'))
    .addBooleanOption(option => option.setName('favorite').setDescription('Select favorite Pokémon'))
    .addBooleanOption(option => option.setName('traded').setDescription('Select traded Pokémon'))
    .addBooleanOption(option => option.setName('legendary').setDescription('Select legendaries'))
    .addBooleanOption(option => option.setName('item').setDescription('Select Pokémon that hold item'))
    .addBooleanOption(option => option.setName('mega').setDescription('Select Mega Pokémon'))
    .addStringOption(option => option.setName('event').setDescription('Select Pokémon from an event')
      .addChoice('Birthday', 'bday')
      .addChoice('Halloween', 'halloween')
      .addChoice('Xmas', 'xmas')
    )
    .addStringOption(option => option.setName('rarity').setDescription('Select Pokémon by rarity')
      .addChoice('N', 'n')
      .addChoice('U', 'u')
      .addChoice('R', 'r')
      .addChoice('SR', 'sr')
      .addChoice('UR', 'ur')
      .addChoice('LR', 'lr')
    )
    .addStringOption(option => option.setName('name').setDescription('Filter by name'))
    .addStringOption(option => option.setName('type').setDescription('Filter by type')),

  handler(context: CommandContext): Promise<any> {
    return new Promise<any>(async (resolve, reject) => {
      try {
        let res: any = await getPokemons(context.user.id, context.player?.sort ?? '_ID_ASC');
        for (let i = 0; i < res.length; i++) {
          res[i].rankId = i;
        }
        if (context.commandInterction.options.getBoolean('mythical')) {
          res = res.filter((x: any) => mythicals.includes(x.dexId));
        } else if (context.commandInterction.options.getBoolean('legendary')) {
          res = res.filter((x: any) => legendaries.includes(x.dexId));
        } else if (context.commandInterction.options.getBoolean('ultrabeast')) {
          res = res.filter((x: any) => ultrabeasts.includes(x.dexId));
        }
        if (context.commandInterction.options.getBoolean('nickname')) {
          res = res.filter((x: any) => x.nickname !== null);
        }
        if (context.commandInterction.options.getBoolean('shiny')) {
          res = res.filter((x: any) => x.shiny === true);
        }
        if (context.commandInterction.options.getBoolean('shiny') === false) {
          res = res.filter((x: any) => x.shiny === false);
        }
        if (context.commandInterction.options.getBoolean('favorite')) {
          res = res.filter((x: any) => x.fav);
        } else if (context.commandInterction.options.getBoolean('favorite') === false) {
          res = res.filter((x: any) => !x.fav);
        }
        if (context.commandInterction.options.getBoolean('traded')) {
          res = res.filter((x: any) => x.owner !== x.firstOwner);
        } else if (context.commandInterction.options.getBoolean('favorite') === false) {
          res = res.filter((x: any) => x.owner === x.firstOwner);
        }
        if (context.commandInterction.options.getString('rarity') === 'n') {
          res = res.filter((x: any) => x.rarity === 0);
        } else if (context.commandInterction.options.getString('rarity') === 'u') {
          res = res.filter((x: any) => x.rarity === 1);
        } else if (context.commandInterction.options.getString('rarity') === 'r') {
          res = res.filter((x: any) => x.rarity === 2);
        } else if (context.commandInterction.options.getString('rarity') === 'sr') {
          res = res.filter((x: any) => x.rarity === 3);
        } else if (context.commandInterction.options.getString('rarity') === 'ur') {
          res = res.filter((x: any) => x.rarity === 4);
        } else if (context.commandInterction.options.getString('rarity') === 'lr') {
          res = res.filter((x: any) => x.rarity === 5);
        }
        if (context.commandInterction.options.getBoolean('item')) {
          res = res.filter((x: any) => x.item !== null);
        }
        if (context.commandInterction.options.getBoolean('mega')) {
          res = res.filter((x: any) => (x.special === 'mega' || x.special === 'megax' || x.special === 'megay'));
        }
        if (context.commandInterction.options.getString('event') !== null) {
          res = res.filter((x: any) => (x.forme === context.commandInterction.options.getString('event') || x.special === context.commandInterction.options.getString('event')));
        }
        if (context.commandInterction.options.getString('name') !== null) {
          let pokemonName = context.commandInterction.options.getString('name', true).toLowerCase().trim();
          let searchPokemon = findPokemon(pokemonName);
          if(searchPokemon.length > 1) {
            searchPokemon = searchPokemon.filter(x => x.name === pokemonName);
          }
          if (searchPokemon !== undefined && searchPokemon.length > 0) {
            let id = searchPokemon.map((pkm: any) => pkm.dexId)[0];
            res = res.filter((x: any) => x.dexId === id);
          }
        }

        if (context.commandInterction.options.getString('type') !== null) {
          const typesFilter = types.filter((x) => x.includes(context.commandInterction.options.getString('type', true).toLowerCase()));
          if (typesFilter.length > 0) {
            for (let i = 0; i < typesFilter.length; i++) {
              res = res.filter((x: any) => getPokemon(x.dexId, x.special).types.includes(upperCaseFirstLetter(typesFilter[i])));
            }
          }
        }
        let pokemonList = ['', ''];
        const embed = new MessageEmbed();
        embed.setAuthor(context.user.username, context.user.avatarURL);
        embed.setTitle('**Pokemons**');
        const pages: MessageEmbed[] = [embed];
        let j = 0;
        for (let i = 0; i < res.length; i++) {
          const column = i % 10 > 4 ? 1 : 0;
          pokemonList[column] += `**\`${res[i].rankId + 1}.\` ${rarity[res[i].rarity]} `;
          pokemonList[column] += res[i].nickname !== null ? res[i].nickname : getPokemon(res[i].dexId, res[i].special).displayName;
          if (res[i].shiny) { pokemonList[column] += ' ✨'; }
          if (res[i].fav) { pokemonList[column] += ' ❤️'; }
          if (res[i].forme !== undefined) { pokemonList[column] += ` ${emojiSpecials[res[i].forme] ?? ''}`; }
          if (res[i].special !== undefined) { pokemonList[column] += ` ${emojiSpecials[res[i].special] ?? ''}`; }
          let item = '';
          if (res[i].item !== null) {
            const itemData = items.find((x: any) => x.holdname === res[i].item);
            if (itemData !== null && itemData !== undefined) {
              item = itemData.emoji;
            }
          }
          pokemonList[column] += `**\n${item} Level ${res[i].level}\n\n`;

          if (i % 10 === 9 && i < res.length - 1) {
            pages[j].addField('\u2800', `${pokemonList[0]}`, true);
            pages[j].addField('\u2800', `${pokemonList[1]}`, true);
            pages[j].setDescription(`You have ${res.length} Pokémons`);
            j++;
            pages[j] = new MessageEmbed();
            pages[j].setAuthor(context.user.username, context.user.avatarURL);
            pages[j].setTitle('**Pokemons**');
            pokemonList = ['', ''];
          }
        }

        if (pokemonList[0].length > 0) { pages[j].addField('\u2800', `${pokemonList[0]}`, true); }
        if (pokemonList[1].length > 0) { pages[j].addField('\u2800', `${pokemonList[1]}`, true); }
        pages[j].setDescription(`You have ${res.length} Pokémons`);
        paginationEmbed(context, pages);
        resolve({});
      } catch (e) {
        reject(e);
      }
    });
  },
};
