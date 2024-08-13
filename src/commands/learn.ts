import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Pokemon } from "../models/pokemon";
import { addCoins } from "../modules/database";
import { getMoves, getPokemon, moveClassEmoji, typeEmoji } from "../modules/pokedex";
import { pagination, sendEmbed } from "../modules/utils";
import { Command, CommandContext } from "../types/command";

export const Learn: Command = {
  commandName: 'learn',
  displayName: 'Learn',
  fullDescription: 'Display a list of all the available moves with their category and their type. Then use the same command to teach it to your selected Pokémon in one of its 4 move slot.\n\nUsage: `%PREFIX%learn <move> <slot 1|2|3|4>`\n\nExample: `%PREFIX%learn` to see all available moves.\nExample: `%PREFIX%learn doublekick 2` to teach Double Kick to your selected Pokémon and put in the slot 2.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  data: () => new SlashCommandBuilder()
    .setName('learn')
    .setDescription('learn new moves to your Pokémon')
    .addStringOption(option => option
      .setName('move')
      .setDescription('Move to learn')
    )
    .addIntegerOption(option => option.setName('slot').setDescription('Slot to put the move'))
    .setDMPermission(true)
  ,

  handler(context: CommandContext) {
    if (!context.player) return;
    if (context.interaction.options.getString('move') === null) {
      let pokemon: Pokemon = context.player.selectedPokemon;
      const pokemonData = getPokemon(pokemon.dexId, pokemon.special);
      const moves = getMoves(pokemon.dexId, pokemon.special).filter((el: any) => !pokemon.moves.includes(el.move) && pokemon.level >= el.level);
      let text = '';
      const embed = new EmbedBuilder();
      embed.setFooter({ text: 'Use /learn move:<name> slot:<1|2|3|4> to learn a new move. i.e. /learn tackle 2.' });
      embed.setTitle(`Moves available for ${pokemonData.displayName}`);
      const pages = [embed];
      let j = 0;
      for (let i = 0; i < moves.length; i++) {
        text += `${moves[i].name} | \`${moves[i].move}\` | ${moveClassEmoji[moves[i].category]} ${moves[i].category} | ${typeEmoji[moves[i].type]} ${moves[i].type}\n`;
        if (i % 15 === 14 && i < moves.length) {
          pages[j].setDescription(`${text}\n\nUse \`/learn <name> <1|2|3|4>\` to learn a new move. i.e. \`/learn tackle 2\`.\n**It will cost 2,500 Pokécoins.**`);
          text = '';
          j++;
          pages[j] = new EmbedBuilder();
          pages[j].setTitle(`Moves available for ${pokemonData.name}`);
        }
      }
      pages[j].setDescription(`${text}\n\nUse \`/learn <name> <1|2|3|4>\` to learn a new move. i.e. \`/learn tackle 2\`. **It will cost 2,500 Pokécoins.**`);
      pagination(context, pages);
    } else {
      if (context.player?.money.coins < 2500) {
        return sendEmbed(context, { description: `You need 2,500 coins to learn a move and you have ${context.player?.money.coins} coins.`, author: context.user });
      }
      const move = context.interaction.options.getString('move', true).trim();
      let moveSlot: number | null = context.interaction.options.getInteger('slot');
      if (!moveSlot || moveSlot < 1 || moveSlot > 4) {
        return sendEmbed(context, { description: 'Slot must be between 1 and 4', author: context.user });
      }
      moveSlot = moveSlot - 1;
      let pokemon: Pokemon = context.player?.selectedPokemon;
      const pokemonData = getPokemon(pokemon.dexId, pokemon.special);
      const moveFound = getMoves(pokemon.dexId, pokemon.special).filter((el: any) => pokemon.level >= el.level && move === el.move);
      const valid = getMoves(pokemon.dexId, pokemon.special).filter((el: any) => !pokemon.moves.includes(el.move) && pokemon.level >= el.level && move === el.move);
      if (moveFound.length === 1) {
        if (pokemon.moves.includes(moveFound[0].move)) {
          sendEmbed(context, { description: 'This pokemon already knows this move', author: context.user });
        } else {
          let forgot = null;
          if (pokemon.moves[moveSlot]) {
            forgot = pokemon.moves[moveSlot];
          }
          pokemon.moves[moveSlot] = valid[0].move;
          pokemon.save();
          addCoins(context.user.id, -2500, 'learn');
          if (forgot) {
            sendEmbed(context, { description: `${pokemonData.displayName} forgot ${forgot} and learned ${valid[0].name}!`, author: context.user });
          } else {
            sendEmbed(context, { description: `${pokemonData.displayName} learned ${valid[0].name}!`, author: context.user });
          }
        }
      } else if (moveFound.length === 0) {
        sendEmbed(context, { description: `This pokemon can\'t learn this move (\`${move}\`)`, author: context.user });
      } else {
        sendEmbed(context, { description: 'Multiple moves were found with this name', author: context.user });
      }
    }
  },
};
