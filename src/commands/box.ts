import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import items, { getItemByHoldname } from "../../data/items";
import { legendaries, mythicals, ultrabeasts } from "../../data/pokemons";
import { Pokemon } from "../models/pokemon";
import { eventEmoji, getPokemon, rarity, rarityText } from "../modules/pokedex";
import { pagination } from "../modules/utils";
import { Command, CommandContext } from "../types/command";

export const Box: Command = {
    commandName: "box",
    displayName: "Box",
    fullDescription: "COMMAND.BOX.DESCRIPTION",
    needPlayer: true,
    requireStart: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("box")
        .setDescription("See all your Pokémon.")
        .addBooleanOption(option => option.setName("mythical").setDescription("Select mythicals"))
        .addBooleanOption(option => option.setName("nickname").setDescription("Select that have a nickname"))
        .addBooleanOption(option => option.setName("shiny").setDescription("Select shinies"))
        .addBooleanOption(option => option.setName("ultrabeast").setDescription("Select ultreabeast"))
        .addBooleanOption(option => option.setName("favorite").setDescription("Select favorite Pokémon"))
        .addBooleanOption(option => option.setName("traded").setDescription("Select traded Pokémon"))
        .addBooleanOption(option => option.setName("legendary").setDescription("Select legendaries"))
        .addBooleanOption(option => option.setName("item").setDescription("Select Pokémon that hold item"))
        .addBooleanOption(option => option.setName("mega").setDescription("Select Mega Pokémon"))
        .addStringOption(option => option.setName("event").setDescription("Select Pokémon from an event")
            .addChoices({
                name: "Birthday",
                value: "bday"
            }, {
                name: "Halloween",
                value: "halloween",
            }, {
                name: "Xmas",
                value: "xmas"
            })
        )
        .addStringOption(option => option.setName("rarity").setDescription("Select Pokémon by rarity")
            .addChoices({
                name: "N",
                value: "n"
            }, {
                name: "U",
                value: "u"
            }, {
                name: "R",
                value: "r"
            }, {
                name: "SR",
                value: "sr"
            }, {
                name: "UR",
                value: "ur"
            }, {
                name: "LR",
                value: "lr"
            })
        )
        .addStringOption(option => option.setName("name").setDescription("Filter by name"))
        .addStringOption(option => option.setName("type").setDescription("Filter by type"))
        .setDMPermission(true),
    async handler(context: CommandContext) {
        let pokemons = await Pokemon.find({ owner: context.user.id }, {}, { sort: context.player?.sort ?? "_ID_ASC" }).exec();
        pokemons.forEach((pokemon, index) => {
            pokemon.number = index + 1;
        });

        if (context.interaction.options.getBoolean("mythical")) {
            pokemons = pokemons.filter((x) => mythicals.includes(x.dexId));
        } else if (context.interaction.options.getBoolean("legendary")) {
            pokemons = pokemons.filter((x) => legendaries.includes(x.dexId));
        } else if (context.interaction.options.getBoolean("ultrabeast")) {
            pokemons = pokemons.filter((x) => ultrabeasts.includes(x.dexId));
        }
        if (context.interaction.options.getBoolean("nickname")) {
            pokemons = pokemons.filter((x) => x.nickname !== null);
        }
        if (context.interaction.options.getBoolean("shiny")) {
            pokemons = pokemons.filter((x) => x.shiny === true);
        }
        if (context.interaction.options.getBoolean("shiny") === false) {
            pokemons = pokemons.filter((x) => x.shiny === false);
        }
        if (context.interaction.options.getBoolean("favorite")) {
            pokemons = pokemons.filter((x) => x.fav);
        } else if (context.interaction.options.getBoolean("favorite") === false) {
            pokemons = pokemons.filter((x) => !x.fav);
        }
        if (context.interaction.options.getBoolean("traded")) {
            pokemons = pokemons.filter((x) => x.owner !== x.firstOwner);
        } else if (context.interaction.options.getBoolean("traded") === false) {
            pokemons = pokemons.filter((x) => x.owner === x.firstOwner);
        }
        if (context.interaction.options.getString("rarity") !== null) {
            pokemons = pokemons.filter((x) => x.rarity === rarityText.indexOf(context.interaction.options.getString("rarity", true).toUpperCase()));
        }
        if (context.interaction.options.getBoolean("item")) {
            pokemons = pokemons.filter((x: any) => x.item !== null);
        }
        if (context.interaction.options.getBoolean("mega")) {
            pokemons = pokemons.filter((x: any) => (x.special === "mega" || x.special === "megax" || x.special === "megay"));
        }
        if (context.interaction.options.getString("event") !== null) {
            pokemons = pokemons.filter((x: any) => (x.forme === context.interaction.options.getString("event")));
        }
        /* if (context.interaction.options.getString("name") !== null) {
            let pokemonName = context.interaction.options.getString("name", true).toLowerCase().trim();
            let searchPokemon = findPokemon(pokemonName);
            if (searchPokemon.length > 1) {
                searchPokemon = searchPokemon.filter(x => x.name === pokemonName);
            }
            if (searchPokemon !== undefined && searchPokemon.length > 0) {
                let id = searchPokemon.map((pkm: any) => pkm.dexId)[0];
                pokemons = pokemons.filter((x: any) => x.dexId === id);
            }
        }

        if (context.interaction.options.getString("type") !== null) {
            const typesFilter = types.filter((x) => x.includes(context.interaction.options.getString("type", true).toLowerCase()));
            if (typesFilter.length > 0) {
                for (let i = 0; i < typesFilter.length; i++) {
                    pokemons = pokemons.filter((x: any) => getPokemon(x.dexId, x.special).types.includes(upperCaseFirstLetter(typesFilter[i])));
                }
            }
        } */

        let pages: EmbedBuilder[] = [];
        pages.push(new EmbedBuilder()
            .setTitle("Pokemons")
            .setDescription(`You have ${pokemons.length} Pokemons`)
        );
        let pokemonCounter = 0;
        let currentPage = 0;
        let pokemonList = ["", ""];
        pokemons.forEach(pokemon => {
            const column = pokemonCounter % 10 > 4 ? 1 : 0;
            pokemonList[column] += `**\`${pokemon.number}.\` ${rarity[pokemon.rarity]} `;
            pokemonList[column] += pokemon.nickname ? pokemon.nickname : getPokemon(pokemon.dexId, pokemon.special).displayName;
            if (pokemon.shiny) { pokemonList[column] += " ✨"; }
            if (pokemon.fav) { pokemonList[column] += " ❤️"; }
            if (pokemon.forme) { pokemonList[column] += ` ${eventEmoji[pokemon.forme] ?? ""}`; }
            let item = "";
            if (pokemon.item) {
                let itemData = getItemByHoldname(pokemon.item);
                if (itemData !== null) {
                    item = itemData.emoji;
                }
            }
            pokemonList[column] += `**\n${item} Level ${pokemon.level}\n\n`;
            pokemonCounter++;

            if (pokemonCounter >= 10) {
                if (pokemonList[0].length > 0) { pages[currentPage].addFields({ name: "\u2800", value: `${pokemonList[0]}`, inline: true }); }
                if (pokemonList[1].length > 0) { pages[currentPage].addFields({ name: "\u2800", value: `${pokemonList[1]}`, inline: true }); }
                let newPage = new EmbedBuilder()
                    .setTitle("Pokemons")
                    .setDescription(`You have ${pokemons.length} Pokemons`);
                pages.push(newPage);
                pokemonList = ["", ""];
                currentPage++;
                pokemonCounter = 0;
            }
        });

        if (pokemonList[0].length > 0 && pokemonList[1].length > 0) {
            pages[currentPage].addFields({ name: "\u2800", value: `${pokemonList[0]}`, inline: true });
            pages[currentPage].addFields({ name: "\u2800", value: `${pokemonList[1]}`, inline: true });
        }
        else if (pokemonList[0].length > 0) {
            pages[currentPage].addFields({ name: "\u2800", value: `${pokemonList[0]}`, inline: true });
        }
        else if (currentPage > 0) {
            pages.pop();
        }

        pagination(context, pages);
    },
}