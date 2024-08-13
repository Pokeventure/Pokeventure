import { Command, CommandContext } from 'command';
import { Player } from 'pokemon';
import { getPlayer } from '../modules/database';
import { getLocation, getLocations } from '../modules/world';
import { sendEmbed } from '../modules/utils';
import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageActionRow, MessageEmbed, MessageSelectMenu } from 'discord.js';

export const MapCommand: Command = {
  name: 'Map',
  keywords: ['map', 'm'],
  category: 'Bot',
  fullDesc: 'Display a list of locations to go to find Pokémons.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('map')
    .setDescription('Display different locations'),

  handler(context: CommandContext): any {
    const location = getLocation(context.player!.location);
    const locations = getLocations();
    let answer = `You are currently in ${location.name} (${location.id + 1})\n\nYou can travel to:\n`;
    let locationsForMenu: any = [];
    for (let i = 0; i < locations.length; i++) {
      const neighborLocation = getLocation(i);
      answer += `\`${i + 1}\`. ${neighborLocation.name}\n`;
      locationsForMenu.push({
        label: neighborLocation.name,
        value: i.toString(),
      });
    }
    let embed = new MessageEmbed();
    embed.setDescription(answer);
    let components: MessageActionRow = new MessageActionRow();
    components.addComponents(new MessageSelectMenu()
      .setCustomId('move')
      .setPlaceholder('Select a location to move to')
      .addOptions(locationsForMenu));
    context.commandInterction.editReply({
      embeds: [embed],
      components: [components],
    });
  },
};
