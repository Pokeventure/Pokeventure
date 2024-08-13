import moment from "moment";
import { Chance } from "chance";
import raids from "../../data/raids";
import { getRndInteger, getImage } from "./utils";
import { randomPokemon } from "./world";
import Logger from "./logger";
import { EmbedBuilder, Routes } from "discord.js";
import BotClient from "./client";
import { Raid } from "../models/raid";
import { getPokemon } from "./pokedex";
import { RaidLog } from "../models/raidLog";
import { addStats } from "./database";

export const raidMoves: any = {
    "Water": ["aquatail", "hydropump"],
    "Electric": ["thunderpunch", "thunder"],
    "Raid": ["wait", "wait"],
    "Fire": ["blazekick", "flamethrower"],
    "Ground": ["earthquake", "earthpower"],
    "Grass": ["leafblade", "energyball"],
    "Psychic": ["psychicfangs", "psystrike"],
    "Bug": ["megahorn", "bugbuzz"],
    "Dark": ["crunch", "darkpulse"],
    "Steel": ["irontail", "flashcannon"],
    "Dragon": ["dragonrush", "dracometeor"],
    "Fairy": ["playrough", "moonblast"],
    "Fighting": ["closecombat", "aurasphere"],
    "Poison": ["crosspoison", "sludgebomb"],
    "Rock": ["stoneedge", "powergem"],
    "Flying": ["aeroblast", "drillpeck"],
    "Ghost": ["shadowpunch", "shadowball"],
    "Ice": ["icepunch", "icebeam"],
    "Normal": ["bodyslam", "swift"]
};


function createRandomRaidPokemon(excludeFromGeneration = 0) {
    const chance = new Chance();
    const rarityLevel = chance.weighted([0, 1, 2], [4, 3, 2]);

    const weekNumber = parseInt(moment().format("w"));
    const filteredRaids: any = raids[weekNumber % 4].filter((x: any) => x.rarity === rarityLevel && x.id !== excludeFromGeneration);

    const rand = getRndInteger(0, filteredRaids.length);

    let special = null;
    if (filteredRaids[rand].forme !== null) {
        special = chance.pickset(filteredRaids[rand].forme, 1)[0];
    } else {
        special = filteredRaids[rand].special;
    }
    return {
        ...randomPokemon(filteredRaids[rand].id, 100, ["rest", "explosion", "lifedew", "recover", "wish", "bellydrum", "finalgambit", "swallow", "leechseed", "gigadrain", "leechlife", "memento", "metronome", "healingwish", "lunardance", "mistyexplosion", "selfdestruct", "steelbeam", "mindblown"], -1, special, 0, undefined, true),
        rarityLevel,
    };
}

async function generateNewRaid(client: BotClient, previousRaidDexId = 0) {
    const nextRaid = new Raid();
    nextRaid.pokemon = createRandomRaidPokemon(previousRaidDexId);
    nextRaid.time = moment().add(client.config.raidStartingDelay, "minutes").toDate();
    nextRaid.hp = 999999999;
    nextRaid.maxHp = 999999999;
    await nextRaid.save();

    if (process.env.RAID_CHANNEL) {
        const embed = new EmbedBuilder();
        embed.setDescription(`New raid will start in ${client.config.raidStartingDelay} minutes!\nWill you defeat **${getPokemon(nextRaid.pokemon.dexId, nextRaid.pokemon.special).displayName}?**`)
            .setImage(getImage(nextRaid.pokemon, true, nextRaid.pokemon.shiny, nextRaid.pokemon.special))
            .setTitle("Raid announcement")
            .setTimestamp();
        client.restClient.post(Routes.channelMessages(process.env.RAID_CHANNEL), {
            body: {
                embeds: [
                    embed
                ]
            }
        }).then((res: any) => {
            if (process.env.RAID_CROSS_POST) {
                client.restClient.post(Routes.channelMessageCrosspost(res.channel_id, res.id), {
                    body: {
                        embeds: [
                            embed
                        ]
                    }
                });
            }
        }).catch((error) => {
            Logger.error(error);
        });
    }
}

export async function checkRaid(client: BotClient) {
    const raid = await Raid.findOne({ time: { $exists: true } }).exec();
    if (raid === null) {
        generateNewRaid(client);
        return;
    }

    if (moment() >= moment(raid.time).add(client.config.raidDuration, "minutes")) {
        client.setRaid(raid.pokemon);
        await raid.deleteOne();

        generateNewRaid(client, raid.pokemon.dexId);

        const logs = await RaidLog.find({ checked: { $exists: false } }).exec();
        await RaidLog.updateMany({ checked: { $exists: false } }, { $set: { checked: true } }).exec();
        logs.forEach(log => {
            client.setRaidTries(log.discord_id, 3);
            addStats(log.discord_id, "raids", 1);
            addStats(log.discord_id, "raidsDamage", log.damageDealt);
            logs.forEach(async (element: any, index: number) => {
                const embed = new EmbedBuilder();
                embed.setDescription(`Raid is finished. You dealt **${element.damageDealt}** damage to raid!\nYou are ranked **#${index + 1}** out ${logs.length} trainers in damage amount on this raid.\n\n__**You have now 3 tries to catch the pokemon! Catch it before next raids starts!**__`)
                    .setImage(getImage(raid.pokemon, true, raid.pokemon.shiny, raid.pokemon.special))
                    .setTitle("Raid");
                client.discordClient.users.send(log.discord_id, { embeds: [embed] }).catch((error) => {
                    Logger.error(error);
                });
            });
        });
    }
}
