import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import shop from '../../data/bpshop';
import items from '../../data/items';
import { addToInventory, addBattlePoints } from '../modules/database';
import { SlashCommandBuilder } from '@discordjs/builders';

export const BpBuy: Command = {
  name: 'BP Buy',
  keywords: ['bpbuy'],
  category: 'Items',
  fullDesc: 'Command to buy item from the BP shop. You can buy items with their ID that you can find by using the command `%PREFIX%bpshop`.\n\nUsage: `%PREFIX%bpbuy <ID> [quantity]`\n\n\nExample: `%PREFIX%bpshop 1` to buy the item with ID 1.\nExample: `%PREFIX%bpshop 3 12` to buy 12 items with ID 3.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('bpbuy')
    .setDescription('Buy item with BP')
    .addIntegerOption(option => option.setName('item').setDescription('Item ID to buy').setRequired(true))
    .addIntegerOption(option => option.setName('quantity').setDescription('Quantity')),

  handler(context: CommandContext): Promise<any> {
    return new Promise((resolve, reject) => {
      const selectedItem = context.commandInterction.options.getInteger('item', true) - 1;
      let quantity = context.commandInterction.options.getInteger('quantity') ?? 1;
      if (quantity <= 0) {
        sendEmbed({ context, message: 'Quantity should be positive.', image: null, thumbnail: null, author: context.user });
        resolve({});
        return;
      }
      const item = shop.find((x) => x.id === selectedItem);
      if (item === undefined) {
        sendEmbed({ context, message: 'Invalid item.', image: null, thumbnail: null, author: context.user });
        resolve({});
        return;
      }
      const { price } = item;
      if (context.player?.money.gems >= price * quantity) {
        addBattlePoints(context.user.id, -price * quantity).catch((error) => {
          reject(error);
        });
        addToInventory(context.user.id, selectedItem, quantity * (item.quantity ?? 1)).catch((error) => {
          reject(error);
        });
        sendEmbed({ context, message: `You successfully purchased ${quantity * (item.quantity ?? 1)} ${items[item.id].name}.`, image: null, thumbnail: null, author: context.user });
      } else {
        sendEmbed({ context, message: `You don't have enough BP to buy ${items[item.id].name}.`, image: null, thumbnail: null, author: context.user });
      }
      resolve({});
    });
  },
};
