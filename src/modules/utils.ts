import { IPokemon, PokemonSpecies, ITrainer } from "../types/pokemon";
import {
    getPokemon, getAbilities, normalizeName,
} from "./pokedex";
import Client from "./client";
// import Logger from "./logger";
import items from "../../data/items";
// import Fuse from "fuse.js";
import { ButtonContext, CommandContext, Context } from "../types/command";
import { EmbedBuilder, EmbedFooterOptions, ColorResolvable, ActionRowBuilder, ButtonBuilder, BaseMessageOptions, ButtonStyle, User, Routes, Embed, ComponentType, Message, InteractionResponse } from "discord.js";
import Logger from "./logger";

interface CustomEmbed {
    description: string;
    title?: string;
    footer?: EmbedFooterOptions;
    color?: ColorResolvable;
    image?: string | null;
    author?: User;
    thumbnail?: string | null;
}

export function askConfirmation(message: Message, context: Context, onSuccess: () => void, userId: string | undefined = undefined) {
    const acceptButton = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(new ButtonBuilder()
            .setCustomId("accept")
            .setEmoji("✅")
            .setLabel("Accept")
            .setStyle(ButtonStyle.Primary)
        );
    message.edit({ components: [acceptButton] });
    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000
    });

    collector.on("collect", (interaction) => {
        if (userId) {
            if (interaction.user.id === userId) {
                onSuccess();
                collector.stop();
            }
        }
        else {
            if (interaction.user.id === context.user.id) {
                onSuccess();
                collector.stop();
            }
        }
    });

    collector.on("end", () => {
        message.edit({ components: [] });
    });
}

export function sendEmbed(context: CommandContext | ButtonContext, embed: CustomEmbed, buttons: {
    label: string,
    customId?: string,
    emoji?: string,
    url?: string,
    style: ButtonStyle,
}[] = []) {
    const embedToSend = new EmbedBuilder();

    embedToSend.setDescription(embed.description);
    if (embed.title) {
        embedToSend.setTitle(embed.title);
    }
    if (embed.footer) {
        embedToSend.setFooter(embed.footer);
    }
    if (embed.color) {
        embedToSend.setColor(embed.color);
    }
    if (embed.image) {
        embedToSend.setImage(embed.image);
    }
    if (embed.thumbnail) {
        embedToSend.setThumbnail(embed.thumbnail);
    }
    if (embed.author) {
        embedToSend.setAuthor({
            name: embed.author.username,
            iconURL: embed.author.avatarURL() ?? embed.author.defaultAvatarURL,
        });
    }

    const message: BaseMessageOptions = { embeds: [embedToSend] };

    if (buttons.length > 0) {
        const newButtons = new ActionRowBuilder<ButtonBuilder>();
        for (let i = 0; i < buttons.length; i++) {
            const buttonData = buttons[i];
            const button = new ButtonBuilder()
                .setLabel(buttonData.label)
                .setStyle(buttonData.style);
            if (buttonData.customId) {
                button.setCustomId(buttonData.customId);
            }
            if (buttonData.url) {
                button.setURL(buttonData.url);
            }
            if (buttonData.emoji) {
                button.setEmoji(buttonData.emoji);
            }
            newButtons.addComponents(
                button
            );
        }
        message.components = [newButtons];
    }

    if (context.interaction.deferred && !context.interaction.replied) {
        return context.interaction.editReply(message);
    }
    if (context.interaction.replied) {
        return context.interaction.followUp(message);
    }
    return context.interaction.reply(message);
}

/* function sendEmbed({ context, message, image = null, thumbnail = null, author = null, footer = null, title = null, color = null, components = null, followUp = false }: { context: CommandContext; message: string; image?: any; thumbnail?: any; author?: UserContext | null; footer?: any; title?: any; color?: any; components?: any; followUp?: boolean }): Promise<Message | APIMessage> {
  message = message.replace(/%PREFIX%/g, "/");
  if (footer !== null) {
    footer = footer.replace(/%PREFIX%/g, "/");
  }
  const embed: MessageEmbed = new EmbedBuilder();
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
              .setStyle("LINK"),
          );
      } else {
        row
          .addComponents(
            new MessageButton()
              .setCustomId(components[i].customId)
              .setLabel(components[i].label)
              .setEmoji(components[i].emoji)
              .setStyle(components[i].style ?? "PRIMARY"),
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
} */

function getRndInteger(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min) + min);
}

function upperCaseFirstLetter(toUpperCase: string): string {
    if (toUpperCase === null) { return ""; }
    return toUpperCase.charAt(0).toUpperCase() + toUpperCase.slice(1);
}

function calculateLevelExperience(level: number) {
    return Math.floor(5 * Math.pow(level, 3) / 4);
}

export function calculateLevelFromExperience(experience: number) {
    return Math.floor(Math.cbrt(experience * 4 / 5));
}

export function pagination(context: CommandContext | ButtonContext, pages: EmbedBuilder[]) {
    if (pages.length === 1) {
        return context.interaction.editReply({ embeds: [pages[0]] });
    }
    let page = 0;

    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("previous")
                .setStyle(ButtonStyle.Primary)
                .setLabel("Previous")
                .setEmoji("⬅️"),
            new ButtonBuilder()
                .setCustomId("next")
                .setStyle(ButtonStyle.Primary)
                .setLabel("Next")
                .setEmoji("➡️"));

    pages[0].setFooter({ text: `Page ${page + 1}/${pages.length}` });

    return context.interaction.editReply({ embeds: [pages[0]], components: [buttons] }).then((message) => {
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on("collect", (interaction) => {
            if (interaction.user.id === context.user.id) {
                if (interaction.customId === "previous") {
                    page = page > 0 ? --page : pages.length - 1;
                }
                if (interaction.customId === "next") {
                    page = page + 1 < pages.length ? ++page : 0;
                }
                pages[page].setFooter({ text: `Page ${page + 1}/${pages.length}` });
                interaction.update({
                    embeds: [pages[page]]
                });
            }
        });

        collector.on("end", () => {
            message.edit({ components: [] });
        });
    });
}

/* async function paginationEmbed(context: CommandContext, pages: Embed[], startingPage = 0) {
  const timeout = 60000;
 
  if (!pages) { throw new Error("Pages are not given."); }
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
            customId: "choice_0",
            label: "Previous",
            style: 1,
          },
          {
            type: 2,
            customId: "choice_1",
            label: "Next",
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
} */

function getImage(pokemon: IPokemon | PokemonSpecies, front: boolean, shiny = false, special: any = null) {
    if (special === "mega-x") {
        special = "megax";
    } else if (special === "mega-y") {
        special = "megay";
    }
    const pokemonData = getPokemon(pokemon.dexId, special);
    let forme = "";
    if (pokemon.forme !== undefined && pokemon.forme !== null) {
        if (!pokemonData.displayName.toLocaleLowerCase().includes(`-${pokemon.forme}`)) {
            forme += `-${pokemon.forme.replace("rapid-strike", "rapidstrike")}`;
        }
    }

    const image = `https://pokeventure-image.s3.us-east-1.amazonaws.com/${!front ? "back" : "front"}${shiny ? "-shiny" : ""}/${pokemonData.displayName.toLowerCase().replace(".", "").replace(" ", "").replace("’", "")
        .replace("mega-y", "megay")
        .replace("mega-x", "megax")
        .replace(/é/g, "e")
        .replace(/-m$/, "m")
        .replace(/-o$/, "o")
        .replace(/-oh/, "oh")
        .replace(/:/, "")
        .replace("rapid-strike", "rapidstrike")
        .replace("white-striped", "whitestriped")
        .replace("white-striped", "whitestriped")
        .replace("dusk-mane", "duskmane")
        .replace("dawn-wings", "dawnwings")
        .replace(/rock-star$/, "rockstar")
        .replace(/pop-star$/, "popstar")}${forme.replace("white-striped", "whitestriped")
            .replace("blue-striped", "bluestriped")
            .replace("dusk-mane", "duskmane")
            .replace("dawn-wings", "dawnwings")}.gif?v=3`.toLocaleLowerCase();
    return image;
}

function formatPokemonForFight(pokemon: IPokemon, index: number) {
    const data = getPokemon(pokemon.dexId, pokemon.special);
    const ability = normalizeName(getAbilities(pokemon.dexId, pokemon.special)[pokemon.abilitySlot] || getAbilities(pokemon.dexId, pokemon.special)["0"]);
    let forme = "";
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

export const isTrainer = (p: any): p is ITrainer => p.type === "trainer";
export const isPokemon = (p: any): p is IPokemon => p.type === "pokemon";

const choicesUsers: any = {};
const redisClients: any = {};

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
        // Logger.error(error);
    });
}

export function getChannel(client: Client, channelId: string) {
    return client.discordClient.channels.fetch(channelId);
}

/* export function searchItem(search: string) {
  if (search === "") {
    return Object.values(items).slice(0, 5);
  }
  const fuse = new Fuse(Object.values(items), {
    threshold: 0.6,
    keys: [
      "name",
    ],
  });
 
  return fuse.search(search).map(x => x.item).slice(0, 5);
} */

export function calculateFightExperience(win: boolean, dexId: number, isTraded: boolean, hasLuckyEgg: boolean, pokemonLevel: number) {
    const victoryFactor: number = win ? 1.15 : 0.65;
    return Math.round(1
        * (isTraded ? 1 : 1.5) // t 1.5 if it"s traded
        * (hasLuckyEgg ? 1.25 : 1) // e 1.5 if pokemon has lucky egg
        * getPokemon(dexId).base_experience
        * pokemonLevel
        / 7
        * victoryFactor);
}

export function makeImageData(pokemons: any) {
    if (pokemons === null) {
        return null;
    }
    const data: any = {
        pokemons: [],
    };
    pokemons.forEach((element: any) => {
        if (element === null) {
            return;
        }
        const pokemon = {
            name: "",
            level: 1,
            shiny: false,
        };
        const info = getPokemon(element.dexId, element.special);
        pokemon.name = info.displayName;
        pokemon.level = element.level;
        pokemon.shiny = element.shiny;
        data.pokemons.push(pokemon);
    });
    return Buffer.from(JSON.stringify(data)).toString("base64");
}

export {
    getRndInteger, upperCaseFirstLetter, calculateLevelExperience, getImage, formatPokemonForFight, sleep,
};
