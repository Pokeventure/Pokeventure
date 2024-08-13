import { ButtonContext, Command, CommandContext } from "../types/command";
import { ChatInputCommandInteraction, ButtonInteraction, RESTPostAPIChatInputApplicationCommandsJSONBody, AutocompleteInteraction } from "discord.js";
import BotClient from "./client";
import { Player } from "../models/player";
import { __ } from "./i18n";

export default class CommandHandler {
    commands: Command[] = [];

    registerCommand(command: Command) {
        this.commands.push(command);
    }

    async handleCommand(client: BotClient, interaction: ChatInputCommandInteraction) {
        const matchingCommand = this.commands.find(command => {
            return command.commandName === interaction.commandName;
        });
        if (matchingCommand === undefined) return;

        let player: Player = new Player();
        let hasPlayer: boolean = false;
        if (matchingCommand.needPlayer) {
            const queryPlayer = await Player.findOne({ discord_id: interaction.user.id });

            if (matchingCommand.requireStart && queryPlayer === null) {
                return interaction.reply({ content: __("COMMON.STARTREQUIRED", interaction.locale) });
            }

            if (queryPlayer) {
                player = queryPlayer;
                hasPlayer = true;
            }
        }

        if (matchingCommand.blockTradeLocked && player.tradeLocked) {
            return interaction.reply({ content: "You can't use Market because you have been caught doing activities against the bot rules." });
        }

        if (!matchingCommand.dontDeffer) {
            await interaction.deferReply();
        }

        const context: CommandContext = {
            client,
            interaction,
            user: interaction.user,
            player: player,
            hasPlayer: hasPlayer
        };

        await matchingCommand?.handler(context);
    }

    async handleButton(client: BotClient, interaction: ButtonInteraction) {
        const matchingCommand = this.commands.find(command => {
            return command.commandName === interaction.customId;
        });
        if (matchingCommand === undefined) return;
        if (matchingCommand?.buttonHandler === undefined) return;

        let player: Player = new Player();
        let hasPlayer: boolean = false;
        if (matchingCommand.needPlayer) {
            const queryPlayer = await Player.findOne({ discord_id: interaction.user.id });

            if (matchingCommand.requireStart && !queryPlayer) {
                return interaction.reply({ content: __("COMMON.STARTREQUIRED", interaction.locale) });
            }

            if (queryPlayer) {
                player = queryPlayer;
                hasPlayer = true;
            }
        }

        if (!matchingCommand.dontDeffer) {
            await interaction.deferReply();
        }

        const context: ButtonContext = {
            client,
            interaction,
            user: interaction.user,
            player: player,
            hasPlayer: hasPlayer,
        };
        await matchingCommand?.buttonHandler(context);
    }

    async handleAutocomplete(client: BotClient, interaction: AutocompleteInteraction) {
        const matchingCommand = this.commands.find(command => {
            return command.commandName === interaction.commandName;
        });
        if (matchingCommand === undefined) return;
        if (matchingCommand?.autocompleteHandler === undefined) return;

        await matchingCommand.autocompleteHandler(client, interaction);
    }

    getCommandsData() {
        const data: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
        for (let i = 0; i < this.commands.length; i++) {
            data.push(this.commands[i].data().toJSON());
        }
        return data;
    }
}