import { ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, ModalBuilder, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { Command, CommandContext } from "../types/command";

export const Server: Command = {
    commandName: "server",
    displayName: "Server",
    fullDescription: "Server",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    dontDeffer: false,
    data: () => new SlashCommandBuilder()
        .setName("server")
        .setDescription("Manage server"),
    handler: async (context: CommandContext) => {
        const select = new ChannelSelectMenuBuilder()
            .setCustomId("starter")
            .setPlaceholder("Make a selection!")
            .setMaxValues(25)
            .setChannelTypes(ChannelType.GuildText);

        const row = new ActionRowBuilder<ChannelSelectMenuBuilder>()
            .addComponents(select);

        await context.interaction.editReply({
            content: "Choose your starter!",
            components: [row],
        });
    }
};