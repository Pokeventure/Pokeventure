import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, InteractionResponse, SlashCommandBuilder } from "discord.js";
import { Command, CommandContext } from "../types/command";
import { Clan as ClanModel } from "../models/clan";
import { Player } from "../models/player";
import { ClanHistory } from "../models/clanHistory";
import { askConfirmation, getImage, sendEmbed } from "../modules/utils";
import { addCoins, createPokemon } from "../modules/database";
import { ClanRaid } from "../models/clanRaid";
import moment from "moment";
import { ClanRaidLog } from "../models/clanRaidLog";
import { Fight } from "../modules/fight";
import { genderEmoji, getPokemon, getStats, rarity } from "../modules/pokedex";
import { raidMoves } from "../modules/raid";
import Logger from "../modules/logger";
import { broadcastClanMessage, endRaid, generateClanRaid } from "../modules/clan";
import { IPokemon } from "../types/pokemon";
import { randomPokemon } from "../modules/world";

const perks = [
    {
        name: "Rarity Incense",
        price: [1000000, 5000000, 50000000, 250000000, 250000000 * 2],
        unlocks: [0, 12, 26, 20, 40],
        description: "Increase chances to get a better rarity",
    }, {
        name: "Shiny Incense",
        price: [1000000, 5000000, 50000000, 250000000, 250000000 * 2],
        unlocks: [0, 8, 18, 38, 42],
        description: "Increase chances to get a shiny Pokemon",
    }, {
        name: "EXP. Boost",
        price: [1000000, 5000000, 50000000, 250000000, 250000000 * 2],
        unlocks: [0, 6, 22, 34, 44],
        description: "Increase experience gained",
    }, {
        name: "Raid Booster",
        price: [1000000, 5000000, 50000000, 250000000, 250000000 * 2],
        unlocks: [0, 16, 28, 34, 46],
        description: "Increase chances to get better raids",
    }, {
        name: "Member slots",
        price: [1000000, 5000000, 50000000, 250000000, 250000000 * 2],
        unlocks: [0, 10, 20, 36, 48],
        description: "Add member slots",
    }, {
        name: "Raid tries",
        price: [100000000, 500000000, 2000000000],
        unlocks: [0, 24, 40],
        description: "Add more tries to catch a raid Pokémon"
    },
];
const romanNumber = ["0", "I", "II", "III", "IV", "V", "VI"];

function calculateLevel(currentExperience: number) {
    return Math.floor(Math.sqrt(Math.sqrt(currentExperience / 10000))) + 1;
}

function nextLevelExperience(currentExperience: number) {
    const level = calculateLevel(currentExperience);
    return Math.pow(level, 4) * 10000 - Math.pow((level - 1), 4) * 10000;
}

export const Clan: Command = {
    commandName: "clan",
    displayName: "Clan",
    fullDescription: "",
    needPlayer: true,
    requireStart: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("clan")
        .setDescription("Clan")
        .addSubcommand(input => input.setName("view").setDescription("View info about your clan"))
        .addSubcommand(input => input.setName("create").setDescription("Create a clan").addStringOption(option => option.setName("name").setDescription("Clan name").setRequired(true)))
        .addSubcommand(input => input.setName("delete").setDescription("Delete your clan"))
        .addSubcommand(input => input.setName("donate").setDescription("Donate money to clan").addIntegerOption(option => option.setName("amount").setDescription("Coin amount to give to clan").setRequired(true)))
        .addSubcommand(input => input.setName("quit").setDescription("Quit your clan"))
        .addSubcommand(input => input.setName("members").setDescription("See members in your clan"))
        .addSubcommand(input => input.setName("perks").setDescription("See your clan's perks"))
        .addSubcommand(input => input.setName("shop").setDescription("View clan's shop"))
        .addSubcommand(input => input.setName("buy").setDescription("Buy perk from shop").addIntegerOption(input => input.setName("number").setDescription("Perk number").setRequired(true)))
        .addSubcommand(input => input.setName("invite").setDescription("Invite a player to your clan").addUserOption(input => input.setName("player").setDescription("Player to invite").setRequired(true)))
        .addSubcommand(input => input.setName("promote").setDescription("Promote a player to officer role").addUserOption(input => input.setName("player").setDescription("Player to promote").setRequired(true)))
        .addSubcommand(input => input.setName("demote").setDescription("Demote a player to simple member").addUserOption(input => input.setName("player").setDescription("Player to demote").setRequired(true)))
        .addSubcommand(input => input.setName("set-owner").setDescription("Give ownership to an other member").addUserOption(input => input.setName("player").setDescription("New owner").setRequired(true)))

        .addSubcommand(input => input.setName("banner").setDescription("Set your clan's banner").addStringOption(input => input.setName("link").setDescription("Link of the banner").setRequired(true)))
        .addSubcommand(input => input.setName("logo").setDescription("Set your clan's logo").addStringOption(input => input.setName("link").setDescription("Link of the logo").setRequired(true)))
        //.addSubcommand(input => input.setName("color").setDescription("Set your clan's color").addStringOption(input => input.setName("color").setDescription("Hex color (#XXXXXX)").setRequired(true)))
        .addSubcommand(input => input.setName("motd").setDescription("Set message of the day of your clan").addStringOption(input => input.setName("text").setDescription("Message of the day").setRequired(true)))
        .addSubcommand(input => input.setName("kick").setDescription("Kick a player from your clan").addUserOption(input => input.setName("player").setDescription("Player to kick").setRequired(true)))

        .addSubcommand(input => input.setName("start-raid").setDescription("Start a Clan Raid"))
        .addSubcommand(input => input.setName("join-raid").setDescription("Join a Clan Raid"))
        .addSubcommand(input => input.setName("raid").setDescription("Fight Clan Raid"))
        .addSubcommand(input => input.setName("catch").setDescription("Catch Pokémon from Clan Raid"))

        .addSubcommand(input => input.setName("server").setDescription("Redirect announcement messages in this channel (level up, new raid...)"))
        .setDMPermission(true)
    ,
    handler: async (context: CommandContext) => {
        if (context.interaction.options.getSubcommand() === "create") {
            if (context.player.clan) {
                return sendEmbed(context, { description: "You are alreay in a clan." });
            } else if (context.player.money.coins < 10000000) {
                return sendEmbed(context, { description: `You need ${(10000000).toLocaleString()} <:pokecoin:741699521725333534> coins to create a clan.` });
            }
            context.player.money.coins -= 10000000;

            const clan = new ClanModel();
            clan.name = context.interaction.options.getString("name", true);
            clan.owner = context.user.id;
            await clan.save();

            context.player.clan = clan;
            context.player.save();

            const history = new ClanHistory();
            history.discord_id = context.user.id;
            history.clan = clan._id;
            history.save();
            return sendEmbed(context, { description: `Your clan **${context.interaction.options.getString("name", true)}** has been created.` });
        }

        if (!context.player.clan) {
            return sendEmbed(context, { description: "You are not in a clan. You can create one with `/clan create`" });
        }

        if (context.interaction.options.getSubcommand() === "view") {
            const clan = context.player?.clan;
            const embed = new EmbedBuilder();
            const members = await Player.find({ clan: clan._id }).exec();
            const history = await ClanHistory.findOne({ discord_id: context.user.id }).exec();
            const level = calculateLevel(clan.experience);
            embed.addFields(
                { name: "Infos", value: `Leader: <@${clan.owner}>\nMembers: ${members.length}/${10 + (context.player?.clan.perks[4] ?? 0) * 5}`, inline: true },
                { name: "Stats", value: `**Level**: ${level}\n**Experience**:\n${clan.experience.toLocaleString()}/${nextLevelExperience(clan.experience).toLocaleString()}\n**Balance**:\n${clan.balance?.toLocaleString() ?? 0} <:pokecoin:741699521725333534>`, inline: true },
                { name: "Your contribution", value: `Experience: ${history?.experience.toLocaleString() ?? 0}\nCoins: ${history?.coins?.toLocaleString() ?? 0} <:pokecoin:741699521725333534>\nDojo points: ${history?.dojoPoints} (${history?.dojoPointsAllTime} all time)`, inline: true },
                //{ name: "Dojo", value: `Points: ${clan.dojoPoints}\nRanking: ${clan.ranking > 0 ? `#${clan.ranking}` : "Not ranked yet"}` }
            );
            embed.setTitle(clan.name);
            embed.setImage(clan.banner);
            embed.setThumbnail(clan.logo);
            embed.setDescription(clan.motd);
            //embed.setColor(clan.color);
            /* embed.setFooter({
                text: "Dojo ranking is updated once every 10 minutes",
            }); */
            context.interaction.editReply({ embeds: [embed] });
        } else if (context.interaction.options.getSubcommand() === "delete") {
            if (context.player.clan.owner !== context.user.id) {
                return sendEmbed(context, { description: "You are not the owner of the clan." });
            }
            sendEmbed(context, { description: `Are you sure you want to delete your Clan **${context.player.clan.name}**?` }).then((message) => {
                if (message instanceof InteractionResponse) return;
                askConfirmation(message, context, async () => {
                    const player = await Player.findOne({ discord_id: context.user.id });
                    if (player?.clan?.owner === context.user.id) {
                        await ClanHistory.deleteMany({ clan: player.clan._id });
                        player.clan.deleteOne();
                        sendEmbed(context, { description: `Your clan **${player.clan.name}** has been deleted` });
                    }
                });
            });
        } else if (context.interaction.options.getSubcommand() === "donate") {
            const amount = context.interaction.options.getInteger("amount", true);

            if (amount <= 0) {
                return sendEmbed(context, { description: "You must donate a positive amount of coins." });
            }
            if (amount > context.player.money.coins) {
                return sendEmbed(context, { description: `You don"t have ${amount.toLocaleString()} <:pokecoin:741699521725333534>.` });
            }
            addCoins(context.user.id, -amount, "clan");
            context.player.clan.updateOne({ $inc: { balance: amount } }).exec();
            ClanHistory.updateOne({ discord_id: context.user.id }, { $inc: { coins: amount } }).exec();
            sendEmbed(context, { description: `You donated ${amount.toLocaleString()} <:pokecoin:741699521725333534> to your clan.` });
            broadcastClanMessage(context.client, context.player.clan.channel, context.interaction.channelId ?? "", `<@${context.user.id}> donated **${amount.toLocaleString()} <:pokecoin:741699521725333534>** to the clan.`, "Donation");
        } else if (context.interaction.options.getSubcommand() === "quit") {
            if (context.player.clan.owner === context.user.id) {
                return sendEmbed(context, { description: "You are the leader of the clan. You can't quit the clan." });
            }
            sendEmbed(context, { description: `Are you sure you want to quit your Clan **${context.player.clan.name}**?` }).then((message) => {
                if (message instanceof InteractionResponse) return;
                askConfirmation(message, context, async () => {
                    const player = await Player.findOne({ discord_id: context.user.id }).exec();
                    if (player && player.clan?.owner !== context.user.id) {
                        await ClanHistory.deleteOne({ discord_id: context.user.id });
                        sendEmbed(context, { description: `You left **${player?.clan?.name}**` });
                        player.clan = null;
                        player.save();
                    }
                });
            });
        } else if (context.interaction.options.getSubcommand() === "members") {
            const clan = context.player?.clan;
            const members = await ClanHistory.find({ clan: clan._id }).exec();

            let text = "";
            members.forEach((member) => {
                text += `- <@${member.discord_id}> ${member.role > 0 ? "- Officer" : ""} ${member.discord_id === clan.owner ? "👑" : ""}\n`;
            });

            sendEmbed(context, { description: `**${clan.name}**\n\nMembers:\n${text}` });
        } else if (context.interaction.options.getSubcommand() === "perks") {
            const clan = context.player?.clan;

            let text = "";
            if (clan.perks !== null) {
                for (const [key, value] of Object.entries(clan.perks)) {
                    text += `**${perks[parseInt(key)].name} ${romanNumber[<number>value]}**: ${perks[parseInt(key)].description}\n\n`;
                }
            }
            sendEmbed(context, { description: `**${clan.name}"s perks**\n\n${text}` });
        } else if (context.interaction.options.getSubcommand() === "shop") {
            const clan = context.player?.clan;
            const clanLevel = calculateLevel(clan.experience);
            let text = "";
            perks.forEach((element, index) => {
                const level = clan.perks[index] ?? 0;
                if (level < perks[index].price.length) {
                    const levelUnlock = perks[index].unlocks[level];
                    text += `\`#${index + 1}\` ${element.name} ${romanNumber[level + 1]}: ${element.description}\n${clanLevel >= levelUnlock ? `Price: ${element.price[level].toLocaleString()} coins <:pokecoin:741699521725333534>` : `**Unlocks at level ${levelUnlock}**`}\n\n`;
                }
            });
            sendEmbed(context, { description: `Clan level: ${clanLevel}\nClan balance: ${clan.balance.toLocaleString()} <:pokecoin:741699521725333534>\n\n${text}`, title: "Perks shop" });
        } else if (context.interaction.options.getSubcommand() === "buy") {
            const clan = context.player.clan;
            const history = await ClanHistory.findOne({ discord_id: context.user.id }).exec();
            if ((!history || history.role < 1) && clan.owner !== context.user.id) {
                return sendEmbed(context, { description: "You need Officer role to purchase in the shop." });
            }
            const clanPerks = clan.perks ?? {};
            const slot = context.interaction.options.getInteger("number", true) - 1;
            const currentLevel = clan.perks[slot] ?? 0;
            if (perks[slot] === undefined) {
                sendEmbed(context, { description: "Invalid perk number" });
            } else if (calculateLevel(clan.experience) >= perks[slot].unlocks[currentLevel]) {
                if (clan.balance >= perks[slot].price[currentLevel]) {
                    clanPerks[slot] = (clan.perks[slot] ?? 0) + 1;
                    await clan.updateOne({ $inc: { balance: -perks[slot].price[currentLevel] }, $set: { perks: clanPerks } });
                    sendEmbed(context, { description: `You clan has now the perks **${perks[slot].name} ${romanNumber[currentLevel + 1]}**` });
                } else {
                    sendEmbed(context, { description: `Your clan need ${perks[slot].price[currentLevel].toLocaleString()} <:pokecoin:741699521725333534> in its balance but you have ${clan.balance.toLocaleString()} <:pokecoin:741699521725333534>.` });
                }
            } else {
                sendEmbed(context, { description: `Your clan need to be level **${perks[slot].unlocks[currentLevel]}** but it is level **${calculateLevel(clan.experience)}**.` });
            }
        }
        else if (context.interaction.options.getSubcommand() === "invite") {
            const mention = context.interaction.options.getUser("player", true);
            const clan = context.player.clan;
            if (mention.bot) {
                return sendEmbed(context, { description: "You can't invite bot in a clan." });
            }
            const members = await ClanHistory.find({ clan: clan._id }).exec();
            if (members.length >= 10 + (context.player.clan.perks[4] ?? 0) * 5) {
                return sendEmbed(context, { description: "You reached the maximum number of members." });
            }
            const invitedPlayer = await Player.findOne({ discord_id: mention.id }).exec();
            if (!invitedPlayer) {
                return sendEmbed(context, { description: "This player has not started their adventure." });
            }
            if (invitedPlayer.clan) {
                return sendEmbed(context, { description: "You can't invite this user to your clan, they are already in an other clan." });
            }
            sendEmbed(context, {
                description: `Hi <@${mention.id}>! <@${context.user.id}> invited you to join their clan **${context.player.clan.name}**.`, footer: { text: "Invitation will expire in 60 seconds." }
            }).then((message) => {
                if (message instanceof InteractionResponse) return;
                askConfirmation(message, context, async () => {
                    const player = await Player.findOne({ discord_id: mention.id }).exec();
                    if (!player || player.clan) {
                        return sendEmbed(context, { description: "You can't accept, you are already in a clan." });
                    }
                    player.clan = context.player.clan;
                    await player.save();

                    const history = new ClanHistory();
                    history.discord_id = mention.id;
                    history.clan = clan._id;
                    await history.save();

                    sendEmbed(context, { description: `You joined the clan ${clan.name}` });
                }, mention.id);
            });
        } else if (context.interaction.options.getSubcommand() === "promote") {
            const clan = context.player.clan;
            if (clan.owner !== context.user.id) {
                return sendEmbed(context, { description: "Only the owner can promote." });
            }

            const mention = context.interaction.options.getUser("player", true);
            const player = await Player.findOne({ discord_id: mention.id }).exec();
            if (!player || !player.clan?.equals(clan)) {
                return sendEmbed(context, { description: "This user is not in your clan." });
            }
            ClanHistory.updateOne({ discord_id: mention.id }, { $set: { role: 1 } }).exec();
            sendEmbed(context, { description: `<@${mention.id}> is now Officer.` });
        } else if (context.interaction.options.getSubcommand() === "demote") {
            const clan = context.player.clan;
            if (clan.owner !== context.user.id) {
                return sendEmbed(context, { description: "Only the owner can demote." });
            }

            const mention = context.interaction.options.getUser("player", true);
            const player = await Player.findOne({ discord_id: mention.id }).exec();
            if (!player || player.clan?._id !== clan._id) {
                return sendEmbed(context, { description: "This user is not in your clan." });
            }
            ClanHistory.updateOne({ discord_id: mention.id }, { $set: { role: 0 } }).exec();
            sendEmbed(context, { description: `<@${mention.id}> is now a simple member.` });
        } else if (context.interaction.options.getSubcommand() === "set-owner") {
            const clan = context.player.clan;
            if (clan.owner !== context.user.id) {
                return sendEmbed(context, { description: "You are not the owner of the clan." });
            }

            const mention = context.interaction.options.getUser("player", true);
            const player = await Player.findOne({ discord_id: mention.id }).exec();
            if (!player || player.clan?._id !== clan._id) {
                return sendEmbed(context, { description: "This user is not in your clan." });
            }

            clan.owner = mention.id;
            await clan.save();
            sendEmbed(context, { description: `<@${mention.id}> is the new owner of the clan.` });
        } else if (context.interaction.options.getSubcommand() === "banner") {
            const clan = context.player.clan;
            if (clan.owner !== context.user.id) {
                return sendEmbed(context, { description: "You must be the owner to change clan's settings." });
            }
            const regex = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)/);
            if (!context.interaction.options.getString("link", true).match(regex)) {
                sendEmbed(context, { description: "Invalid image link." });
            }
            clan.banner = context.interaction.options.getString("link", true);
            clan.save();
            sendEmbed(context, { description: "Your Clan's banner has been updated.", image: context.interaction.options.getString("link", true) });
        } else if (context.interaction.options.getSubcommand() === "logo") {
            const clan = context.player.clan;
            if (clan.owner !== context.user.id) {
                return sendEmbed(context, { description: "You must be the owner to change clan's settings." });
            }
            const regex = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)/);
            if (!context.interaction.options.getString("link", true).match(regex)) {
                sendEmbed(context, { description: "Invalid image link." });
            }
            clan.logo = context.interaction.options.getString("link", true);
            clan.save();
            sendEmbed(context, { description: "Your Clan's logo has been updated.", image: context.interaction.options.getString("link", true) });
        } else if (context.interaction.options.getSubcommand() === "motd") {
            const clan = context.player.clan;
            if (clan.owner !== context.user.id) {
                return sendEmbed(context, { description: "You must be the owner to change clan's settings." });
            }
            clan.motd = context.interaction.options.getString("text", true);
            clan.save();
            sendEmbed(context, { description: "Your Clan's message of the day has been updated." });
        } else if (context.interaction.options.getSubcommand() === "kick") {
            const clan = context.player.clan;
            const history = await ClanHistory.findOne({ discord_id: context.user.id }).exec();

            if (clan.owner !== context.user.id && history?.role !== 1) {
                return sendEmbed(context, { description: "You must be the owner or officer to kick someone." });
            }
            const mention = context.interaction.options.getUser("player", true);
            const player = await Player.findOne({ discord_id: mention.id }).exec();
            if (!player || !player.clan?.equals(clan)) {
                return sendEmbed(context, { description: "This user is not in your clan." });
            }
            if (clan.owner === mention.id) {
                return sendEmbed(context, { description: "You can't kick the owner." });
            }
            await ClanHistory.deleteOne({ discord_id: mention.id });
            player.clan = null;
            player.save();
            sendEmbed(context, { description: `You kicked <@${mention.id}> from the clan.` });
        } else if (context.interaction.options.getSubcommand() === "raid") {
            const clan = context.player.clan;
            const raid = await ClanRaid.findOne({ clan: clan._id }).exec();

            if (!raid) {
                return sendEmbed(context, { description: "There's currently no raid.", title: clan.name });
            }
            const history = await ClanHistory.findOne({ discord_id: context.user.id }).exec();
            if (!history || moment(raid.time).subtract(5, "minutes") <= moment(history.createdAt)) {
                return sendEmbed(context, { description: "You joined clan after the beginning of the raid. You will have to wait for next one to join the fight.", title: "Clan Raid" });
            }
            if (moment(raid.time) > moment()) {
                const logs = await ClanRaidLog.find({ raid: raid._id }).exec();
                return sendEmbed(context, { description: `Next raid will start in ${moment(raid.time).diff(new Date(), "minutes")} minutes.\n${logs.length} members are participating to the raid.`, title: "Clan Raid" });
            }
            const log = await ClanRaidLog.findOne({ discord_id: context.user.id, raid: raid._id }).exec();

            if (!log) {
                sendEmbed(context, { description: "You are not participating to this raid.", title: "Clan Raid" });
            }
            const cooldown = await context.client.getClanRaidCooldown(context.user.id);
            if (cooldown) {
                return sendEmbed(context, { description: "You are still in cooldown.", title: "Clan Raid" });
            }
            const fight: Fight = new Fight();
            const pokemon = context.player?.selectedPokemon;
            if (pokemon === null) {
                return sendEmbed(context, { description: "You must select a Pokémon before." });
            }

            const playerPokemonData = getPokemon(pokemon.dexId, pokemon.special);
            const playerPokemonStats = getStats(pokemon.dexId, pokemon.level, pokemon.ivs, pokemon.special, pokemon.nature);
            const moves: any[] = [];
            playerPokemonData.types.forEach(type => {
                moves.push(raidMoves[type][playerPokemonStats.atk > playerPokemonStats.spa ? 0 : 1]);
            });
            pokemon.moves = moves;

            const pokemonRaidData = getPokemon(raid.pokemon.dexId, raid.pokemon.special);
            const raidPokemonStats = getStats(raid.pokemon.dexId, raid.pokemon.level, raid.pokemon.ivs, raid.pokemon.special, raid.pokemon.nature);
            const pokemonRaidMoves: any[] = [];
            pokemonRaidData.types.forEach(type => {
                pokemonRaidMoves.push(raidMoves[type][raidPokemonStats.atk > raidPokemonStats.spa ? 0 : 1]);
            });
            if (pokemonRaidMoves.length === 1) {
                pokemonRaidMoves.push(raidMoves.Raid[0]);
            }
            raid.pokemon.moves = pokemonRaidMoves;

            raid.pokemon.level = pokemon.level < 100 ? pokemon.level + Math.round(pokemon.level / 100) : 110;
            raid.pokemon.item = "raidreduction";

            fight.start(context, [pokemon], [raid.pokemon], 2, raid.maxHp, raid.hp).then(async (result) => {
                let damageDealt = result.victory === 1 ? raid.hp : Math.max(0, raid.hp - (result.hp ?? 0));
                damageDealt = Math.round(damageDealt);
                ClanRaid.updateOne({ _id: raid._id }, { $inc: { hp: -damageDealt } });
                const updatedRaid = await ClanRaid.findOne({ _id: raid._id }).exec();
                if (!updatedRaid) {
                    return;
                }
                if (updatedRaid.hp <= 0 || moment() > moment(raid.time).add(15, "minutes")) {
                    await endRaid(updatedRaid, clan, context, updatedRaid.hp <= 0);
                }
                const duration = Math.max(moment(raid.time).add(15, "minutes").diff(moment(), "seconds"), 0);
                sendEmbed(context, { description: `You dealt ${damageDealt} damage to **${pokemonRaidData.displayName}**.\nYou can fight raid again in ${10} seconds.\n\n`, image: result.image, footer: { text: `Raid ends in ${moment.duration(duration, "seconds").humanize()}` }, title: "Clan Raid" });
                context.client.setClanRaidCooldown(context.user.id);
            }).catch((error) => {
                Logger.error(error);
            });
        } else if (context.interaction.options.getSubcommand() === "start-raid") {
            const clan = context.player.clan;
            const history = await ClanHistory.findOne({ discord_id: context.user.id }).exec();

            if (clan.owner !== context.user.id && history?.role !== 1) {
                return sendEmbed(context, { description: "You must be the owner or officer to start a raid." });
            }
            const raid = await ClanRaid.findOne({ clan: clan._id }).exec();

            if (raid) {
                return sendEmbed(context, { description: "A clan raid is currently happening. You will have to wait until it is finished to start a new raid." });
            }
            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("1")
                        .setLabel("Accept")
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId("2")
                        .setLabel("Decline")
                        .setStyle(ButtonStyle.Danger),
                );
            if (clan.rewards !== undefined) {
                if (clan.rewards.rare > 0) {
                    row.addComponents(new ButtonBuilder()
                        .setCustomId("3")
                        .setLabel("Guaranted Rare raid")
                        .setStyle(ButtonStyle.Primary));
                }
                if (clan.rewards.shiny > 0) {
                    row.addComponents(new ButtonBuilder()
                        .setCustomId("4")
                        .setLabel("Guaranted Shiny raid")
                        .setStyle(ButtonStyle.Primary));
                }
                if (clan.rewards.shinyRare > 0) {
                    row.addComponents(new ButtonBuilder()
                        .setCustomId("5")
                        .setLabel("Guaranted Rare Shiny raid")
                        .setStyle(ButtonStyle.Primary));
                }
            }
            const embed = new EmbedBuilder();
            embed.setDescription(`Starting a raid will spawn a random raid that has chances to be shiny and will have to be defeated in order to catch it.\n\nTo start a raid it will cost **${(100000).toLocaleString()} <:pokecoin:741699521725333534> coins** then each member joining the raid will cost **${(100000).toLocaleString()} <:pokecoin:741699521725333534> coins**.\nDo you want to start a raid?`);
            embed.setTitle("Start a clan raid");
            context.interaction.editReply({ embeds: [embed], components: [row] }).then((interaction) => {
                const raidCollector = interaction.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

                raidCollector.on("collect", async raidInteraction => {
                    if (raidInteraction.user.id === context.interaction.user.id) {
                        raidCollector.stop();
                        let randomRaidPokemon: IPokemon;
                        const updatedClan = await ClanModel.findOne({ _id: clan._id }).exec();
                        if (raidInteraction.customId === "1") {
                            if (!updatedClan || updatedClan.balance < 100000) {
                                sendEmbed(context, { description: `Your clan doesn't have enough coins to start a raid. You need ${(100000).toLocaleString()} coins to start one.` });
                                return;
                            }
                            await ClanModel.updateOne({ _id: updatedClan._id }, { $inc: { balance: -100000 } }).exec();
                            randomRaidPokemon = generateClanRaid(clan.perks[3] ?? 0, calculateLevel(updatedClan.experience));
                        } else if (raidInteraction.customId === "3") {
                            if (!updatedClan || updatedClan.rewards?.rare <= 0) {
                                return;
                            }
                            await updatedClan.updateOne({ $inc: { "rewards.rare": -1 } }).exec();
                            randomRaidPokemon = generateClanRaid(clan.perks[3] ?? 0, calculateLevel(clan.experience), 2);
                        } else if (raidInteraction.customId === "4") {
                            if (!updatedClan || updatedClan.rewards?.shiny <= 0) {
                                return;
                            }
                            await updatedClan.updateOne({ $inc: { "rewards.shiny": -1 } }).exec();
                            randomRaidPokemon = generateClanRaid(clan.perks[3] ?? 0, calculateLevel(clan.experience), undefined, true);
                        } else if (raidInteraction.customId === "5") {
                            if (!updatedClan || updatedClan.rewards?.shinyRare <= 0) {
                                return;
                            }
                            await updatedClan.updateOne({ $inc: { "rewards.shinyRare": -1 } }).exec();
                            randomRaidPokemon = generateClanRaid(clan.perks[3] ?? 0, calculateLevel(clan.experience), 2, true);
                        } else {
                            return;
                        }
                        const clanRaid = new ClanRaid();
                        clanRaid.pokemon = randomRaidPokemon;
                        clanRaid.hp = 1000000;
                        clanRaid.maxHp = 1000000;
                        clanRaid.time = moment().add(5, "minutes").toDate();
                        clanRaid.clan = updatedClan._id;
                        await clanRaid.save();

                        const log = new ClanRaidLog();
                        log.discord_id = context.user.id;
                        log.damageDealt = 0;
                        log.raid = clanRaid._id;
                        await log.save();

                        broadcastClanMessage(context.client, clan.channel, context.interaction.channelId ?? "", "Raid will start in 5 minutes. Clan members can join by doing `/clan join-raid`.", "Raid");
                    }
                });
            });
        } else if (context.interaction.options.getSubcommand() === "join-raid") {
            const clan = context.player.clan;
            const raid = await ClanRaid.findOne({ clan: clan._id }).exec();
            if (!raid) {
                return sendEmbed(context, { description: "There's currently no raid." });
            }
            const log = await ClanRaidLog.findOne({ discord_id: context.user.id, raid: raid._id }).exec();

            if (!log) {
                return sendEmbed(context, { description: "You already joined this clan Raid.", title: "Clan Raid" });
            }
            if (moment() > moment(raid.time)) {
                return sendEmbed(context, { description: "It is too late to join this raid.", title: "Clan Raid" });
            }
            sendEmbed(context, { description: `Do you want to join the clan Raid?\nIt will cost **${(100000).toLocaleString()} <:pokecoin:741699521725333534> coins**`, title: "Join a clan raid" }).then((message) => {
                if (message instanceof InteractionResponse) return;
                askConfirmation(message, context, async () => {
                    const updatedClan = await ClanModel.findOne({ _id: clan._id }).exec();
                    if (!updatedClan || updatedClan.balance < 100000) {
                        return sendEmbed(context, { description: `Your clan doesn't have enough coins for you to join the raid. Your clan need ${(100000).toLocaleString()} coins for you to join it.` });
                    }

                    await ClanModel.updateOne({ _id: updatedClan._id }, { $inc: { balance: -100000 } }).exec();

                    const log = new ClanRaidLog();
                    log.discord_id = context.user.id;
                    log.raid = raid._id;
                    await log.save();

                    sendEmbed(context, { description: "You joined the clan raid." });
                });
            });
        } else if (context.interaction.options.getSubcommand() === "catch") {
            let tries = await context.client.getClanRaidTries(context.user.id);
            const raidPokemon = await context.client.getClanRaidPokemon(context.user.id);
            if (!raidPokemon) {
                return sendEmbed(context, { description: "You don't have Pokemon waiting to be caught." });
            }
            if (tries <= 0) {
                return sendEmbed(context, { description: "You don't have any try left." });
            }
            // Try to catch
            const caught = context.client.chance.weighted([true, false], [400, 600]);
            const pokemonData = getPokemon(raidPokemon.dexId, raidPokemon.special);
            if (!caught) {
                tries--;
                if (tries > 1) {
                    context.client.setClanRaidTries(context.user.id, tries);
                    return sendEmbed(context, { description: `You throw a Premier Ball to catch ${pokemonData.displayName}. Oh no! The pokemon got out of it. You have only ${tries} tries left.` });
                }
                context.client.deleteClanRaidPokemon(context.user.id);
                return sendEmbed(context, { description: `You throw a Premier Ball to catch ${pokemonData.displayName}. Oh no! The pokemon got out of it and you don't have any try left.` });
            }
            context.client.deleteClanRaidPokemon(context.user.id);
            // Create pokemon
            const pokemon = randomPokemon(raidPokemon.dexId, 50, [], raidPokemon.shiny ? 1000 : -1, raidPokemon.special);
            createPokemon(context.user.id, {
                ...pokemon,
            });
            sendEmbed(context, { description: `You throw a Premier Ball to catch the Raid Pokémon.\nYou caught a ${rarity[pokemon.rarity]} ${pokemonData.displayName} ${pokemon.shiny ? "✨" : ""} ${genderEmoji[pokemon.gender] ?? ""} (Lvl. ${pokemon.level})!`, image: getImage(pokemon, true, pokemon.shiny, pokemon.special), color: 65280 });
        } else if (context.interaction.options.getSubcommand() === "server") {
            const clan = context.player.clan;
            if (clan.owner !== context.user.id) {
                return sendEmbed(context, { description: "You are not the owner of the clan." });
            }
            if (!context.interaction.memberPermissions?.has("ManageChannels")) {
                return sendEmbed(context, { description: "You need Manage Server permission in this server to do that." });
            }
            if (clan.channel === context.interaction.channelId) {
                await clan.updateOne({ $set: { channel: "" } }).exec();
                return sendEmbed(context, { description: "Clan announcements won't be only sent here now." });
            }
            await clan.updateOne({ $set: { channel: context.interaction.channelId } }).exec();
            sendEmbed(context, { description: "Clan announcements will be sent here now." });
        }
    }
};