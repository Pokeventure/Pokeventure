import { Command, CommandContext } from "../types/command";
import { SlashCommandBuilder } from "discord.js";
import { Raid as RaidModel } from "../models/raid";
import moment from "moment";
import { getImage, sendEmbed } from "../modules/utils";
import { getPokemon, sendInfo } from "../modules/pokedex";
import { Fight } from "../modules/fight";
import { RaidLog } from "../models/raidLog";

const patronMultiplicator = [
    1,
    1.5,
    1.5,
    1.75,
    1.75,
    2,
];

export const Raid: Command = {
    commandName: "raid",
    displayName: "Raid",
    fullDescription: "Command will start an automated fight against the raid Pokémon.\nYou will participate to take it down and you will earn a reward according to your contribution. Once the raid Pokémon has been taken down, you will have 3 tries to catch it with the `%PREFIX%catch` command.\n(Note: holdable items will be consumed during Raid fights)\n\nExample: `%PREFIX%raid`\nUsage: `%PREFIX%raid info` to get informations about moves and more. (The Pokémon that you will be able to catch will be different)",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("raid")
        .setDescription("Fight against current raid")
        .addBooleanOption(option => option.setName("info").setDescription("Get informations about current raid"))
        .setDMPermission(true),

    async handler(context: CommandContext) {
        const raid = await RaidModel.findOne({ time: { $exists: true } }).exec();
        if (raid === null) {
            return;
        }

        if (raid.hp <= 0) {
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
            await sendInfo(raid.pokemon, context, false);
            return sendEmbed(context, { description: `Raid will end ${moment(raid.time).add(20, "minutes").fromNow()}.` });
        }
        const delay = parseInt(process.env.DELAY_RAID ?? "3000");
        const timer = await context.client.getRaidTimer(context.user.id);
        if (timer !== null && Date.now() - timer <= 0) {
            const timeLeft = Math.round(timer + delay - Date.now()) / 1000;
            return sendEmbed(context, { description: `You can fight in the Raid in ${timeLeft}s`, image: null, thumbnail: null, author: context.user });
        }
        const patronLevel = context.player?.patronLevel || 0;
        const patronBonusExperience = patronMultiplicator[patronLevel];

        const fight: Fight = new Fight();
        const pokemon = context.player?.selectedPokemon;
        if (!pokemon) {
            sendEmbed(context, { description: "You must select a Pokémon before.", author: context.user });
            return;
        }
        raid.pokemon.level = pokemon.level < 100 ? pokemon.level + Math.round(pokemon.level / 100) : 110;
        raid.pokemon.item = "raidreduction";
        fight.start(context, [pokemon], [raid.pokemon], 1, raid.maxHp, raid.maxHp).then(async (result) => {
            if (!raid || !pokemon) return;
            const pokemonRaid = getPokemon(raid.pokemon.dexId, raid.pokemon.special);
            context.client.setRaidTimer(context.user.id, Date.now() + result.turn * delay, result.turn * delay / 1000);

            console.log(raid.hp, result.hp);
            let damagesDealt = raid.hp - (result.hp ?? 0);
            if (damagesDealt > 100000) {
                damagesDealt = damagesDealt * 0.75;
            } else if (damagesDealt > 10000) {
                damagesDealt = damagesDealt * 0.85;
            } else if (damagesDealt > 1000) {
                damagesDealt = damagesDealt * 0.95;
            }
            damagesDealt = Math.round(damagesDealt);

            const experience = Math.round(
                (1 // a
                    * (pokemon.firstOwner === pokemon.owner ? 1 : 1.5) // t 1.5 if it"s traded
                    * (pokemon.luckyEgg ? 1.5 : 1) // e 1.5 if pokemon has lucky egg
                    * getPokemon(raid.pokemon.dexId).base_experience // b
                    * raid.pokemon.level // L
                    / 7
                    * 0.75)
                * patronBonusExperience,
            );
            const clanExperience = Math.floor(experience * 0.1);

            await sendEmbed(context, { description: `You dealt ${damagesDealt} damage to **${pokemonRaid.displayName}** in ${result.turn} turns.\nYou can fight raid again in ${(result.turn * delay) / 1000} seconds.\n\n${getPokemon(pokemon.dexId).displayName} gained ${experience} Exp. points.\n${context.player?.clan !== null ? `Your clan has gained ${clanExperience} Exp. points.\n` : ""}You earned ${Math.round(damagesDealt)} <:pokecoin:741699521725333534> coins.`, image: result.image, thumbnail: null, author: context.user });

            let log = await RaidLog.findOne({ discord_id: context.user.id, checked: { $exists: false } }).exec();
            if (log) {
                log.updateOne({ $inc: { damageDealt: damagesDealt, hits: 1 } }).exec();
            } else {
                log = new RaidLog();
                log.discord_id = context.user.id;
                log.damageDealt = damagesDealt;
                log.hits = 1;
                log.save();
            }

            /*context.client.redis.set(`raidtimer-${context.user.id}`, Date.now() + result.turn * delay, "EX", result.turn * delay / 1000);
            if (result.consumedItem !== undefined && result.consumedItem.length > 0) {
                holdItem(pokemon._id, null);
            }
            const clanExperience = Math.floor(experience * 0.1);
            if (context.player?.clan !== null) {
                addExperienceToClan(context.player?.clan._id, context.user.id, clanExperience).then((result) => {
                    if (result.levelup) {
                        broadcastClanMessage(context.client, context.player?.clan.channel, context.channel?.id ?? "", `Clan leveled up to level ${context.player?.clan.level + 1}`, "Level up! 🎉");
                    }
                }).catch((error) => {
                    Logger.error(error);
                });
            }


            addCoins(context.user.id, Math.round(damagesDealt), "raid");
            let pokemonRaid = getPokemon(raid.pokemon.dexId, raid.pokemon.special);
            giveExperience(pokemon, experience, context);
            incrementQuest(context, context.user, "raid", 1);
            await increaseResearch(context, context.user.id, Research.used, pokemon.dexId, context.player?.research?.data);
            getRaid().then(async (raid) => {
                if (moment(raid.time) < moment()) {
                    checkRaid(context.client, raid._id);
                    dealDamagesRaid(raid._id, context.user.id, Math.max(0, damagesDealt), { dexId: pokemon.dexId, special: pokemon.special, moves: pokemon.moves }).then(() => {
                        resolve({});
                    }).catch((error) => {
                        reject(error);
                    });
                } else {
                    checkRaid(context.client, raid._id);
                    const hasTries = await context.client.redis.get(`tries-${context.user.id}`);
                    if (hasTries === null) {
                        context.client.redis.set(`tries-${context.user.id}`, "3", "EX", 60 * 15).catch((e: any) => {
                            Logger.error(e);
                        });
                    }
                    resolve({});
                }
            }).catch((error) => {
                reject(error);
            });*/
        });

    },
};
