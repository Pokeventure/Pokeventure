import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import { getPokemonByNumber, updatePokemon } from '../modules/database';
import { getPokemon as getPokemonDex } from '../modules/pokedex';
import { SlashCommandBuilder } from '@discordjs/builders';

export const LockEvolution: Command = {
  name: 'Lock Evolution',
  keywords: ['lockevolution', 'le', 'everstone'],
  category: 'Pokémon',
  fullDesc: 'Disable/Enable evolution on your Pokémon.\n\nUsage: `%PREFIX%lockevolution`\nUsage: `%PREFIX%lockevolution <Pokémon ID>`',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('lockevolution')
    .setDescription('Disable/Enable evolution on your selected Pokémon.'),

  handler(context: CommandContext): Promise<any> {
    return new Promise((resolve, reject) => {
      const res = context.player?.selectedPokemon;
      if (res === null) {
        sendEmbed({ context, message: 'You must select a Pokémon before.' });
        resolve({});
        return;
      }
      const pokemon = getPokemonDex(res.dexId, res.special);
      if (res.evolutionLock === undefined) {
        updatePokemon(res._id, { evolutionLock: true });
        sendEmbed({ context, message: `Your ${pokemon.displayName} is now not able to evolve.` });
      } else if (res.evolutionLock) {
        updatePokemon(res._id, { evolutionLock: false });
        sendEmbed({ context, message: `Your ${pokemon.displayName} is now able to evolve.` });
      } else {
        updatePokemon(res._id, { evolutionLock: true });
        sendEmbed({ context, message: `Your ${pokemon.displayName} is now not able to evolve.` });
      }
      resolve({});
    });
  },
};
