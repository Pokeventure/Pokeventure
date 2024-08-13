import { Player } from 'pokemon';
import Client from '../modules/client';
import { ButtonInteraction, CommandInteraction, Interaction, SelectMenuInteraction, TextBasedChannel } from 'discord.js';

export interface Command {
  name: string;

  keywords: string[];

  requireStart: boolean;

  needPlayer: boolean;

  category: string;

  fullDesc: string;

  showInHelp: boolean;

  earlyAccess?: boolean;

  ignoreLock?: boolean;

  canBeBlocked?: boolean;

  ignoreCommandLock?: boolean;

  betaRestricted?: boolean;

  commandData: any;

  // eslint-disable-next-line no-unused-vars
  handler(context: CommandContext): Promise<any>;
}

export interface User {
  id: string,
  username: string,
  avatarURL: string,
}

export interface CommandContext {
  client: Client;

  channel: TextBasedChannel | null;

  commandInterction: CommandInteraction;

  buttonInteraction: ButtonInteraction;

  selectMenuInteraction: SelectMenuInteraction;

  interaction: Interaction;

  args?: string[];

  player?: Player;

  user: User;
}
