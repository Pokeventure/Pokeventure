import { SlashCommandBuilder } from "discord.js";
import items from "../../data/items";
import { Inventory } from "../models/inventory";
import { addStats, createPokemon } from "../modules/database";
import { genderEmoji, getPokemon, rarity } from "../modules/pokedex";
import { getImage, sendEmbed } from "../modules/utils";
import { ButtonContext, Command, CommandContext } from "../types/command";
import { IPokemon } from "../types/pokemon";

export const Catch: Command = {
    commandName: "catch",
    displayName: "Catch",
    fullDescription: "Catch description",
    needPlayer: true,
    requireStart: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("catch")
        .setDescription("Catch pokemon")
        .addSubcommand(subcommand =>
            subcommand
                .setName("pokeball")
                .setDescription("Use a Pokeball"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("greatball")
                .setDescription("Use a Greatball"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("ultraball")
                .setDescription("Use a Ultraball"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("masterball")
                .setDescription("Use a Masterball"))
        .setDMPermission(true),
    handler(context: CommandContext) {
        catchPokemon(context, pokeballsToId[context.interaction.options.getSubcommand(true)]);
    },
    hasButtonHandler: true,
    buttonHandler(context: ButtonContext) {

    },
}

const pokeballsToId: {
    [pokebalballName: string]: number
} = {
    "pokeball": 0,
    "greatball": 1,
    "ultraball": 2,
    "masterball": 3
};


const idToPokeball: {
    [pokebalballName: number]: string
} = {
    0: "pokeball",
    1: "greatball",
    2: "ultraball",
    3: "masterball"
};

const ballChances: {
    [pokebalballId: string]: number
} = {
    "0": 20,
    "1": 33,
    "2": 40,
    "3": 1000
};
const ballNames: string[] = ["Pokeball", "Greatball", "Ultraball", "Masterball"];

async function catchPokemon(context: CommandContext | ButtonContext, pokeballId: number) {
    // Check inventory for balls
    let inventory = await Inventory.findOne({ discord_id: context.user.id }).exec();
    if (inventory === null
        || inventory.inventory === undefined
        || inventory.inventory[pokeballId] === undefined
        || inventory.inventory[pokeballId].quantity <= 0
    ) {
        return sendEmbed(context, { description: `You don"t have any ${items[pokeballId].name}. You can buy some or wait for your reward.` })
    }
    let randomRoll = context.client.chance.integer({ min: 0, max: 100 });
    // Check raid tries
    let raidTries = await context.client.getRaidTries(context.user.id);
    let wildPokemon = await context.client.getWildPokemon(context.user.id);
    let faintedPokemon = await context.client.getFaintedPokemon(context.user.id);
    let raidPokemon = await context.client.getRaidPokemon();
    if (raidTries === 0 && wildPokemon === null && faintedPokemon === null) {
        return sendEmbed(context, {
            description: "You are not facing any Pokémon",
            author: context.user
        });
    }
    // Catch raid
    // if(raidTries > 0 && raidPokemon !== null)
    let caught = false;
    let pokemon: IPokemon;
    if (raidTries > 0 && raidPokemon !== null) {
        caught = randomRoll < ballChances[pokeballId];
        pokemon = raidPokemon;
        if (caught) {
            context.client.setRaidTries(context.user.id, 0);
        } else {
            context.client.setRaidTries(context.user.id, raidTries - 1);
        }
    } else if (wildPokemon !== null) {
        caught = randomRoll < ballChances[pokeballId];
        pokemon = wildPokemon;
        context.client.deleteWildPokemon(context.user.id);
    } else if (faintedPokemon !== null) {
        caught = randomRoll < ballChances[pokeballId] * 2;
        pokemon = faintedPokemon;
        context.client.deleteFaintedPokemon(context.user.id);
    } else {
        return;
    }
    inventory.inventory[pokeballId].quantity--;
    inventory.save();
    addStats(context.user.id, idToPokeball[pokeballId], 1);

    if (caught) {
        createPokemon(context.user.id, {
            ...pokemon
        });
        return sendEmbed(context, {
            description: `You throw a ${ballNames[pokeballId]} to catch the Pokémon.\nYou caught a ${rarity[pokemon.rarity]} ${getPokemon(pokemon.dexId, pokemon.special).displayName} ${pokemon.shiny ? "✨" : ""} ${genderEmoji[pokemon.gender]} (Lvl. ${pokemon.level})!`,
            image: getImage(pokemon, true, pokemon.shiny, pokemon.special),
            author: context.user
        });
    } else {
        return sendEmbed(context, {
            description: `You throw a ${ballNames[pokeballId]} to catch ${getPokemon(pokemon.dexId, pokemon.special).displayName}. The pokemon got out of it and escaped.`,
            author: context.user
        });
    }
}