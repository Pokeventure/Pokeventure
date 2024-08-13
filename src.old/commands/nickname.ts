import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import {
    deleteNickname, getPokemonByNumber, updatePokemon,
} from '../modules/database';
import { getPokemon as getPokemonDex } from '../modules/pokedex';
import { Pokemon } from 'pokemon';
import { SlashCommandBuilder } from '@discordjs/builders';

export const Nickname: Command = {
    name: 'Nickname',
    keywords: ['nickname', 'nick'],
    category: 'Pokémon',
    fullDesc: 'Let you rename your Pokémons to give them unique names!\nNote: The name can\'t be longer than 13 characters and can contain only letters and numbers.\n\n**WARNING** : Any offensive naming will result in a deletion of the Pokémon.\n\nUsage: `%PREFIX%nickname`\nUsage: `%PREFIX%nickname reset` to reset your Pokémon nickname.',
    requireStart: false,
    needPlayer: true,
    showInHelp: true,
    commandData: new SlashCommandBuilder()
        .setName('nickname')
        .setDescription('Give a nickname to your Pokémon')
        .addSubcommand(option => option.setName('rename').setDescription('Rename your Pokémon').addStringOption(option => option.setName('nickname').setDescription('New nickname').setRequired(true)))
        .addSubcommand(option => option.setName('reset').setDescription('Remove your Pokémon nickname')),

    handler(context: CommandContext): Promise<any> {
        return new Promise((resolve, reject) => {
            if (context.commandInterction.options.getSubcommand() === 'reset') {
                let res = context.player?.selectedPokemon;
                if (res === null) {
                    resolve({});
                    return;
                }
                deleteNickname(res._id);
                sendEmbed({ context, message: 'Your selected Pokémon nickname has been removed.' });
            } else {
                let res = context.player?.selectedPokemon;
                if (res === null) {
                    resolve({});
                    return;
                }
                const pokemon = getPokemonDex(res.dexId, res.special);

                const nickname = context.commandInterction.options.getString('nickname', true).replace(/[^\w\s]/gi, '');
                if (nickname.length > 13) {
                    sendEmbed({ context, message: 'The given nickname is too long.' });
                } else if (nickname.length === 0) {
                    sendEmbed({ context, message: 'The given nickname can\'t be empty. It means you used only non authorized characters.' });
                } else {
                    updatePokemon(res._id, { nickname });
                    sendEmbed({ context, message: `Your ${pokemon.displayName} is now called **${nickname}**!` });
                }
            }
            resolve({});
        });
    },
};