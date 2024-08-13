import { InteractionResponse, SlashCommandBuilder } from "discord.js";
import { Types } from "mongoose";
import { Pokemon } from "../models/pokemon";
import { addCoins } from "../modules/database";
import { rarity } from "../modules/pokedex";
import { askConfirmation, sendEmbed } from "../modules/utils";
import { Command, CommandContext } from "../types/command";

const releaseAmount = [
    75,
    200,
    500,
    1500,
    3500,
    15000,
];

export const Release: Command = {
    commandName: 'release',
    displayName: 'Release',
    fullDescription: `Command to release your Pokémons and earn some money. This command won't release your currently selected Pokémon or your favorite Pokémons.\nHere the value of each rarity:\n${rarity[0]}: ${releaseAmount[0]} <:pokecoin:741699521725333534>\n${rarity[1]}: ${releaseAmount[1]} <:pokecoin:741699521725333534>\n${rarity[2]}: ${releaseAmount[2]} <:pokecoin:741699521725333534>\n${rarity[3]}: ${releaseAmount[3]} <:pokecoin:741699521725333534>\n${rarity[4]}: ${releaseAmount[4]} <:pokecoin:741699521725333534>\n${rarity[5]}: ${releaseAmount[5]} <:pokecoin:741699521725333534>\n\nShines ✨ value are multiplied by 5.\nUsage: \`%PREFIX%release <IDs|all>\`\n\nExample: \`%PREFIX%release 3,15,45\` will release Pokémons #3, #15 and #45.\nExample: \`%PREFIX%release all\` will release all your Pokémons that are not your favorite Pokémons or is you currently selected Pokémon.\nExample: \`%PREFIX%release all N\` will release all your Pokémons that are <:n_:744200749600211004> rarity.`,
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName('release')
        .setDescription('Release your Pokémon and earn some money.')
        .addBooleanOption(option => option.setName('all').setDescription('Release all Pokemon'))
        .addStringOption(option => option.setName('rarity').setDescription('Unfavorite Pokemon by rarity')
            .addChoices({
                name: 'N',
                value: 'n'
            }, {
                name: 'U',
                value: 'u'
            }, {
                name: 'R',
                value: 'r'
            }, {
                name: 'SR',
                value: 'sr'
            }, {
                name: 'UR',
                value: 'ur'
            }, {
                name: 'LR',
                value: 'lr'
            })
        )
        .addStringOption(option => option.setName('id').setDescription('Pokémon ID (IDs can be separated by , )'))
        .setDMPermission(true),

    async handler(context: CommandContext) {
        let moneyResult = 0;
        let idsToRemove: Types.ObjectId[] = [];
        let ids: string[] = [];
        let all = false;
        let rarity = -1;

        if (context.interaction.options.getBoolean('all')) {
            all = true;
        } else {
            if (context.interaction.options.getString('rarity') === 'n') {
                rarity = 0;
            } else if (context.interaction.options.getString('rarity') === 'u') {
                rarity = 1;
            } else if (context.interaction.options.getString('rarity') === 'r') {
                rarity = 2;
            } else if (context.interaction.options.getString('rarity') === 'sr') {
                rarity = 3;
            } else if (context.interaction.options.getString('rarity') === 'ur') {
                rarity = 4;
            } else if (context.interaction.options.getString('rarity') === 'lr') {
                rarity = 5;
            }
            ids = (context.interaction.options.getString('id') ?? '').replace(/\s/g, '').split(',');
        }

        let pokemons = await Pokemon.find({ owner: context.user.id }, {}, { sort: context.player?.sort ?? '_ID_ASC' }).exec();
        let hasMaxRarity = false;
        let hasShiny = false;
        for (let i = 0; i < pokemons.length; i++) {
            if (pokemons[i]._id === context.player?.selectedPokemon._id) { continue; }
            if (pokemons[i].fav) { continue; }
            if (rarity >= 0) {
                if (pokemons[i].rarity === rarity) {
                    if (pokemons[i].rarity === 5) { hasMaxRarity = true; }
                    if (pokemons[i].shiny) { hasShiny = true; }
                    moneyResult += releaseAmount[pokemons[i].rarity] * (pokemons[i].shiny ? 5 : 1);
                    idsToRemove.push(pokemons[i]._id);
                }
            } else if (all || ids.includes((i + 1).toString())) {
                if (pokemons[i].rarity === 5) { hasMaxRarity = true; }
                if (pokemons[i].shiny) { hasShiny = true; }
                moneyResult += releaseAmount[pokemons[i].rarity] * (pokemons[i].shiny ? 5 : 1);
                idsToRemove.push(pokemons[i]._id);
            }
        }
        if (idsToRemove.length === 0) {
            sendEmbed(context, { description: 'No valid Pokémon to be released' });
            return;
        }
        sendEmbed(context, {
            description: `${idsToRemove.length} Pokémons will be released. You will earn ${moneyResult} <:pokecoin:741699521725333534>.\n${hasShiny ? '⚠️ You will release at least one Shiny ✨ ⚠️\n' : ''}${hasMaxRarity ? '⚠️ You will release at least one <:lr:746745321660481576> Pokémon ⚠️\n' : ''}Are you sure to continue?`,
            title: 'Release'
        }).then(async (message) => {
            if (message instanceof InteractionResponse) return;
            askConfirmation(message, context, async () => {
                let pokemons = await Pokemon.find({ owner: context.user.id }, {}, { sort: context.player?.sort ?? '_ID_ASC' }).exec();
                moneyResult = 0;
                idsToRemove = [];
                for (let i = 0; i < pokemons.length; i++) {
                    if (pokemons[i]._id === context.player?.selectedPokemon._id) { continue; }
                    if (pokemons[i].fav) { continue; }
                    if (rarity >= 0) {
                        if (pokemons[i].rarity === rarity) {
                            moneyResult += releaseAmount[pokemons[i].rarity] * (pokemons[i].shiny ? 5 : 1);
                            idsToRemove.push(pokemons[i]._id);
                        }
                    } else if (all || ids.includes((i + 1).toString())) {
                        moneyResult += releaseAmount[pokemons[i].rarity] * (pokemons[i].shiny ? 5 : 1);
                        idsToRemove.push(pokemons[i]._id);
                    }
                }
                addCoins(context.user.id, moneyResult, 'release');
                Pokemon.deleteMany({ _id: { $in: idsToRemove } }).exec();
                sendEmbed(context, { description: `${idsToRemove.length} Pokémons have been released. You earned ${moneyResult} <:pokecoin:741699521725333534>.`, title: 'Release' })
            });
        });
    },
};
