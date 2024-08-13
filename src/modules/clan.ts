import { Chance } from "chance";
import clanRaids from "../../data/clanRaids";
import { randomPokemon } from "./world";
import { Clan } from "../models/clan";
import { CommandContext } from "../types/command";
import { ClanRaid } from "../models/clanRaid";
import { ClanRaidLog } from "../models/clanRaidLog";
import { getPokemon } from "./pokedex";
import { EmbedBuilder, Routes } from "discord.js";
import BotClient from "./client";
import Logger from "./logger";

export function generateClanRaid(clanRaidLevel: number, clanLevel: number, forceRarity?: number, forceShiny?: boolean) {
    const chance = new Chance();
    const oddsPerLevel = [[5, 4, 1], [4, 5, 1], [3, 6, 1], [2, 6, 2], [2, 6, 3], [2, 5, 4]];
    let rarityLevel = chance.weighted([0, 1, 2], oddsPerLevel[clanRaidLevel]);
    const shinyOdds = [0, 1, 3, 9, 27, 81];
    if (forceRarity !== undefined) {
        rarityLevel = forceRarity;
    }
    //rarityLevel = 0;

    const filteredRaids: any = clanRaids.filter((x: any) => x.rarity === rarityLevel);

    const rand = chance.integer({ min: 0, max: filteredRaids.length });

    let special = null;
    if (filteredRaids[rand].forme !== null) {
        special = chance.pickset(filteredRaids[rand].forme, 1)[0];
    } else {
        special = filteredRaids[rand].special;
    }
    return {
        ...randomPokemon(filteredRaids[rand].id, 100, ["rest", "explosion", "lifedew", "recover", "wish", "bellydrum", "finalgambit", "swallow", "leechseed", "gigadrain", "leechlife", "memento", "metronome", "healingwish", "lunardance", "mistyexplosion", "selfdestruct", "steelbeam"], forceShiny ? 1000 : shinyOdds[clanRaidLevel], special, 0, undefined),
        rarityLevel,
    };
}

export async function endRaid(raid: ClanRaid, clan: Clan, context: CommandContext, died: boolean) {
    const raidLogs = await ClanRaidLog.find({ raid: raid._id });
    let text = "";
    let hits = 1;
    raidLogs.forEach((raidLog, index: number) => {
        hits += raidLog.hits ?? 0;
        if (died) {
            context.client.setClanRaidTries(raidLog.discord_id ?? "", clan.perks[5] + 1 ?? 1);
            context.client.setClanRaidPokemon(raidLog.discord_id ?? "", raid.pokemon);
        }
        text += `#${index + 1} <@${raidLog.discord_id}> - ${(raidLog.damageDealt ?? 0).toLocaleString()}\n`;
    });

    const experience = Math.round(
        (1 // a
            * 1
            * 1
            * getPokemon(raid.pokemon.dexId).base_experience // b
            * 100 // L
            / 7)
        * 0.4
        * hits
        * (died ? 1 : 1 - (raid.hp / raid.maxHp))
    );
    clan.updateOne({ $inc: { experience } });
    broadcastClanMessage(context.client, clan.channel, context.interaction.channelId ?? "", `Raid has ${died ? `been defeated, good job. You got ${clan.perks[5] + 1 ?? 1} tries to catch it with \`/clan catch\` if you participated to that raid.` : "ended but you didn't defeat the Pokémon"}.\nThe clan gained **${experience.toLocaleString()}** Exp. Points.\nHere's the damage leaderboard:\n\n${text}`, `Raid ${died ? "defeated!" : "has ended"}`);
}

export async function broadcastClanMessage(client: BotClient, channel: string, backupChannel: string, message: string, title: string, image = "") {
    const embed = new EmbedBuilder();
    embed.setDescription(message)
        .setImage(image)
        .setTitle(title);
    if (!channel) {
        client.restClient.post(Routes.channelMessages(backupChannel), {
            body: {
                embeds: [
                    embed
                ]
            }
        }).catch((error) => {
            Logger.error(error);
        });
    }
    client.restClient.post(Routes.channelMessages(channel), {
        body: {
            embeds: [
                embed
            ]
        }
    }).catch((error) => {
        client.restClient.post(Routes.channelMessages(backupChannel), {
            body: {
                embeds: [
                    embed
                ]
            }
        });
        Logger.error(error);
    });
}