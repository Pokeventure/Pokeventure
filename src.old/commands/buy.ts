import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import shop from '../../data/shop';
import { addToInventory, addCoins, addCurrency } from '../modules/database';
import { incrementQuest } from '../modules/quests';
import { SlashCommandBuilder } from '@discordjs/builders';

export const Buy: Command = {
  name: 'Shop',
  keywords: ['buy'],
  category: 'Items',
  fullDesc: 'Command to buy item from the shop. You can buy items with their ID that you can find by using the command `%PREFIX%shop`.\n\nUsage: `%PREFIX%buy <ID> [quantity]`\n\n\nExample: `%PREFIX%shop 1` to buy the item with ID 1.\nExample: `%PREFIX%shop 3 12` to buy 12 items with ID 3.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the Poké Mart.')
    .addIntegerOption(
      (input) => input
        .setDescription('Item ID to buy')
        .setName('item')
        .setRequired(true),
    ).addIntegerOption(
      (input) => input
        .setDescription('Quantity')
        .setName('quantity')
        .setRequired(false)
    ),

  handler(context: CommandContext): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const selectedItem = context.commandInterction.options.getInteger('item', true) - 1;
      let quantity = context.commandInterction.options.getInteger('quantity') ?? 1;
      if (quantity <= 0) {
        sendEmbed({ context, message: 'Quantity should be positive.' });
        resolve({});
        return;
      }
      const item = shop[selectedItem];
      if (item === undefined) {
        sendEmbed({ context, message: 'Invalid item.' });
        resolve({});
        return;
      }
      if (item.price !== undefined) {
        const price = (context.player?.patronLevel !== undefined && context.player?.patronLevel >= 4 ? Math.round(item.price * 0.75) : item.price);
        if (context.player?.money.coins >= price * quantity) {
          addCoins(context.user.id, -(price * quantity), 'buy');
          addToInventory(context.user.id, item.id, quantity).then(() => {
            resolve({});
          }).catch((error) => {
            reject(error);
          });
          await sendEmbed({ context, message: `You successfully purchased ${quantity} ${item.name}.`, image: null, thumbnail: null, author: context.user });
          incrementQuest(context, context.user, 'tutorialShop', 1);
        } else {
          sendEmbed({ context, message: `You don't have enough coins to buy ${quantity} ${item.name}.`, image: null, thumbnail: null, author: context.user });
          resolve({});
        }
      } else if (item.currency !== undefined) {
        const price = item.currency;
        if (context.player?.money.tickets >= price * quantity) {
          addCurrency(context.user.id, -(price * quantity));
          addToInventory(context.user.id, item.id, quantity).then(() => {
            resolve({});
          }).catch((error) => {
            reject(error);
          });
          await sendEmbed({ context, message: `You successfully purchased ${quantity} ${item.name}.`, image: null, thumbnail: null, author: context.user });
          incrementQuest(context, context.user, 'tutorialShop', 1);
        } else {
          sendEmbed({ context, message: `You don't have enough currencies to buy ${quantity} ${item.name}.`, image: null, thumbnail: null, author: context.user });
          resolve({});
        }
      }
    });
  }
};