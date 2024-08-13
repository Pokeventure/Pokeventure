import { Command, CommandContext } from 'command';
import { Pokemon, PokemonSpecies } from 'pokemon';
import { getImage, sendEmbed } from '../modules/utils';
import {
  getPlayer, updatePlayer, getPokemonByNickname, getPokemonByNumber,
} from '../modules/database';
import { getPokemon } from '../modules/pokedex';
import { SlashCommandBuilder } from '@discordjs/builders';

export const Select: Command = {
  name: 'Select',
  keywords: ['select', 'sel', 's', 'switch'],
  category: 'Pokémon',
  fullDesc: 'Select a Pokémon with its ID to be your selected Pokémon. You can find the ID of a Pokémon by using the `%PREFIX%pokemons` command.\n\nUsage: `%PREFIX%select <ID>`\n\nExample: `%PREFIX%select 4` to select Pokémon with ID as your selected Pokémon.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('select')
    .setDescription('Select one of your Pokémon to use it.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('id')
        .setDescription('Select a Pokémon by ID')
        .addIntegerOption(option => option.setName('number').setDescription('Pokémon number').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('nickname')
        .setDescription('Select a Pokémon by nickname')
        .addStringOption(option => option.setName('nickname').setDescription('Pokémon nickname').setRequired(true))),

  handler(context: CommandContext): Promise<any> {
    return new Promise((resolve, reject) => {
      const selectedNumber: number | null = context.commandInterction.options.getInteger('number');
      const selectedNickname: string | null = context.commandInterction.options.getString('nickname');
      if (selectedNumber === null) {
        getPokemonByNickname(context.user.id, selectedNickname ?? '').then((res) => {
          if (res === null) {
            sendEmbed({ context, message: 'To select a Pokémon you have to do `%PREFIX%select <pokemon id|nickname>`. You can find your Pokémon IDs with `%PREFIX%pokemons`.' });
          } else {
            updatePlayer(context.user.id, { selectedPokemon: res._id });
            const selectedPokemon: PokemonSpecies = { ...getPokemon(res.dexId, res.special) };
            selectedPokemon.forme = res.forme;
            sendEmbed({ context, message: `You selected ${selectedPokemon.displayName} (lvl. ${res.level})`, image: getImage(selectedPokemon, true, res.shiny, res.special), thumbnail: null, author: context.user });
          }
        }).catch((error) => {
          reject(error);
        });
      } else {
        getPokemonByNumber(context.user.id, selectedNumber - 1, context.player?.sort ?? '_ID_ASC').then((res: Pokemon) => {
          if (res === null) {
            sendEmbed({ context, message: 'None of your pokemon match this ID' });
          } else {
            updatePlayer(context.user.id, { selectedPokemon: res._id });
            const selectedPokemon: PokemonSpecies = { ...getPokemon(res.dexId, res.special) };
            selectedPokemon.forme = res.forme;
            sendEmbed({ context, message: `You selected ${selectedPokemon.displayName} (lvl. ${res.level})`, image: getImage(selectedPokemon, true, res.shiny, res.special), thumbnail: null, author: context.user });
          }
        }).catch((e) => {
          reject(e);
        });
      }
      resolve({});
    });
  },
};
