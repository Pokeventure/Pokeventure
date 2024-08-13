import { Command, CommandContext } from "../types/command";
import { SlashCommandBuilder, ButtonStyle } from 'discord.js';
import { generateEncounter } from "../modules/world";
import { getImage, sendEmbed } from "../modules/utils";
import { getPokemon } from "../modules/pokedex";
import { getMappedTranslation } from "../modules/i18n";
import { incrementQuest } from "../modules/quests";
import { addStats } from "../modules/database";

export const Wild: Command = {
    commandName: 'wild',
    displayName: 'Wild',
    fullDescription: 'Find a wild Pokémon in your current location. Once it has appeared you can catch it with `%PREFIX%catch` command or fight it with command `%PREFIX%fight` to increase your chances to catch it but if your Pokémon faints, wild Pokémon will flee.\n\nExample: `%PREFIX%fight`',
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName('wild')
        .setNameLocalizations(getMappedTranslation('COMMAND.WILD.NAME'))
        .setDescription('Find a wild Pokémon in your current location.')
        .setDescriptionLocalizations(getMappedTranslation('COMMAND.WILD.DESCRIPTION')),

    async handler(context: CommandContext) {
        if (context.player === null) return;
        const { selectedPokemon } = context.player;
        const generatedEncounter = generateEncounter(context.player.location, selectedPokemon.level);
        if (generatedEncounter == null) {
            return sendEmbed(context, { description: `You didn't find any Pokémon... Try again!` });
        }

        context.client.setWildPokemon(context.user.id, generatedEncounter);

        await sendEmbed(context, {
            description: `A wild ${getPokemon(generatedEncounter?.dexId).displayName} has appeared!\nLevel ${generatedEncounter.level}`,
            image: getImage(generatedEncounter, true, generatedEncounter.shiny, generatedEncounter.special),
            footer: { text: `Fight it by using /fight or catch it with /catch` }
        }, [{
            customId: 'fight',
            label: 'Fight',
            emoji: '⚔️',
            style: ButtonStyle.Primary
        }]);
        await incrementQuest(context, context.user, 'tutorialWild', 1);
        addStats(context.user.id, 'wild', 1);
    }
} 