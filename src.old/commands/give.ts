import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import { addCoins, createMoneyLog, getPlayer } from '../modules/database';
import { SlashCommandBuilder } from '@discordjs/builders';
import { User } from 'discord.js';

export const Give: Command = {
  name: 'Give',
  keywords: ['give'],
  category: 'Bot',
  fullDesc: 'Command to send money to an other player.\n\nUsage: `%PREFIX%give @player <amount>`',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Send money to an other play.')
    .addUserOption(
      (input) => input
        .setName('player')
        .setDescription('Player to give money to')
        .setRequired(true))
    .addIntegerOption(option => option.setName('amount').setDescription('Amount of money to send').setRequired(true)),

  handler(context: CommandContext): any {
    return new Promise<any>(async (resolve, reject) => {
      if (context.player?.tradeLocked) {
        sendEmbed({ context, message: 'You can\'t use Give because you have been caught doing activities against the bot rules.', image: null, thumbnail: null, author: context.user });
        resolve({});
        return;
      }
      const mention: User = context.commandInterction.options.getUser('player', true);
      if (mention.bot) {
        sendEmbed({ context, message: 'You can\'t send money to a bot.' });
        return;
      }
      const receiver = await getPlayer(mention.id);
      if (receiver.tradeLocked) {
        sendEmbed({ context, message: `You can\'t send money to <@${mention.id}> because they have been caught doing activities against the bot rules.` });
        return;
      }
      const money = context.commandInterction.options.getInteger('amount', true);
      if (isNaN(money)) {
        sendEmbed({ context, message: 'Invalid amount value.' });
      } else if (money <= 0) {
        sendEmbed({ context, message: 'Amount should be above 0' });
      } else if (money > 50000000) {
        sendEmbed({ context, message: 'Amount should be under 50,000,000' });
      } else if (context.player?.money.coins < money) {
        sendEmbed({ context, message: 'You don\'t have enough money.' });
      } else {
        try {
          await addCoins(context.user.id, -money, 'giver');
          await addCoins(mention.id, money, 'receiver');
          createMoneyLog(context.user.id, mention.id, money);
        } catch (error) {
          reject(error);
        }
        sendEmbed({ context, message: `You sent ${money.toLocaleString()} <:pokecoin:741699521725333534> Coins to <@${mention.id}>.`, image: null, thumbnail: null, author: context.user });
      }
      resolve({});
    });
  }
};