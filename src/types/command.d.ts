import { ChatInputCommandInteraction, SlashCommandBuilder, User, ButtonInteraction, AutocompleteInteraction } from 'discord.js';
import BotClient from '../modules/client';
import { Player } from '../models/player';
export interface Command {
    commandName: string;
    displayName: string;
    fullDescription: string;
    requireStart: boolean;
    needPlayer: boolean;
    showInHelp: boolean;
    data: () => SlashCommandBuilder;
    handler: (context: CommandContext) => void;
    hasButtonHandler?: boolean;
    buttonHandler?: (context: ButtonContext) => void;
    autocompleteHandler?: (client: BotClient, interaction: AutocompleteInteraction) => void;
    dontDeffer?: boolean;
    blockTradeLocked?: boolean;
}

export interface BaseContext {
    client: BotClient;
    player: Player;
    user: User;
    hasPlayer: boolean;
}

export interface CommandContext extends BaseContext {
    interaction: ChatInputCommandInteraction;
}

export interface ButtonContext extends BaseContext {
    interaction: ButtonInteraction;
}

export type Context = CommandContext | ButtonContext;