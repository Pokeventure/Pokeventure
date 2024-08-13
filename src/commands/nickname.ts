import { SlashCommandBuilder } from "discord.js";
import { getPokemon } from "../modules/pokedex";
import { sendEmbed } from "../modules/utils";
import { Command } from "../types/command";

export const Nickname: Command = {
    commandName: 'nickname',
    displayName: 'Nickname',
    fullDescription: 'Let you rename your Pokémons to give them unique names!\nNote: The name can\'t be longer than 13 characters and can contain only letters and numbers.\n\n**WARNING** : Any offensive naming will result in a deletion of the Pokémon.\n\nUsage: `%PREFIX%nickname`\nUsage: `%PREFIX%nickname reset` to reset your Pokémon nickname.',
    requireStart: false,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName('nickname')
        .setDescription('Give a nickname to your Pokémon')
        .addSubcommand(option => option.setName('rename').setDescription('Rename your Pokémon').addStringOption(option => option.setName('nickname').setDescription('New nickname').setRequired(true)))
        .addSubcommand(option => option.setName('reset').setDescription('Remove your Pokémon nickname'))
        .setDMPermission(true),

    handler(context) {
        if (!context.player) return;
        if (context.player.selectedPokemon === null) {
            return;
        }
        if (context.interaction.options.getSubcommand() === 'reset') {
            delete context.player.selectedPokemon.nickname;
            context.player.selectedPokemon.save();
            sendEmbed(context, { description: 'Your selected Pokémon nickname has been removed.' });
        } else {
            const pokemon = getPokemon(context.player.selectedPokemon.dexId, context.player.selectedPokemon.special);

            const nickname = context.interaction.options.getString('nickname', true).replace(/[^\w\s]/gi, '');
            if (nickname.length > 13) {
                sendEmbed(context, { description: 'The given nickname is too long.' });
            } else if (nickname.length === 0) {
                sendEmbed(context, { description: 'The given nickname can\'t be empty or uses only authorized characters.' });
            } else {
                context.player.selectedPokemon.nickname = nickname;
                context.player.selectedPokemon.save();
                sendEmbed(context, { description: `Your ${pokemon.displayName} is now called **${nickname}**!` });
            }
        }
    },
};