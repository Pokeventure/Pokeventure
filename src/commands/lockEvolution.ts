import { SlashCommandBuilder } from "discord.js";
import { getPokemon } from "../modules/pokedex";
import { sendEmbed } from "../modules/utils";
import { Command, CommandContext } from "../types/command";


export const LockEvolution: Command = {
    commandName: "lock-evolution",
    displayName: "Lock Evolution",
    fullDescription: "Disable/Enable evolution on your selected Pokémon.",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("lock-evolution")
        .setDescription("Disable/Enable evolution on your selected Pokémon."),
    handler: (context: CommandContext) => {
        let pokemon = context.player?.selectedPokemon;
        if(!pokemon) {
            return sendEmbed(context, {description: "You must select a Pokémon before."});
        }
        let pokemonData = getPokemon(pokemon.dexId, pokemon.special);
        pokemon.evolutionLock = !pokemon.evolutionLock;
        pokemon.save();
        if(pokemon.evolutionLock) {
            sendEmbed(context, {description: `Your ${pokemonData.displayName} is now not able to evolve.`});
        } else {
            sendEmbed(context, {description: `Your ${pokemonData.displayName} is now able to evolve.`});
        }
    }
}