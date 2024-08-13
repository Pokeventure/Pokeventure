import { ButtonContext, Command, CommandContext } from "../types/command";
import { SlashCommandBuilder } from "discord.js";
import { calculateFightExperience, getRndInteger, sendEmbed } from "../modules/utils";
import { Fight as FightModule } from "../modules/fight";
import { Pokemon } from "../models/pokemon";
import { getPokemon } from "../modules/pokedex";
import { IPokemon } from "../types/pokemon";
import { addCoins, addExperience } from "../modules/database";
import { getMappedTranslation, __ } from "../modules/i18n";
import { incrementQuest } from "../modules/quests";

const patronMultiplicator = [
    1,
    1.5,
    1.5,
    1.75,
    1.75,
    2,
];

export const Fight: Command = {
    commandName: "fight",
    displayName: "Fight",
    fullDescription: "COMMAND.FIGHT.FULL_DESCRIPTION",
    needPlayer: true,
    requireStart: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("fight")
        .setNameLocalizations(getMappedTranslation("COMMAND.FIGHT.NAME"))
        .setDescription("Fight command")
        .setDescriptionLocalizations(getMappedTranslation("COMMAND.FIGHT.DESCRIPTION")),
    handler(context: CommandContext) {
        fightWild(context);
    },
    hasButtonHandler: true,
    buttonHandler(context) {
        fightWild(context);
    },
};

async function fightWild(context: CommandContext | ButtonContext) {
    if (context.player === null) return;
    const wildPokemon: IPokemon | null = await context.client.getWildPokemon(context.user.id);
    if (wildPokemon === null) {
        return sendEmbed(context, { description: "You are not facing any wild Pokemon. Do `/wild` to find wild Pokemon." });
    }
    let fight: FightModule = new FightModule();
    const pokemon: Pokemon = context.player.selectedPokemon;
    fight.start(context, [pokemon], [wildPokemon], 0).then(async (result) => {
        context.client.deleteWildPokemon(context.user.id);
        let baseExperience: number = calculateFightExperience(result.victory === 1, wildPokemon.dexId, pokemon.firstOwner === pokemon.owner, pokemon.luckyEgg ?? false, wildPokemon.level);
        const patronLevel = context.player?.patronLevel || 0;
        const patronBonusExperience = patronMultiplicator[patronLevel];
        const clanBonusExperience = context.player?.clan?.perks[2] ?? 0;

        let clanBonus = Math.round(baseExperience * (1 + clanBonusExperience * 0.2)) - baseExperience;
        let patronBonus = Math.round(baseExperience * patronBonusExperience) - baseExperience;
        let totalExperience = Math.round(baseExperience + clanBonus + patronBonus);
        let clanExperience = Math.round(totalExperience * 0.1);

        let textResult = "";
        if (result.victory == 1) {
            const coins = getRndInteger(pokemon.level * 2, pokemon.level * 5);
            await addCoins(context.user.id, coins, "fight");
            console.log(context.interaction.locale);

            textResult = __("COMMAND.FIGHT.WIN", context.interaction.locale, {
                wildPokemon: getPokemon(wildPokemon.dexId).displayName,
                pokemon: getPokemon(pokemon.dexId).displayName,
                experience: totalExperience,
                coins
            });
            context.client.setFaintedPokemon(context.user.id, wildPokemon);
            /*`${ clanBonus !== 0 ? `(Bonus from clan: ${clanBonus} Exp)` : "" }
            ${ patronBonus !== 0 ? `(Bonus from Patreon: ${patronBonus} Exp)\n` : "" }
            ${ context.player?.clan ? `Your clan has gained ${clanExperience} Exp. points.\n` : "" }
            You earned ${ coins } <: pokecoin: 741699521725333534 > coins.\n\n__You have a chance to catch it!__`;*/
        } else {
            console.log(context.interaction.locale);
            textResult = __("COMMAND.FIGHT.LOSS", context.interaction.locale, {
                wildPokemon: getPokemon(wildPokemon.dexId).displayName,
                pokemon: getPokemon(pokemon.dexId).displayName,
                experience: totalExperience
            });
            /* `${ clanBonus !== 0 ? `(Bonus from clan: ${clanBonus} Exp)` : "" }
            ${ patronBonus !== 0 ? `(Bonus from Patreon: ${patronBonus} Exp)` : "" }
            ${ context.player?.clan ? `Your clan has gained ${clanExperience} Exp. points.` : "" } `; */
        }

        await sendEmbed(context, { description: textResult, image: result.image, author: context.user });
        addExperience(pokemon, totalExperience, context);
        await incrementQuest(context, context.user, "tutorialFight", 1);
    });
}