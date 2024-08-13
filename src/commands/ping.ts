import { ActionRowBuilder, ModalBuilder, SlashCommandBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, UserSelectMenuBuilder } from "discord.js";
import { Command } from "../types/command";

export const Ping: Command = {
    commandName: 'ping',
    displayName: 'Ping',
    fullDescription: 'Ping',
    requireStart: false,
    needPlayer: false,
    showInHelp: false,
    data: () => new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Ping'),

    handler(context) {
        context.interaction.editReply(`Pong\n\nWS: ${context.client.discordClient.ws.ping} ms`);
    },
};
