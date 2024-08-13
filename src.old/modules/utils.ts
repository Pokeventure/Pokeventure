import { CommandContext } from 'command';
import { User as UserContext } from 'command';
import { Pokemon, PokemonSpecies, Trainer } from 'pokemon';
import {
  getPokemon, getAbilities, normalizeName,
} from './pokedex';
import { ButtonInteraction, Client as DiscordClient, Interaction, Message, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { APIMessage, Routes } from 'discord-api-types/v9';
import Client from './client';
import Logger from './logger';
import items from '../../data/items';
import Fuse from 'fuse.js';

const Redis = require('ioredis');

const pagination: any = [];

function sendEmbed({ context, message, image = null, thumbnail = null, author = null, footer = null, title = null, color = null, components = null, followUp = false }: { context: CommandContext; message: string; image?: any; thumbnail?: any; author?: UserContext | null; footer?: any; title?: any; color?: any; components?: any; followUp?: boolean }): Promise<Message | APIMessage> {
  message = message.replace(/%PREFIX%/g, '/');
  if (footer !== null) {
    footer = footer.replace(/%PREFIX%/g, '/');
  }
  const embed: MessageEmbed = new MessageEmbed();
  embed.setDescription(message);

  if (color !== null) {
    embed.color = color;
  }
  if (image !== null) {
    embed.image = {
      url: image,
    };
  }
  if (thumbnail !== null) {
    embed.thumbnail = {
      url: thumbnail,
    };
  }
  if (author !== null) {
    embed.author = {
      name: author.username,
      iconURL: author.avatarURL,
    };
  }
  if (footer !== null) {
    embed.footer = {
      text: footer,
    };
  }
  if (title !== null) {
    embed.title = title;
  }

  let answers: any = {
    embeds: [embed],
    fetchReply: true,
  };

  let row: MessageActionRow;
  let rows: MessageActionRow[] = [];
  if (components !== null && components.length > 0) {
    row = new MessageActionRow();
    for (let i = 0; i < components.length; i++) {
      if (components[i].url !== undefined) {
        row
          .addComponents(
            new MessageButton()
              .setURL(components[i].url)
              .setLabel(components[i].label)
              .setEmoji(components[i].emoji)
              .setStyle('LINK'),
          );
      } else {
        row
          .addComponents(
            new MessageButton()
              .setCustomId(components[i].customId)
              .setLabel(components[i].label)
              .setEmoji(components[i].emoji)
              .setStyle(components[i].style ?? 'PRIMARY'),
          );
      }
      if (row.components.length >= 5) {
        rows.push(row);
        row = new MessageActionRow();
      }
    }
    rows.push(row);
    answers.components = rows;
  }

  if (context.interaction !== undefined && (context.interaction.isCommand() || context.interaction.isButton() || context.interaction.isSelectMenu())) {
    if (context.interaction.deferred && !context.interaction.replied) {
      return context.interaction.editReply(answers);
    }
    if (context.interaction.replied) {
      return context.interaction.followUp(answers);
    }
    return context.interaction.reply(answers);
  }
  let res = context.channel?.send(answers);
  if (res !== undefined) {
    return res;
  }
  return new Promise(() => { });
}

function getRndInteger(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min);
}

function upperCaseFirstLetter(toUpperCase: string): string {
  if (toUpperCase === null) { return ''; }
  return toUpperCase.charAt(0).toUpperCase() + toUpperCase.slice(1);
}

function calculateLevelExperience(level: number) {
  return Math.floor(5 * Math.pow(level, 3) / 4);
}

export function calculateLevelFromExperience(experience: number) {
  return Math.floor(Math.cbrt(experience * 4 / 5));
}

async function paginationEmbed(context: CommandContext, pages: MessageEmbed[], startingPage = 0) {
  const timeout = 60000;

  if (!pages) { throw new Error('Pages are not given.'); }
  if (pagination[context.user.id] !== undefined) {
    pagination[context.user.id].stop();
    delete pagination[context.user.id];
  }
  let page = Math.min(startingPage, pages.length - 1);
  pages[page].setFooter({ text: `Page ${page + 1} / ${pages.length}` });
  let messageContent: any = {
    embeds: [pages[page]],
    fetchReply: true
  };
  if (pages.length > 1) {
    messageContent.components = [
      {
        type: 1,
        components: [
          {
            type: 2,
            customId: 'choice_0',
            label: 'Previous',
            style: 1,
          },
          {
            type: 2,
            customId: 'choice_1',
            label: 'Next',
            style: 1
          }
        ]
      }
    ];
  }

  let message: Message | APIMessage = await context.commandInterction.editReply(messageContent);
  if (pages.length > 1) {
    choiceMaker(context.client.discordClient, context.user.id, message.id, (interaction: ButtonInteraction, user: string, choice: number) => {
      if (user !== context.user.id) {
        return;
      }
      if (choice === 0) {
        page = page > 0 ? --page : pages.length - 1;
      } else {
        page = page + 1 < pages.length ? ++page : 0;
      }
      pages[page].setFooter({ text: `Page ${page + 1} / ${pages.length}` });
      interaction.update({ embeds: [pages[page]] });
    }, timeout, false);
  }
  return message;
}

function getImage(pokemon: Pokemon | PokemonSpecies, front: boolean, shiny = false, special: any = null) {
  if (special === 'mega-x') {
    special = 'megax';
  } else if (special === 'mega-y') {
    special = 'megay';
  }
  const pokemonData = getPokemon(pokemon.dexId, special);
  let forme = '';
  if (pokemon.forme !== undefined && pokemon.forme !== null) {
    if (!pokemonData.displayName.toLocaleLowerCase().includes(`-${pokemon.forme}`)) {
      forme += `-${pokemon.forme.replace('rapid-strike', 'rapidstrike')}`;
    }
  }

  const image = `https://pokeventure-image.s3.us-east-1.amazonaws.com/${!front ? 'back' : 'front'}${shiny ? '-shiny' : ''}/${pokemonData.displayName.toLowerCase().replace('.', '').replace(' ', '').replace('’', '')
    .replace('mega-y', 'megay')
    .replace('mega-x', 'megax')
    .replace(/é/g, 'e')
    .replace(/-m$/, 'm')
    .replace(/-o$/, 'o')
    .replace(/-oh/, 'oh')
    .replace(/:/, '')
    .replace('rapid-strike', 'rapidstrike')
    .replace('white-striped', 'whitestriped')
    .replace('white-striped', 'whitestriped')
    .replace('dusk-mane', 'duskmane')
    .replace('dawn-wings', 'dawnwings')
    .replace(/rock-star$/, 'rockstar')
    .replace(/pop-star$/, 'popstar')}${forme
      .replace('white-striped', 'whitestriped')
      .replace('blue-striped', 'bluestriped')
      .replace('dusk-mane', 'duskmane')
      .replace('dawn-wings', 'dawnwings')}.gif?v=3`.toLocaleLowerCase();
  return image;
}

function formatPokemonForFight(pokemon: Pokemon, index: number) {
  const data = getPokemon(pokemon.dexId, pokemon.special);
  const ability = normalizeName(getAbilities(pokemon.dexId, pokemon.special)[pokemon.abilitySlot] || getAbilities(pokemon.dexId, pokemon.special)['0']);
  let forme = '';
  if (pokemon.forme !== null && pokemon.forme !== undefined) {
    forme += `-${pokemon.forme}`;
  }
  return {
    name: `${pokemon.nickname !== null && pokemon.nickname !== undefined ? pokemon.nickname : data.displayName};${index}`,
    species: data.displayName,
    gender: pokemon.gender,
    moves: pokemon.moves,
    evs: {
      hp: pokemon.friendship * 85 / 100, atk: pokemon.friendship * 85 / 100, def: pokemon.friendship * 85 / 100, spa: pokemon.friendship * 85 / 100, spd: pokemon.friendship * 85 / 100, spe: pokemon.friendship * 85 / 100,
    },
    ivs: {
      hp: pokemon.ivs.hp, atk: pokemon.ivs.atk, def: pokemon.ivs.def, spa: pokemon.ivs.spa, spd: pokemon.ivs.spd, spe: pokemon.ivs.spe,
    },
    item: pokemon.item,
    level: pokemon.level,
    shiny: pokemon.shiny,
    forme,
    nature: pokemon.nature,
    ability,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const isTrainer = (p: any): p is Trainer => p.type === 'trainer';
export const isPokemon = (p: any): p is Pokemon => p.type === 'pokemon';

const choicesUsers: any = {};
const redisClients: any = {};

export function choiceMaker(client: DiscordClient, discordId: string, messageId: string, choices: (interaction: ButtonInteraction, user: string, choice: number) => void, expire: number, expireOnChoice: boolean = true, choiceEvent: string = 'choice') {
  return new Promise((resolve, reject) => {
    if (choicesUsers[discordId] !== undefined) {
      clearTimeout(choicesUsers[discordId].timeout);
      let maxListeners = client.getMaxListeners();
      client.setMaxListeners(maxListeners - 1);
      client.removeListener(choiceEvent, choicesUsers[discordId].handler);
      delete choicesUsers[discordId];
    }
    let handler = (interaction: ButtonInteraction, user: string, choice: number, emitedMessageId: string) => {
      if (messageId !== emitedMessageId) {
        return;
      }
      if (user !== discordId) {
        return;
      }
      choices(interaction, user, choice);
      if (expireOnChoice) {
        clearTimeout(timeout);
        deleteHandler();
        resolve({});
      }
    };
    let deleteHandler = () => {
      delete choicesUsers[discordId];
      let maxListeners = client.getMaxListeners();
      client.setMaxListeners(maxListeners - 1);
      client.removeListener(choiceEvent, handler);
    };
    let timeout = setTimeout(() => {
      deleteHandler();
      resolve({ timeout: true });
    }, expire);
    let maxListeners = client.getMaxListeners();
    client.setMaxListeners(maxListeners + 1);
    client.on(choiceEvent, handler);
    choicesUsers[discordId] = { timeout, handler };
  });
}

export function sendDM(client: Client, discordId: string, message: any) {
  return client.restClient.post(Routes.userChannels(), {
    body: {
      recipient_id: discordId,
    }
  }).then((userChannel: any) => {
    return client.restClient.post(Routes.channelMessages(userChannel.id), {
      body: {
        ...message
      }
    });
  }).catch((error) => {
    Logger.error(error);
  });
}

export function updateMessage(client: Client, messageData: any, message: any) {
  return client.restClient.patch(Routes.channelMessage(messageData.channel_id ?? messageData.channelId, messageData.id), {
    body: {
      ...message,
    },
  }).catch((error) => {
    Logger.error(error);
  });
}

export function getChannel(client: Client, channelId: string) {
  return client.discordClient.channels.fetch(channelId);
}

export function searchItem(search: string) {
  if (search === '') {
    return Object.values(items).slice(0, 5);
  }
  const fuse = new Fuse(Object.values(items), {
    threshold: 0.6,
    keys: [
      'name',
    ],
  });

  return fuse.search(search).map(x => x.item).slice(0, 5);
}

export {
  sendEmbed, getRndInteger, upperCaseFirstLetter, calculateLevelExperience, paginationEmbed, getImage, formatPokemonForFight, sleep,
};
