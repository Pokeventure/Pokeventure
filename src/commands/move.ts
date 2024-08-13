import { Command, CommandContext } from "../types/command";
import { SlashCommandBuilder } from 'discord.js';
import { getLocation, getLocations } from "../modules/world";
import { sendEmbed } from "../modules/utils";
import { getMappedTranslation } from "../modules/i18n";
import { incrementQuest } from "../modules/quests";

export const Move: Command = {
    displayName: 'Move',
    commandName: 'move',
    fullDescription: 'COMMAND.MOVE.FULL_DESCRIPTION',
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName('move')
        .setNameLocalizations(getMappedTranslation('COMMAND.MOVE.NAME'))
        .setDescription('Move to a different locations')
        .setDescriptionLocalizations(getMappedTranslation('COMMAND.MOVE.DESCRIPTION'))
        .addIntegerOption(
            (input) => input
                .setName('location')
                .setDescription('Location where you want to move')
                .setRequired(true))
        .setDMPermission(true),

    handler(context: CommandContext) {
        if (context.player === null) return;

        let destination = context.interaction.options.getInteger('location', true) - 1;
        if (destination >= 0) {
            const locations = getLocations();
            if (locations[destination] !== undefined) {
                context.player.location = destination;
                context.player.save().then(async () => {
                    const newLocation = getLocation(destination);
                    await sendEmbed(context, { description: `You moved to ${newLocation.name}` });
                    incrementQuest(context, context.user, 'tutorialMove', 1);
                });
            } else {
                sendEmbed(context, { description: 'Use a valid destination. Find your destination with `%PREFIX%map` and then use `%PREFIX%move <destination>` (i.e. `%PREFIX%move 2`)' });
            }
        }
    },
};
