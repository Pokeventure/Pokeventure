import { SlashCommandBuilder } from "discord.js";
import { sendInfo } from "../modules/pokedex";
import { getPokemonByNumber } from "../modules/database";
import { sendEmbed } from "../modules/utils";
import { Command, CommandContext } from "../types/command";

export const Info: Command = {
    commandName: "info",
    displayName: "Info",
    fullDescription: "COMMAND.INFO.FULL_DESCRIPTION",
    needPlayer: true,
    requireStart: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("info")
        .setDescription("Get info")
        .addIntegerOption((option) => option.setName("number").setDescription("Pokemon number").setRequired(false))
        .setDMPermission(true),
    async handler(context) {
        if (context.player === null) return;
        const id: number | null = context.interaction.options.getInteger("number");
        if (id === null) {
            if (context.player.selectedPokemon === null) {
                sendEmbed(context, { description: "You must select a Pokémon before.", author: context.user });
            } else {
                sendInfo(context.player.selectedPokemon, context);
            }
        } else {
            const pokemon = await getPokemonByNumber(context.player, id - 1);
            if (pokemon !== null) {
                sendInfo(pokemon, context);
            } else {
                sendEmbed(context, { description: "No Pokémon match this number. Check Pokémons number with `/box`.", author: context.user });
            }
        }
    },
};