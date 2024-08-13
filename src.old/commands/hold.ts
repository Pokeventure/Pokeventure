import { Command, CommandContext } from 'command';
import Logger from '../modules/logger';
import items from '../../data/items';
import {
  getInventory, addToInventory, holdItem,
} from '../modules/database';
import { sendEmbed } from '../modules/utils';
import { SlashCommandBuilder } from '@discordjs/builders';

export const Hold: Command = {
  name: 'Hold',
  keywords: ['hold'],
  category: 'Items',
  fullDesc: 'Give an item from your inventory to your Pokémon so it can be used during fights. You can see what\'s in your inventory by using the command `%PREFIX%inventory`.\n\nUsage: `%PREFIX%hold <name of item to use>`\n\nExample: `%PREFIX%hold leftovers` to give Leftovers to your Pokémon.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('hold')
    .setDescription('Give or remove an item from your Pokémon.')
    .addStringOption(
      (input) => input
        .setName('item')
        .setDescription('Item to hold')),

  handler(context: CommandContext): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const itemName: string | null = context.commandInterction.options.getString('item');
        if (itemName !== null) {
          getInventory(context.user.id).then(async (inv) => {
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.name.toLowerCase().includes(itemName.toLowerCase())) {
                if (item.canHold) {
                  if (inv.inventory[i]?.quantity > 0) {
                    let pokemon = context.player?.selectedPokemon;
                    let itemToAddBack = null;
                    if (pokemon.item !== null) {
                      itemToAddBack = items.find((x) => x.holdname === pokemon.item);
                      if (itemToAddBack !== undefined) {
                        await addToInventory(context.user.id, items.indexOf(itemToAddBack), 1);
                      } else {
                        Logger.error('Cannot find item', pokemon.item);
                      }
                    }
                    await addToInventory(context.user.id, i, -1);
                    await holdItem(context.player?.selectedPokemon._id, item.holdname);
                    sendEmbed({ context, message: `Your Pokémon is now holding **${item.name}**.${itemToAddBack !== null && itemToAddBack !== undefined ? `\n\n**${itemToAddBack.name}** has been put in your inventory.` : ''}`, image: null, thumbnail: null, author: context.user });
                  } else {
                    sendEmbed({ context, message: `You don't have any ${item.name}.`, image: null, thumbnail: null, author: context.user });
                  }
                } else {
                  sendEmbed({ context, message: `You can't hold ${item.name}.`, image: null, thumbnail: null, author: context.user });
                }
                return;
              }
            }
          }).catch((e) => {
            reject(e);
          });
        } else {
          const pokemon = context.player?.selectedPokemon;
          if (pokemon.item !== null) {
            const itemToAddBack = items.find((x) => x.holdname === pokemon.item);
            if (itemToAddBack !== undefined) {
              await addToInventory(context.user.id, items.indexOf(itemToAddBack), 1);
              await holdItem(context.player?.selectedPokemon._id, null);
              sendEmbed({ context, message: `You take **${itemToAddBack.name}** from you Pokémon.`, image: null, thumbnail: null, author: context.user });
            } else {
              Logger.error('Cannot find item', pokemon.item);
            }
          } else {
            sendEmbed({ context, message: 'Your Pokémon is not holding an item.', image: null, thumbnail: null, author: context.user });
          }
        }
        resolve({});
      } catch (error) {
        reject(error);
      }
    });
  },
};
