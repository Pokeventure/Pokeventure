import { Command, CommandContext } from 'command';
import { sendEmbed, paginationEmbed } from '../modules/utils';
import {
  getMoves, getPokemon, moveClassEmoji, typeEmoji,
} from '../modules/pokedex';
import { addCoins, updatePokemon } from '../modules/database';
import { Pokemon } from 'pokemon';
import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';

export const Learn: Command = {
  name: 'Learn',
  keywords: ['learn'],
  category: 'Pokémon',
  fullDesc: 'Display a list of all the available moves with their category and their type. Then use the same command to teach it to your selected Pokémon in one of its 4 move slot.\n\nUsage: `%PREFIX%learn <move> <slot 1|2|3|4>`\n\nExample: `%PREFIX%learn` to see all available moves.\nExample: `%PREFIX%learn doublekick 2` to teach Double Kick to your selected Pokémon and put in the slot 2.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('learn')
    .setDescription('learn new moves to your Pokémon')
    .addStringOption(option => option
      .setName('move')
      .setDescription('Move to learn')
    )
    .addIntegerOption(option => option.setName('slot').setDescription('Slot to put the move')),

  handler(context: CommandContext): any {
    if (context.commandInterction.options.getString('move') === null) {
      let res: Pokemon = context.player?.selectedPokemon;
      const pokemon = getPokemon(res.dexId, res.special);
      const moves = getMoves(res.dexId, res.special).filter((el: any) => !res.moves.includes(el.move) && res.level >= el.level);
      let text = '';
      const embed = new MessageEmbed();
      embed.setAuthor(context.user.username, context.user.avatarURL);
      embed.setFooter('Use /learn move:<name> slot:<1|2|3|4> to learn a new move. i.e. !learn tackle 2.');
      embed.setTitle(`Moves available for ${pokemon.displayName}`);
      const pages = [embed];
      let j = 0;
      for (let i = 0; i < moves.length; i++) {
        text += `${moves[i].name} | \`${moves[i].move}\` | ${moveClassEmoji[moves[i].category]} ${moves[i].category} | ${typeEmoji[moves[i].type]} ${moves[i].type}\n`;
        if (i % 15 === 14 && i < moves.length) {
          pages[j].setDescription(`${text}\n\nUse \`/learn <name> <1|2|3|4>\` to learn a new move. i.e. \`/learn tackle 2\`.\n**It will cost 2,500 Pokécoins.**`);
          text = '';
          j++;
          pages[j] = new MessageEmbed();
          pages[j].setAuthor(context.user.username, context.user.avatarURL);
          pages[j].setTitle(`Moves available for ${res.name}`);
        }
      }
      pages[j].setDescription(`${text}\n\nUse \`/learn <name> <1|2|3|4>\` to learn a new move. i.e. \`/learn tackle 2\`. **It will cost 2,500 Pokécoins.**`);
      paginationEmbed(context, pages);
    } else {
      if (context.player?.money.coins >= 2500) {
        const move = context.commandInterction.options.getString('move', true).trim();
        let moveSlot: number | null = context.commandInterction.options.getInteger('slot');
        if (moveSlot !== null && moveSlot >= 1 && moveSlot <= 4) {
          moveSlot = moveSlot - 1;
          let res: Pokemon = context.player?.selectedPokemon;
          const moveFound = getMoves(res.dexId, res.special).filter((el: any) => res.level >= el.level && move === el.move);
          const valid = getMoves(res.dexId, res.special).filter((el: any) => !res.moves.includes(el.move) && res.level >= el.level && move === el.move);
          if (moveFound.length === 1) {
            if (res.moves.includes(moveFound[0].move)) {
              sendEmbed({ context, message: 'This pokemon already knows this move', author: context.user });
            } else {
              let forgot = null;
              if (res.moves[moveSlot]) {
                forgot = res.moves[moveSlot];
              }
              res.moves[moveSlot] = valid[0].move;
              updatePokemon(res._id, res);
              addCoins(context.user.id, -2500, 'learn');
              if (forgot) {
                sendEmbed({ context, message: `${res.name} forgot ${forgot} and learned ${valid[0].name}!`, author: context.user });
              } else {
                sendEmbed({ context, message: `${res.name} learned ${valid[0].name}!`, author: context.user });
              }
            }
          } else if (moveFound.length === 0) {
            sendEmbed({ context, message: `This pokemon can\'t learn this move (\`${move}\`)`, author: context.user });
          } else {
            sendEmbed({ context, message: 'Multiple moves were found with this name', author: context.user });
          }
        } else {
          sendEmbed({ context, message: 'Slot must be between 1 and 4', author: context.user });
        }
      } else {
        sendEmbed({ context, message: `You need 2,500 coins to learn a move and you have ${context.player?.money.coins} coins.`, author: context.user });
      }
    }
  },
};
