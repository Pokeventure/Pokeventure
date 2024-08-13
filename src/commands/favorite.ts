import { legendaries, mythicals, ultrabeasts } from "../../data/pokemons";
import { SlashCommandBuilder } from "discord.js";
import { Pokemon } from "../models/pokemon";
import { sendEmbed } from "../modules/utils";
import { findPokemon, getPokemon } from "../modules/pokedex";
import { Command } from "../types/command";
import { FilterQuery, Types } from "mongoose";
import { IPokemon } from "../types/pokemon";

export const Favorite: Command = {
    commandName: "favorite",
    displayName: "Favorite",
    fullDescription: "Command to protect your Pokémons from being released.\nNote: Shinies and Pokémons from raid are automatically set as favorite.\n\nUsage: `%PREFIX%favorite [IDs|all] <rarity|mythical|ultrabeast|legendary>`\nExample: `%PREFIX%favorite 3,15,45` will add Pokémons #3, #15 and #45 to your favorite Pokémons.\nExample: `%PREFIX%favorite all` will add all your Pokémons to your favorite Pokémons.\nExample: `%PREFIX%favorite all LR` will add all your LR Pokémons to your favorite Pokémons.\nExample: `%PREFIX%favorite all shiny` will add all your Shiny Pokémons to your favorite Pokémons.",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("favorite")
        .setDescription("Add your Pokémons to favorite to protect them from being released")
        .addBooleanOption(option => option.setName("all").setDescription("Favorite all Pokémon"))
        .addBooleanOption(option => option.setName("mythical").setDescription("Favorite mythicals"))
        .addBooleanOption(option => option.setName("shiny").setDescription("Favorite shinies"))
        .addBooleanOption(option => option.setName("ultrabeast").setDescription("Favorite ultreabeast"))
        .addBooleanOption(option => option.setName("legendary").setDescription("Favorite legendaries"))
        .addStringOption(option => option.setName("pokemon").setDescription("Favorite Pokémon per name").setAutocomplete(true))
        .addStringOption(option => option.setName("rarity").setDescription("Favorite Pokemon by rarity")
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
        .addStringOption(option => option.setName("id").setDescription("Pokémon ID (IDs can be separated by , )"))
        .setDMPermission(true),

    async handler(context) {
        let ids: any[] = [];
        if (context.interaction.options.getBoolean("all")) {
            let filter: any = {};
            filter.owner = context.user.id;
            Pokemon.updateMany({ owner: context.user.id }, { $set: { fav: true } }).exec().then(res => {
                sendEmbed(context, { description: `${res.matchedCount} Pokémons have been set as favorite.`, image: null, thumbnail: null, author: context.user });
            });
        } else {
            let filter: FilterQuery<IPokemon> = {};
            filter.owner = context.user.id;
            if (context.interaction.options.getString("rarity") === "n") {
                filter.rarity = 0;
            } else if (context.interaction.options.getString("rarity") === "u") {
                filter.rarity = 1;
            } else if (context.interaction.options.getString("rarity") === "r") {
                filter.rarity = 2;
            } else if (context.interaction.options.getString("rarity") === "sr") {
                filter.rarity = 3;
            } else if (context.interaction.options.getString("rarity") === "ur") {
                filter.rarity = 4;
            } else if (context.interaction.options.getString("rarity") === "lr") {
                filter.rarity = 5;
            }

            if (context.interaction.options.getBoolean("shiny")) {
                filter.shiny = true;
            }

            if (context.interaction.options.getString("pokemon") !== null) {
                let searchPokemon: any[] = findPokemon(context.interaction.options.getString("pokemon", true).toLowerCase().trim());
                if (searchPokemon.length === 0) {
                    let pokemon = getPokemon(context.interaction.options.getString("pokemon", true).toLowerCase().trim());
                    if (pokemon !== undefined) {
                        searchPokemon = [pokemon];
                    }
                }
                if (searchPokemon.length > 0) {
                    let id = searchPokemon.map((pkm: any) => pkm.dexId)[0];
                    filter.dexId = id;
                }
            }

            let idsToFilter: any[] = [];
            if (context.interaction.options.getBoolean("mythical")) {
                idsToFilter = idsToFilter.concat(mythicals);
            }
            if (context.interaction.options.getBoolean("legendary")) {
                idsToFilter = idsToFilter.concat(legendaries);
            }
            if (context.interaction.options.getBoolean("ultrabeast")) {
                idsToFilter = idsToFilter.concat(ultrabeasts);
            }
            if (idsToFilter.length > 0) {
                filter.dexId = { $in: idsToFilter };
            }
            ids = (context.interaction.options.getString("id") ?? "").replace(/\s/g, "").split(",");
            let pokemons = await Pokemon.find({ owner: context.user.id }, {}, { sort: context.player?.sort }).exec();
            const idsToFav: Types.ObjectId[] = [];
            pokemons.forEach((pokemon, index) => {
                if (ids.includes((index + 1).toString())) {
                    idsToFav.push(pokemon._id);
                }
            });
            if (idsToFav.length > 0) {
                filter._id = { $in: idsToFav };
            }

            if (Object.entries(filter).length === 1) {
                filter.owner = "-1";
            }
            Pokemon.updateMany(filter, { $set: { fav: true } }).exec().then(res => {
                sendEmbed(context, { description: `${res.matchedCount} Pokémons have been set as favorite.` });
            });
        }
    }
}
