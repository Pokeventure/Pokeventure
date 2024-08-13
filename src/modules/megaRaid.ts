import moment from "moment";
import { MegaRaid } from "../models/megaRaid";
import BotClient from "./client";
import { Chance } from "chance";
import { megaRaids } from "../../data/megaraids";
import { randomPokemon } from "./world";
import { IPokemon } from "../types/pokemon";
import { EmbedBuilder, Routes } from "discord.js";
import { getImage, sendDM } from "./utils";
import { getPokemon } from "./pokedex";
import Logger from "./logger";
import { MegaRaidLog } from "../models/megaRaidLog";
import { addToInventory } from "./database";
import items from "../../data/items";

export function createRandomMegaRaid(excludeFromGeneration = 0) {
    const chance = new Chance();
    const rarityLevel = chance.weighted([0, 1, 2, 3], [5, 4, 3, 1]);
    const filteredRaids = megaRaids.filter((x: any) => x.id !== excludeFromGeneration && x.rarity === rarityLevel);

    const rand = chance.integer({ min: 0, max: filteredRaids.length });

    return {
        ...randomPokemon(filteredRaids[rand].id, 150, ["rest", "explosion", "lifedew", "recover", "wish", "bellydrum", "finalgambit", "swallow", "leechseed", "gigadrain", "leechlife", "memento", "metronome", "healingwish", "lunardance", "mistyexplosion", "selfdestruct", "steelbeam"], 1, filteredRaids[rand].special, 5, undefined, true),
        drop: filteredRaids[rand].drop,
        rarityLevel,
    };
}

export async function createMegaRaid(lastPokemon: IPokemon | null) {
    const pokemon = createRandomMegaRaid(lastPokemon?.dexId);
    const nextRaid = new MegaRaid();
    nextRaid.pokemon = pokemon;
    nextRaid.drop = pokemon.drop;
    nextRaid.hp = 2500000 + (pokemon.rarityLevel * 1250000);
    nextRaid.maxHp = 2500000 + (pokemon.rarityLevel * 1250000);
    await nextRaid.save();
    return nextRaid;
}

export async function startMegaRaid(client: BotClient) {
    const raid = await MegaRaid.findOne({ time: { $gt: 0 } });

    if (!raid) {
        const nextRaid = await createMegaRaid(null);
        nextRaid.time = moment().add(60, "m").toDate();
        await nextRaid.save();
        if (process.env.MEGA_RAID_CHANNEL) {
            const embed = new EmbedBuilder();
            const nextPokemon = nextRaid.pokemon;
            embed.setDescription(`New Mega Raid will start in 60 minutes!\nWill you defeat **${getPokemon(nextPokemon.dexId, nextPokemon.special).displayName}?**`)
                .setImage(getImage(nextRaid.pokemon, true, nextRaid.pokemon.shiny, nextRaid.pokemon.special))
                .setTitle("Raid announcement")
                .setTimestamp();
            client.restClient.post(Routes.channelMessages(process.env.MEGA_RAID_CHANNEL), {
                body: {
                    embeds: [
                        embed
                    ]
                }
            }).then((res: any) => {
                if (process.env.MEGA_RAID_CROSS_POST) {
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
        return;
    }
}

export async function checkMegaRaid(client: BotClient) {
    const raid = await MegaRaid.findOne();
    if(!raid) {
        startMegaRaid(client);
        return;
    }
    if (raid.hp > 0 && moment() > moment(raid.time)) return;
    if (raid.hp <= 0 || moment() > moment(raid.time).add(3, "h")) {
        await raid.deleteOne();

        startMegaRaid(client);

        const logs = await MegaRaidLog.find({ ok: false }).exec();
        await MegaRaidLog.updateMany({ ok: false }, { $set: { ok: true } }).exec();
        const top = Math.floor(logs.length * 0.20) + 1;
        const middle = Math.floor(logs.length * 0.50);
        logs.forEach(async (element: any, index: any) => {
            let rank = 1;
            if (index < top) {
                rank = 3;
            } else if (index < top + middle) {
                rank = 2;
            }
            addToInventory(element.discord_id, raid.drop, rank);
        });

        logs.forEach(async (element: any, index: any) => {
            let rank = 1;
            if (index < top) {
                rank = 3;
            } else if (index < top + middle) {
                rank = 2;
            }
            const embed = new EmbedBuilder();
            embed.setDescription(`You dealt **${element.damageDealt}** HP!\nYou are ranked **#${index + 1}** out ${logs.length} trainers in damage on this raid.\n\nThanks to your effort, you received x${rank} ${items[raid.drop].emoji} ${items[raid.drop].name}`)
                .setImage(getImage(raid.pokemon, true, raid.pokemon.shiny, raid.pokemon.special))
                .setTitle("MEGA RAID HAS ENDED");

            sendDM(client, element.discord_id, {
                embeds: [embed],
            });
        });
    }
}