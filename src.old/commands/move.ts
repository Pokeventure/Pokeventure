import { Command, CommandContext } from 'command';
import { Player } from 'pokemon';
import { sendEmbed } from '../modules/utils';
import { getPlayer } from '../modules/database';
import { getLocations, move, getLocation } from '../modules/world';
import { incrementQuest } from '../modules/quests';
import { SlashCommandBuilder } from '@discordjs/builders';
import Logger from '../modules/logger';

export const Move: Command = {
  name: 'Move',
  keywords: ['move', 'mv'],
  category: 'Bot',
  fullDesc: 'Command to travel to a given location ID. To see all existing locations, use `%PREFIX%map` command.\n\nExample `%PREFIX%move 4` to move to location with ID 4.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('move')
    .setDescription('Move to a different locations')
    .addIntegerOption(
      (input) => input
        .setName('location')
        .setDescription('Location where you want to move')
        .setRequired(true)),

  handler(context: CommandContext): any {
    let destination = 0;
    if (context.interaction.isSelectMenu()) {
      destination = parseInt(context.selectMenuInteraction.values[0]);
    } else {
      destination = context.commandInterction.options.getInteger('location', true) - 1;
    }
    if (destination >= 0) {
      const locations = getLocations();
      if (locations[destination] !== undefined) {
        move(context.user.id, destination).then(async () => {
          const newLocation = getLocation(destination);
          await sendEmbed({ context, message: `You moved to ${newLocation.name}`, author: context.user });
          incrementQuest(context, context.user, 'tutorialMove', 1);
        }).catch((error) => {
          Logger.error(error);
        });
      } else {
        sendEmbed({ context, message: 'Use a valid destination. Find your destination with `%PREFIX%map` and then use `%PREFIX%move <destination>` (i.e. `%PREFIX%move 2`)' });
      }
    } else {
      const location = getLocation(context.player!.location);
      const locations = getLocations();
      let answer = `You are currently in ${location.name} (${location.id + 1})\n\nYou can travel to:\n`;
      for (let i = 0; i < locations.length; i++) {
        const neighborLocation = getLocation(i);
        answer += `\`${i + 1}\`. ${neighborLocation.name}\n`;
      }
      answer += '\nTo move, use `%PREFIX%move <destination>` (i.e. `%PREFIX%move 2`)';
      sendEmbed({ context, message: answer, author: context.user });
    }
  },
};
