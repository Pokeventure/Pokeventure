import { Client, GatewayIntentBits, Events, Interaction, REST, Routes, Options } from "discord.js";
import { Start } from "../commands/start";
import { Help } from "../commands/help";
import CommandHandler from "./commandHandler";
import { initializeWorld } from "./world";
import { initializePokedex } from "./pokedex";
import Logger from "./logger";
import { connect, set as mongooseSet } from "mongoose";
import { Quests } from "../commands/quests";
import { Move } from "../commands/move";
import { initI18N } from "./i18n";
import { sendEmbed } from "./utils";
import { Wild } from "../commands/wild";
import { Fight } from "../commands/fight";
import { IPokemon } from "../types/pokemon";
import { Catch } from "../commands/catch";
import { createClient, RedisClientType } from "redis";
import { Inventory } from "../commands/inventory";
import { Chance } from "chance";
import { Box } from "../commands/box";
import { Select } from "../commands/select";
import { Info } from "../commands/info";
import { Balance } from "../commands/balance";
import { Map } from "../commands/map";
import { Sort } from "../commands/sort";
import { Nickname } from "../commands/nickname";
import { Ping } from "../commands/ping";
import { Ability } from "../commands/ability";
import { Shop } from "../commands/shop";
import { Buy } from "../commands/buy";
import { Use } from "../commands/use";
import { Favorite } from "../commands/favorite";
import { Unfavorite } from "../commands/unfavorite";
import { Give } from "../commands/give";
import { Raid } from "../commands/raid";
import cron from "node-cron";
import { checkRaid } from "./raid";
import { Stats } from "../commands/stats";
import { Hold } from "../commands/hold";
import { Market } from "../commands/market";
import { checkMarket } from "./market";
import { BpShop } from "../commands/bpshop";
import { BpBuy } from "../commands/bpbuy";
import { ItemInfo } from "../commands/iteminfo";
import { MoveInfo } from "../commands/moveinfo";
import { Learn } from "../commands/learn";
import { Pokedex } from "../commands/pokedex";
import { Release } from "../commands/release";
import { Trade } from "../commands/trade";
import { ITrade } from "../types/game";
import { LockEvolution } from "../commands/lockEvolution";
import { Clan } from "../commands/clan";
import { Player } from "../models/player";
import { Server } from "../commands/server";
import { Reward } from "../commands/reward";
import { Patreon } from "../commands/patreon";

import express from "express";
import { Webhook } from "@top-gg/sdk";
import { Vote } from "../commands/vote";
import { Team } from "../commands/team";
import { Gym } from "../commands/gym";
import { MegaRaid } from "../commands/megaRaid";
import { checkMegaRaid } from "./megaRaid";
import { Fight as FightModule } from "../modules/fight";
import { Battle } from "../commands/battle";
import { Guide } from "../commands/guide";
import { checkWondertrade } from "./wondertrade";

export default class BotClient {
    discordClient: Client;
    commandHandler: CommandHandler;
    restClient: REST;
    redisClient: RedisClientType;
    redisSubscriber: RedisClientType;
    chance: Chance.Chance;
    config: {
        raidDuration: number,
        raidStartingDelay: number,
        raidBroadcastChannel?: string,
        crosspost: boolean,
    };

    constructor() {
        this.config = {
            crosspost: process.env.CROSSPOST ? true : false,
            raidDuration: parseInt(process.env.RAID_DURATION ?? "15") ?? 15,
            raidStartingDelay: parseInt(process.env.RAID_STARTING_DELAY ?? "15") ?? 15,
            raidBroadcastChannel: process.env.RAID_BROADCAST_CHANNEL,
        };

        this.discordClient = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
            makeCache: Options.cacheWithLimits({
                MessageManager: 0,
                PresenceManager: 0,
                ThreadManager: 0,
                GuildMemberManager: 0,
                ThreadMemberManager: 0,
                UserManager: 0,
            }),
        });
        this.restClient = new REST({ version: "10" });
        this.restClient.setToken(process.env.BOT_TOKEN ?? "");
        this.commandHandler = new CommandHandler();
        this.redisClient = createClient();
        this.redisSubscriber = this.redisClient.duplicate();
        this.chance = new Chance();

        this.commandHandler.registerCommand(Help);
        this.commandHandler.registerCommand(Start);
        this.commandHandler.registerCommand(Quests);
        this.commandHandler.registerCommand(Move);
        this.commandHandler.registerCommand(Wild);
        this.commandHandler.registerCommand(Fight);
        this.commandHandler.registerCommand(Catch);
        this.commandHandler.registerCommand(Inventory);
        this.commandHandler.registerCommand(Box);
        this.commandHandler.registerCommand(Select);
        this.commandHandler.registerCommand(Info);
        this.commandHandler.registerCommand(Balance);
        this.commandHandler.registerCommand(Map);
        this.commandHandler.registerCommand(Sort);
        this.commandHandler.registerCommand(Nickname);
        this.commandHandler.registerCommand(Ping);
        this.commandHandler.registerCommand(Ability);
        this.commandHandler.registerCommand(Shop);
        this.commandHandler.registerCommand(Buy);
        this.commandHandler.registerCommand(Use);
        this.commandHandler.registerCommand(Favorite);
        this.commandHandler.registerCommand(Unfavorite);
        this.commandHandler.registerCommand(Give);
        this.commandHandler.registerCommand(Raid);
        this.commandHandler.registerCommand(Stats);
        this.commandHandler.registerCommand(Hold);
        this.commandHandler.registerCommand(Market);
        this.commandHandler.registerCommand(BpShop);
        this.commandHandler.registerCommand(BpBuy);
        this.commandHandler.registerCommand(ItemInfo);
        this.commandHandler.registerCommand(MoveInfo);
        this.commandHandler.registerCommand(Learn);
        this.commandHandler.registerCommand(Pokedex);
        this.commandHandler.registerCommand(Release);
        this.commandHandler.registerCommand(Trade);
        this.commandHandler.registerCommand(LockEvolution);
        this.commandHandler.registerCommand(Clan);
        this.commandHandler.registerCommand(Server);
        this.commandHandler.registerCommand(Reward);
        this.commandHandler.registerCommand(Patreon);
        this.commandHandler.registerCommand(Vote);
        this.commandHandler.registerCommand(Team);
        this.commandHandler.registerCommand(Gym);
        this.commandHandler.registerCommand(MegaRaid);
        this.commandHandler.registerCommand(Battle);
        this.commandHandler.registerCommand(Guide);

        initI18N();
        initializeWorld();
        initializePokedex();
    }

    start() {
        this.discordClient.once(Events.ClientReady, client => {
            Logger.info(`Ready! Logged in as ${client.user.tag}`);
        });

        this.discordClient.on(Events.InteractionCreate, this.onCommandInteraction.bind(this));
        this.discordClient.on(Events.InteractionCreate, this.onButtonInteraction.bind(this));
        this.discordClient.on(Events.InteractionCreate, this.onAutocompleteInteraction.bind(this));

        this.discordClient.login(process.env.BOT_TOKEN);

        mongooseSet("strictQuery", false);
        mongooseSet("debug", true);
        connect(process.env.DATABASE_URL ?? "", {
            dbName: process.env.DATABASE_NAME,
        }).then(() => {
            Logger.info("Connected to database");
        }).catch(() => {
            Logger.error("Failed to connect to database");
        });
        this.redisClient.on("connect", () => {
            Logger.info("Connected to Redis");
        });
        this.redisClient.on("error", (error) => {
            Logger.error(error);
        });
        this.redisClient.connect();

        if (process.env.DEV !== undefined || this.discordClient.shard?.ids.includes(0)) {
            this.redisSubscriber.subscribe("fight", (message) => {
                const {
                    p1,
                    p2,
                    p1Team,
                    p2Team,
                    channel,
                    broadcast,
                    interaction,
                } = JSON.parse(message);
                p1.client = this;
                p2.client = this;
                const fight = new FightModule();
                //const channelObject: any = await getChannel(this, channel.id);
                fight.start({
                    client: this,
                    interaction: interaction,
                    player: new Player(),
                    user: interaction.user,
                    hasPlayer: true,
                }, p1Team, p2Team, 0, 0, 0, -1, p1.username, p2.username, false, {
                    p1: p1,
                    p2: p2,
                    broadcast,
                }).then(() => {
                    // delete fights[mentionned.id];
                    // delete fights[context.user.id];
                }).catch((error) => {
                    Logger.error(error);
                    // delete fights[mentionned.id];
                    // delete fights[context.user.id];
                });
            });
        }

        const commands = this.commandHandler.getCommandsData();

        console.log(commands);
        this.restClient.put(
            Routes.applicationCommands(process.env.APP_ID ?? ""),
            { body: commands },
        ).then((data: any) => {
            Logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
        }).catch((error) => {
            Logger.error(error);
        });

        this.startCron();

        const app = express();
        const webhook = new Webhook(process.env.TOPGG_WEBHOOK);

        app.post(
            "/dblwebhook",
            webhook.listener((vote) => {
                console.log(vote.user);
            })
        );

        app.listen(3000);
    }

    startCron() {
        cron.schedule("* * * * *", () => {
            checkRaid(this);
            checkMarket();
            checkMegaRaid(this);
            checkWondertrade(this);
        });
    }

    async onCommandInteraction(interaction: Interaction) {
        if (!interaction.isChatInputCommand()) return;

        try {
            await this.commandHandler.handleCommand(this, interaction);
        }
        catch (error: any) {
            console.error(error);
            Logger.error(`Failed to handle command: ${error}`);
            await sendEmbed(
                { interaction, client: this, player: new Player(), user: interaction.user, hasPlayer: true },
                { description: "There was an error while executing this command!" });
        }
    }

    async onButtonInteraction(interaction: Interaction) {
        if (!interaction.isButton()) return;

        try {
            await this.commandHandler.handleButton(this, interaction);
        }
        catch (error: any) {
            Logger.error(`Failed to handle button: ${error}`);
            await sendEmbed(
                { interaction, client: this, player: new Player(), user: interaction.user, hasPlayer: true },
                { description: "There was an error while executing this command!" });
        }
    }

    async onAutocompleteInteraction(interaction: Interaction) {
        if (!interaction.isAutocomplete()) return;

        try {
            await this.commandHandler.handleAutocomplete(this, interaction);
        }
        catch (error: any) {
            Logger.error(`Failed to handle autocomplete: ${error}`);
        }
    }

    async getWildPokemon(userId: string): Promise<IPokemon | null> {
        const pokemonJson = await this.redisClient.get(`wild-pokemon-${userId}`);
        if (pokemonJson === null) {
            return null;
        }
        const pokemon: IPokemon = JSON.parse(pokemonJson);
        return pokemon;
    }

    setWildPokemon(userId: string, pokemon: IPokemon) {
        this.redisClient.set(`wild-pokemon-${userId}`, JSON.stringify(pokemon), {
            EX: 60,
        });
    }

    deleteWildPokemon(userId: string) {
        this.redisClient.del(`wild-pokemon-${userId}`);
    }

    async getFaintedPokemon(userId: string): Promise<IPokemon | null> {
        const pokemonJson = await this.redisClient.get(`fainted-pokemon-${userId}`);
        if (pokemonJson === null) {
            return null;
        }
        const pokemon: IPokemon = JSON.parse(pokemonJson);
        return pokemon;
    }

    setFaintedPokemon(userId: string, pokemon: IPokemon) {
        this.redisClient.set(`fainted-pokemon-${userId}`, JSON.stringify(pokemon), {
            EX: 60,
        });
    }

    deleteFaintedPokemon(userId: string) {
        this.redisClient.del(`fainted-pokemon-${userId}`);
    }

    setRaidTries(userId: string, tries: number) {
        this.redisClient.set(`raid-tries-${userId}`, tries, {
            EX: 60 * 15,
        });
    }

    async getRaidTries(userId: string): Promise<number> {
        const tries = await this.redisClient.get(`raid-tries-${userId}`);
        if (tries === null) {
            return 0;
        }
        return parseInt(tries);
    }

    async getRaidPokemon(): Promise<IPokemon | null> {
        const pokemonJson = await this.redisClient.get("raid-pokemon");
        if (pokemonJson === null) {
            return null;
        }
        const pokemon: IPokemon = JSON.parse(pokemonJson);
        return pokemon;
    }

    async setRaid(pokemon: IPokemon) {
        this.redisClient.set("raid-pokemon", JSON.stringify(pokemon), {
            EX: 60 * 15
        });
    }

    async setRaidTimer(userId: string, duration: number, expire: number) {
        this.redisClient.set(`raid-timer-${userId}`, duration, {
            EX: expire
        });
    }

    async getRaidTimer(userId: string) {
        const timer = await this.redisClient.get(`raid-timer-${userId}`);
        if (timer) {
            return parseInt(timer);
        }
        return null;
    }

    async getUserTrade(userId: string): Promise<null | ITrade> {
        const tradeJson = await this.redisClient.get(`trade-${userId}`);
        if (!tradeJson) {
            return null;
        }
        const trade: ITrade = JSON.parse(tradeJson);
        return trade;
    }

    setUserTrade(userId: string, trade: ITrade) {
        this.redisClient.set(`trade-${userId}`, JSON.stringify(trade), {
            EX: 300
        });
    }

    deleteUserTrade(userId: string) {
        this.redisClient.del(`trade-${userId}`);
    }

    setClanRaidCooldown(userId: string) {
        this.redisClient.set(`clan-raid-cooldown-${userId}`, 1, {
            EX: 10
        });
    }

    async getClanRaidCooldown(userId: string) {
        const cooldown = await this.redisClient.get(`clan-raid-cooldown-${userId}`);
        return cooldown;
    }


    setClanRaidPokemon(userId: string, pokemon: IPokemon) {
        this.redisClient.set(`clan-raid-pokemon-${userId}`, JSON.stringify(pokemon), {
            EX: 60 * 30
        });
    }

    setClanRaidTries(userId: string, tries: number) {
        this.redisClient.set(`clan-raid-tries-${userId}`, tries, {
            EX: 60 * 30
        });
    }

    async getClanRaidTries(userId: string): Promise<number> {
        const tries = await this.redisClient.get(`clan-raid-tries-${userId}`);
        if (tries === null) {
            return 0;
        }
        return parseInt(tries);
    }

    async getClanRaidPokemon(userId: string): Promise<IPokemon | null> {
        const pokemonJson = await this.redisClient.get(`clan-raid-pokemon-${userId}`);
        if (pokemonJson === null) {
            return null;
        }
        const pokemon: IPokemon = JSON.parse(pokemonJson);
        return pokemon;
    }

    deleteClanRaidPokemon(userId: string) {
        this.redisClient.del(`clan-raid-pokemon-${userId}`);
        this.redisClient.del(`clan-raid-tries-${userId}`);
    }

    async getMegaRaidTimer(userId: string) {
        const timer = await this.redisClient.get(`megaraid-timer-${userId}`);
        if (timer) {
            return parseInt(timer);
        }
        return null;
    }

    setMegaRaidTimer(userId: string, duration: number, expire: number) {
        this.redisClient.set(`megaraid-timer-${userId}`, duration, {
            EX: expire
        });
    }

    startBattle(data: string) {
        this.redisClient.publish("fight", data);
    }
}
