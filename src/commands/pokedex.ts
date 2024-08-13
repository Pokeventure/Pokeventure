import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getPokemon, immune, resist, searchPokemon, typeEmoji, weakness } from "../modules/pokedex";
import { Command, CommandContext } from "../types/command";
import { Pokedex as PokedexModel } from "../models/pokedex";
import { Pokedex as PokedexImport } from "../../simulator/.data-dist/pokedex";
import { getImage, pagination, upperCaseFirstLetter } from "../modules/utils";
import { PokemonSpecies } from "../types/pokemon";
import { countPokemons } from "../modules/database";

const PokedexData: {
    [name: string]: {
        num: number,
        name: string,
        baseStats: { hp: number, atk: number, def: number, spa: number, spd: number, spe: number },
        abilities: {
            [slot: string]: string
        }
    }
} = PokedexImport;

async function sendPokedex(context: CommandContext, pokemon: PokemonSpecies, shiny: boolean) {
    let count: string | null | number = await context.client.redisClient.get(`pokedex_count_${shiny}_${pokemon.dexId}_${pokemon.forme}`);
    if (count === null) {
        count = await countPokemons(pokemon.dexId, pokemon.forme, shiny);
        // Cache for 60 minutes
        context.client.redisClient.set(`pokedex_count_${shiny}_${pokemon.dexId}_${pokemon.forme}`, count, {
            "EX": 3600
        });
    } else {
        count = parseInt(count);
    }
    const owned = await countPokemons(pokemon.dexId, pokemon.forme, shiny, context.user.id);

    const embed = new EmbedBuilder();

    embed.addFields({
        name: "**Types**",
        value: `${typeEmoji[pokemon.types[0]]} ${pokemon.types[0]} ${pokemon.types[1] !== undefined ? `\n${typeEmoji[pokemon.types[1]]} ${pokemon.types[1]}` : ""}`,
        inline: true
    });
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
    embed.addFields({
        name: "**Weak against**",
        value: `${weaknesses.join("\n")}`,
        inline: true
    });

    if (immunities.length > 0) {
        embed.addFields({
            name: "**Immune to**",
            value: `${immunities.join("\n")}`,
            inline: true
        });
    } else {
        embed.addFields({
            name: "\u200B",
            value: "\u200B"
        });
    }
    const abilites = Object.entries(PokedexData[pokemon.name].abilities).map((x) => x[1]);

    embed.addFields({
        name: "**Height**",
        value: `${pokemon.height} m`,
        inline: true
    }, {
        name: "**Weight**",
        value: `${pokemon.weight} kg`,
        inline: true
    }, {
        name: "**Abilities**",
        value: abilites.join("\n"),
        inline: true
    }, {
        name: "**Count**",
        value: `${count}`,
        inline: true
    }, {
        name: "**Owned**",
        value: `${owned}`,
        inline: true
    });

    if (pokemon.location !== undefined) {
        embed.addFields({
            name: "Location",
            value: pokemon.location,
            inline: true
        });
    } else {
        embed.addFields({
            name: "\u200B",
            value: "\u200B"
        });
    }

    const stats = PokedexData[pokemon.name].baseStats;
    embed.addFields({
        name: "**Base Stats**",
        value: `**HP**: ${stats.hp} | **ATK**: ${stats.atk} | **DEF**: ${stats.def} | **Sp. ATK**: ${stats.spa} | **Sp. DEF**: ${stats.spd} | **SPE**: ${stats.spe}`
    });

    let textEvolution = "";
    pokemon.evolutions.forEach((evo) => {
        switch (evo.condition) {
            case "level":
                textEvolution += `Evolves into ${evo.name} at level ${evo.level} ${evo.genderCondition !== undefined ? `${evo.genderCondition === "M" ? "if Pokémon is ♂" : "if Pokémon is ♀"}` : ""}\n`;
                break;
            case "useItem":
                textEvolution += `Evolves into ${evo.name} by using a ${evo.item} ${evo.genderCondition !== undefined ? `${evo.genderCondition === "M" ? "if Pokémon is ♂" : "if Pokémon is ♀"}` : ""}\n`;
                break;
            case "trade":
                textEvolution += `Evolves into ${evo.name} when traded\n`;
                break;
            case "levelMove":
                textEvolution += `Evolves into ${evo.name} when leveling up and knowing ${evo.move}\n`;
                break;
            case "moveType":
                textEvolution += `Evolves into ${evo.name} when leveling up and knowing a move of ${evo.type} type\n`;
                break;
            case "levelRandom":
                textEvolution += `Can evolve into ${evo.name} at level ${evo.level}\n`;
                break;
            case "levelZone":
                textEvolution += `Evolve into ${evo.name} at level ${evo.level} in a Hisuian location\n`;
                break;
            case "levelForm":
                textEvolution += `Evolves into ${evo.name} at level ${evo.level}\n`;
                break;
        }
    });
    if (textEvolution.length > 0) {
        embed.setFooter({ text: textEvolution });
    }
    embed.setTitle(`${upperCaseFirstLetter(pokemon.displayName)} #${pokemon.dexId}`);
    embed.setThumbnail(getImage(pokemon, true, shiny, pokemon.forme));

    context.interaction.editReply({ embeds: [embed] });
}

export const Pokedex: Command = {
    commandName: "pokedex",
    displayName: "Pokedex",
    fullDescription: "Use the Pokédex to learn more about the Pokémon you want. It will diplays the Pokémon type, its height and its weight. You will be able to see all the Pokémon you caught.\n\nUsage: `%PREFIX%pokedex [id|name]`\nUsage: `%PREFIX%pokedex`\nUsage: `%PREFIX%pokedex update` to update your Pokédex data.\n\nExample: `%PREFIX%pokedex 25` to see the Pokédex entry for the Pokémon with the number 25\nExample: `%PREFIX%pokedex pikachu` to see Pokédex entry for Pikachu.",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("pokedex")
        .setDescription("Use the Pokédex to learn more about the Pokémon you want.")
        .addStringOption(option => option.setName("pokemon").setDescription("Pokémon name").setAutocomplete(true))
        .addIntegerOption(option => option.setName("id").setDescription("Pokémon pokedex number"))
        .addBooleanOption(option => option.setName("shiny").setDescription("Shiny Pokémon"))
        .setDMPermission(true),
    handler: async (context: CommandContext) => {
        /* TODO if (context.args.includes("update")) {
          const can = await context.client.redis.get(`pokedex_${context.user.id}`);
          if (can !== null) {
            sendEmbed({ context, message: "You can\"t run an update of your Pokédex yet." });
            return;
          }
          context.client.redis.set(`pokedex_${context.user.id}`, "1", "EX", 60 * 60).catch(() => { });
          getPokemons(context.user.id, context.player?.sort ?? "_ID_ASC").then((res) => {
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
              sendEmbed({ context, message: "Pokédex data have been updated.", image: null, thumbnail: null, author: context.user });
              resolve({});
            }).catch((error) => {
              reject(error);
            });
          }).catch((error) => {
            reject(error);
          });
        }*/
        if (context.interaction.options.getString("pokemon") !== null || context.interaction.options.getInteger("id") !== null) {
            let shiny = false;
            if (context.interaction.options.getBoolean("shiny")) { shiny = true; }
            let pokemon = null;
            if (context.interaction.options.getInteger("id") !== null) {
                pokemon = getPokemon(context.interaction.options.getInteger("id", true));
            } else {
                pokemon = getPokemon(context.interaction.options.getString("pokemon", true).toLowerCase());
            }
            if (pokemon === null) {
                pokemon = Object.entries(PokedexData).find((x: any) => x[1].name.toLowerCase().includes(context.interaction.options.getString("pokemon", true)));
                if (pokemon) {
                    pokemon = getPokemon((<any>pokemon[1]).num, (<any>pokemon[1]).forme);
                } else {
                    pokemon = null;
                }
            }
            if (pokemon !== null && pokemon !== undefined) {
                sendPokedex(context, pokemon, shiny);
            } else {
                context.interaction.editReply("No Pokémon match.");
            }
        } else {
            let pokedex = await PokedexModel.findOne({ discord_id: context.user.id }).exec();
            const pages: any[] = [];
            let pokemonCounter = 0;

            let embed = new EmbedBuilder();
            embed.setTitle("Pokédex");
            embed.setDescription(`<:pokeball:741809195338432612> Pokémons caught: ${pokedex?.count ?? 0}\n<:star:804155523779395584> Shiny caught: ${pokedex?.shiny ?? 0}`);

            let text = ["", ""];
            for (let i = 0; i < Object.entries(PokedexData).length; i++) {
                const pokedexData = Object.entries(PokedexData)[i];
                if (pokedexData[1].num <= 0) { continue; }
                if (pokedexData[0].endsWith("totem")) { continue; }
                let caught = false;
                let shiny = false;
                if (pokedex !== null) {
                    if (pokedex.data[pokedexData[0]] !== undefined) {
                        if (pokedex.data[pokedexData[0]].caught !== undefined) {
                            caught = true;
                        }
                        if (pokedex.data[pokedexData[0]].shiny !== undefined) {
                            shiny = true;
                        }
                    }
                }
                let column = pokemonCounter % 20 >= 10 ? 1 : 0;
                text[column] += `${pokedexData[1].num}. ${caught ? "<:pokeball:741809195338432612>" : "<:ballblack:804326307281502208>"}${shiny ? "<:star:804155523779395584>" : "<:starblack:804326307475095572>"} ${pokedexData[1].name}\n`;
                pokemonCounter++;
                if (pokemonCounter >= 20) {
                    embed.addFields({
                        name: "\u2800",
                        value: text[0],
                        inline: true
                    }, {
                        name: "\u2800",
                        value: text[1],
                        inline: true
                    });
                    pages.push(embed);
                    text = ["", ""];

                    embed = new EmbedBuilder();
                    embed.setTitle("Pokédex");
                    embed.setDescription(`<:pokeball:741809195338432612> Pokémons caught: ${pokedex?.count ?? 0}\n<:star:804155523779395584> Shiny caught: ${pokedex?.shiny ?? 0}`);

                    pokemonCounter = 0;
                }
            }
            if (pokemonCounter > 0) {
                embed.addFields({
                    name: "\u2800",
                    value: text[0],
                    inline: true
                });
                if (pokemonCounter >= 15) {
                    embed.addFields({
                        name: "\u2800",
                        value: text[1],
                        inline: true
                    });
                }
                pages.push(embed);
            }
            pagination(context, pages);
        }
    },
    autocompleteHandler(client, interaction) {
        let result = searchPokemon(interaction.options.getFocused()).map((item: any) => {
            return {
                value: item.name,
                name: item.displayName,
            };
        });
        interaction.respond(result);
    },
};
