import { SlashCommandBuilder } from "discord.js";
import { sendEmbed } from "../modules/utils";
import { getLocation, getLocations } from "../modules/world";
import { Command } from "../types/command";

export const Map: Command = {
    commandName: "map",
    displayName: "Map",
    fullDescription: "Display a list of locations to go to find Pokémons.",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("map")
        .setDescription("Display different locations"),
    handler(context) {
        if (!context.player) return;
        const location = getLocation(context.player.location);
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
        sendEmbed(context, { description: answer });
    },
};