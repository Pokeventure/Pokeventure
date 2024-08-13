import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext } from "../types/command";
import { MegaRaid as MegaRaidModel } from "../models/megaRaid";
import moment from "moment";
import { getImage, sendEmbed } from "../modules/utils";
import { MegaRaidLog } from "../models/megaRaidLog";
import { getPokemon, sendInfo } from "../modules/pokedex";
import { Fight } from "../modules/fight";
import { incrementQuest } from "../modules/quests";
import { checkMegaRaid } from "../modules/megaRaid";

export const MegaRaid: Command = {
    commandName: "megaraid",
    displayName: "Mega Raid",
    fullDescription: "Command will start an automated hard fight against the Mega Raid Pokémon.\n**You will need to use a Mega Raid Pass to access to Mega Raids**\nYou will participate to take it down and you will get Mega shards according to your contribution.\n(Note: holdable items will be consumed during Raid fights)\n\nExample: `%PREFIX%megaraid`\nUsage: `%PREFIX%megaraid info` to get informations about moves and more.",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("megaraid")
        .setDescription("Fight against the Mega Raid")
        .addBooleanOption(option => option.setName("info").setDescription("Get Mega Raid informations"))
        .setDMPermission(true),
    handler: async (context: CommandContext) => {
        const raid = await MegaRaidModel.findOne({ time: { $exists: true } }).exec();
        if (raid === null) {
            return;
        }

        if (moment(raid.time) > moment()) {
            if (moment(raid.time).diff(new Date(), "seconds") > 60) {
                return sendEmbed(context, { description: `Next raid will start in ${moment(raid.time).diff(new Date(), "minutes")} minutes`, image: getImage(raid.pokemon, true, raid.pokemon.shiny, raid.pokemon.special), thumbnail: null, author: context.user, title: "Raid" });
            } else {
                return sendEmbed(context, { description: `Next raid will start in ${moment(raid.time).diff(new Date(), "seconds")} seconds`, image: getImage(raid.pokemon, true, raid.pokemon.shiny, raid.pokemon.special), thumbnail: null, author: context.user, title: "Raid" });
            }
        }
        if (context.interaction.options.getBoolean("info")) {
            return sendInfo(raid.pokemon, context, false);
        }
        const log = await MegaRaidLog.findOne({ discord_id: context.user.id, ok: false });
        if (!log) {
            return sendEmbed(context, { description: "To participate to Mega Raid, you have to use a <:pass:746747476811317258> Mega Raid Pass. You can buy one in the BP Shop.", image: getImage(raid.pokemon, true, raid.pokemon.shiny, raid.pokemon.special), footer: { text: `HP left: ${raid.hp}/${raid.maxHp}` }, title: "Mega Raid" });
        }
        const delay = parseInt(process.env.MEGA_DELAY_RAID ?? "");
        const timer = await context.client.getMegaRaidTimer(context.user.id);
        if (timer && (Date.now() - timer) <= 0) {
            const timeLeft = Math.round((timer + delay - Date.now()) / 1000);
            return sendEmbed(context, { description: `You can fight in the Mega Raid in ${timeLeft}s` });
        }
        const pokemon = context.player.selectedPokemon;
        if (!pokemon) {
            return sendEmbed(context, { description: "You must select a Pokémon before." });
        }
        const fight: Fight = new Fight();
        raid.pokemon.level = pokemon.level < 100 ? 200 : 110;
        raid.pokemon.item = "raidreduction";
        fight.start(context, [pokemon], [raid.pokemon], 2, raid.maxHp, raid.hp).then(async (result) => {
            context.client.setMegaRaidTimer(context.user.id, Date.now() + result.turn * delay, result.turn * delay / 1000);
            if (result.consumedItem !== undefined && result.consumedItem.length > 0) {
                pokemon.item = undefined;
                await pokemon.save();
            }
            const damageDealt = result.victory === 1 ? raid.hp : Math.max(0, raid.hp - (result.hp ?? 0));
            const pokemonData = getPokemon(raid.pokemon.dexId, raid.pokemon.special);
            if (result.victory === 1) {
                await sendEmbed(context, { description: `You dealt the last hit to **${pokemonData.displayName}**.`, title: "Mega Raid" });
            } else {
                await sendEmbed(context, { description: `You dealt ${damageDealt} damage to **${pokemonData.displayName}** in ${result.turn} turns.\nYou can fight raid again in ${(result.turn * delay) / 1000} seconds.`, image: result.image, title: "Mega Raid" });
            }
            incrementQuest(context, context.user, "raid", 1);
            //await increaseResearch(context, context.user.id, Research.used, pokemon.dexId, context.player?.research?.data);
            const updatedRaid = await MegaRaidModel.findOne({ time: { $exists: true } }).exec();
            if (updatedRaid && moment(updatedRaid.time) < moment()) {
                updatedRaid.hp -= Math.max(damageDealt);
                await updatedRaid.save();
                await log.updateOne({ $inc: { damageDealt, hits: 1 } }).exec();
                checkMegaRaid(context.client);
            }
        });
    }
};