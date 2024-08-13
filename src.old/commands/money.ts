import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import { SlashCommandBuilder } from '@discordjs/builders';
import event from '../../data/event';

export const Money: Command = {
  name: 'Money',
  keywords: ['balance'],
  category: 'Bot',
  fullDesc: 'Display all your currencies.\n\nExample: `%PREFIX%money`',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Display your currencies'),

  handler(context: CommandContext): any {
    let eventCurrency = '';
    if(event.currency) {
      eventCurrency = `\n${event.currencyEmoji} **${event.currencyName}**: ${context.player?.money.tickets}`;
    }
    sendEmbed({ context, message: `Here is your money:\n<:pokecoin:741699521725333534> **Coins**: ${context.player?.money.coins.toLocaleString()}\n<:bp:797019879337230356> **BP**: ${context.player?.money.gems.toLocaleString()}${eventCurrency}`, image: null, thumbnail: 'https://pokemon.neekhaulas.com/images/pokecoin.png' });
  },
};
