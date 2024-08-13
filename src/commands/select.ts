import { SlashCommandBuilder } from "discord.js";
import { Pokemon } from "../models/pokemon";
import { getPokemonByNumber } from "../modules/database";
import { getPokemon } from "../modules/pokedex";
import { getImage, sendEmbed } from "../modules/utils";
import { Command, CommandContext } from "../types/command";

export const Select: Command = {
    commandName: 'select',
    displayName: 'Select',
    fullDescription: 'Select your pokemon',
    needPlayer: true,
    requireStart: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName('select')
        .setDescription('Select one of your Pokémon to use it.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('id')
                .setDescription('Select a Pokémon by ID')
                .addIntegerOption(option => option.setName('number').setDescription('Pokémon number').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nickname')
                .setDescription('Select a Pokémon by nickname')
                .addStringOption(option => option.setName('nickname').setDescription('Pokémon nickname').setRequired(true)))
        .setDMPermission(true),
    async handler(context: CommandContext) {
        if (context.player === null) return;
        const selectedNumber: number | null = context.interaction.options.getInteger('number');
        const selectedNickname: string | null = context.interaction.options.getString('nickname');
        if (selectedNickname !== null) {
            let pokemon = await Pokemon.findOne({ owner: context.user.id, nickname: selectedNickname }).exec();
            if (pokemon === null) {
                sendEmbed(context, { description: 'None of your Pokemon match this nickname. You can find your Pokémon with `/box`.' });
            } else {
                context.player.selectedPokemon = pokemon;
                context.player.save();
                sendEmbed(context, { description: `You selected ${getPokemon(pokemon.dexId).displayName} (lvl. ${pokemon.level})`, image: getImage(pokemon, true, pokemon.shiny, pokemon.special), author: context.user });
            }
        } else if (selectedNumber !== null) {
            let pokemon = await getPokemonByNumber(context.player, selectedNumber - 1);
            if (pokemon === null) {
                sendEmbed(context, { description: 'None of your pokemon match this ID. You can find your Pokémon ID with `/box`.' });
            } else {
                context.player.selectedPokemon = pokemon;
                context.player.save();
                sendEmbed(context, { description: `You selected ${getPokemon(pokemon.dexId).displayName} (lvl. ${pokemon.level})`, image: getImage(pokemon, true, pokemon.shiny, pokemon.special), author: context.user });
            }
        }
    },
}