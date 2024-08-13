import { Db, MongoClient } from 'mongodb';
import * as assert from 'assert';
import { AutoPoster } from 'topgg-autoposter';
import moment from 'moment';
import { GraphQLClient } from 'graphql-request';
import StatsD from 'hot-shots';

import { initializePokedex, getPokemon, searchPokemon, searchPokemonBase } from './pokedex';
import { initializeWorld, randomPokemon } from './world';
import { addLootbox, connect, createGuild, getGuildData, countUsers, updatePlayer, getPlayer, createPokemon, addToInventory, updateRanking, getClans, updateClan, addExperienceToClan, resetDojo, resetStamina } from './database';
import CommandHandler from './commandHandler';
import event from '../../data/event';
import { voteStreakItems, voteStreakQuantity } from '../../data/vote';

import { Catch } from '../commands/catch';
import { Inventory } from '../commands/inventory';
import { MapCommand } from '../commands/map';
import { Move } from '../commands/move';
import { Pokemons } from '../commands/pokemons';
import { Reward } from '../commands/reward';
import { Start } from '../commands/start';
import { Use } from '../commands/use';
import { Wild } from '../commands/wild';
import { Quests } from '../commands/quests';
import { FightCommand } from '../commands/fight';
import { Money } from '../commands/money';
import { Select } from '../commands/select';
import { Info } from '../commands/info';
import { Shop } from '../commands/shop';
import { Buy } from '../commands/buy';
import { Raid } from '../commands/raid';
import { Ping } from '../commands/ping';
import { Event } from '../commands/event';
import { Hold } from '../commands/hold';
import { cleanMarket, checkMarket } from './market';
import { checkWondertrade } from './wondertrade';
// import { Cards } from '../commands/cards';
import Logger from './logger';
import { CommandContext, User } from 'command';

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { ButtonInteraction, Client as DiscordClient, Intents, Interaction, Message, MessageEmbed, Options, SelectMenuInteraction } from 'discord.js';
import { Help } from '../commands/help';
import { Pokedex } from '../commands/pokedex';
import { Lootbox } from '../commands/lootbox';
import { Vote } from '../commands/vote';
import { lootboxesEmoji, lootboxesNames } from './lootbox';
import items from '../../data/items';
import { Stats } from '../commands/stats';
import { Sort } from '../commands/sort';
import { Learn } from '../commands/learn';
import { Flee } from '../commands/flee';
import { MegaRaid } from '../commands/megaraid';
import { BpBuy } from '../commands/bpbuy';
import { BpShop } from '../commands/bpshop';
import { Give } from '../commands/give';
import { Gym } from '../commands/gym';
import { Team } from '../commands/team';
import { Market } from '../commands/market';
import { Cheat } from '../commands/cheat';
import { Patreon } from '../commands/patreon';
import { Server } from '../commands/server';
import { MoveInfo } from '../commands/moveinfo';
import { AbilityInfo } from '../commands/abilityinfo';
import { ItemInfo } from '../commands/iteminfo';
import { Lock } from '../commands/lock';
import { Favorite } from '../commands/favorite';
import { Unfavorite } from '../commands/unfavorite';
import { Release } from '../commands/release';
import { Trade } from '../commands/trade';
import { Nickname } from '../commands/nickname';
import { LockEvolution } from '../commands/lockevolution';
import { Clan } from '../commands/clan';
import { Dojo } from '../commands/dojo';
import { Wondertrade } from '../commands/wondertrade';
import { getChannel, searchItem } from './utils';
import { Battle } from '../commands/battle';
import Fight from './fight';
import { LockCommand } from '../commands/lockCommand';
import { Research } from '../commands/research';
import { Guide } from '../commands/guide';
import { broadcastClanMessage } from './clan';

const Redis = require('ioredis');
const cron = require('node-cron');

export default class Client {
    db: Db | null = null;

    graphqlClient: GraphQLClient;

    encounter: { [key: string]: any } = {};

    fights: { [key: string]: any } = {};

    channelPokemons: { [key: string]: any } = {};

    trades: { [key: string]: any } = {};

    discordClient: DiscordClient;

    restClient: REST;

    commandHandler: CommandHandler | null = null;

    pokeballs: string[] = ['pokeball', 'greatball', 'ultraball', 'masterball', 'pb', 'gb', 'ub', 'mb'];

    redis: any = null;
    redisSubscriber: any = null;

    event: any = null;

    pokemonSpamLock: any = [];
    dogstatsd: any;
    interactions: any = {};

    constructor() {
        //  { partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'GUILD_MEMBER'] }
        this.discordClient = new DiscordClient({
            intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
            makeCache: Options.cacheWithLimits({
                MessageManager: 0,
                PresenceManager: 0,
                ThreadManager: 0,
                GuildMemberManager: 0,
                ThreadMemberManager: 0,
            }),
        });

        this.event = event;

        this.graphqlClient = new GraphQLClient(process.env.GRAPHQL_ENDPOINT ?? 'http://localhost:3000/graphql');
        this.dogstatsd = new StatsD({
            port: 8125,
            host: '127.0.0.1',
        });

        this.restClient = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN ?? '');
    }

    async start() {
        initializeWorld();
        initializePokedex();

        let dsn = '';
        if (process.env.DEV === '1') {
            dsn = `mongodb://${process.env.DATABASE_HOST}/${process.env.DATABASE_NAME}?retryWrites=true&w=majority`;
        } else {
            dsn = `mongodb+srv://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}/${process.env.DATABASE_NAME}?retryWrites=true&w=majority`;
        }

        MongoClient.connect(dsn, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
            assert.equal(null, err);
            Logger.info('Connection to database succesful');
            this.db = client.db(process.env.DATABASE_NAME);

            connect(this.db, this.graphqlClient);
        });

        this.redis = new Redis({ maxRetriesPerRequest: 0 });

        this.redis.on('error', (error: any) => {
            Logger.error(error);
        });

        this.redis.on('ready', () => {
            Logger.info('Connected to Redis');
        });

        if (process.env.DEV !== undefined || this.discordClient.shard?.ids.includes(0)) {
            this.redisSubscriber = new Redis({ maxRetriesPerRequest: 0 });
            this.redisSubscriber.on('ready', () => {
                this.redisSubscriber.subscribe('fight');
            });

            this.redisSubscriber.on('message', async (channel: any, message: any) => {
                if (channel === 'fight') {
                    const {
                        p1,
                        p2,
                        p1Team,
                        p2Team,
                        channel,
                        broadcast,
                    } = JSON.parse(message);
                    p1.client = this;
                    p2.client = this;
                    const fight = new Fight();
                    const channelObject: any = await getChannel(this, channel.id);
                    const empty: any = undefined;
                    fight.start({
                        buttonInteraction: empty,
                        client: this,
                        channel: channelObject,
                        commandInterction: empty,
                        interaction: empty,
                        selectMenuInteraction: empty,
                        user: empty,
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
                }
            });
        }

        this.discordClient?.on('ready', () => {
            Logger.info('Bot ready.');

            updateStatus();
        });

        const updateStatus = () => {
            this.discordClient.user?.setPresence({ activities: [{ name: '/help' }] });
            /* countUsers().then((count) => {
                this.discordClient.user?.setPresence({ activities: [{ name: `/help | ${count.toLocaleString()} players` }] });
            }).catch((error) => {
                Logger.error(error);
            }); */
        };

        // setInterval(updateStatus, 120000);
        if (process.env.BETA === undefined && process.env.BATTLE === undefined && this.discordClient.shard?.ids.includes(0)) {
            setInterval(checkWondertrade, 60000, this);
            setInterval(cleanMarket, 3600000, this);
            setInterval(checkMarket, 10000, this);
            setInterval(updateRanking, 60000);

            cron.schedule('0 23 * * *', () => {
                resetStamina();
                this.restClient.post(Routes.channelMessages('741805312863895664'), {
                    body: {
                        content: 'Stamina reset',
                    }
                });
            });

            cron.schedule('0 23 * * SUN', () => {
                getClans().then((clans) => {
                    clans.forEach((clan: any) => {
                        if (clan.ranking === 1) {
                            let rewards = clan.rewards ?? {};
                            if (rewards.shinyRare !== undefined) {
                                rewards.shinyRare += 1;
                            } else {
                                rewards.shinyRare = 1;
                            }
                            updateClan(clan._id, { rewards });
                            clan.histories.forEach((history: any) => {
                                if (history.dojoPoints > 0) {
                                    addToInventory(history.discord_id, 145, 5);
                                }
                            });
                            if (clan.channel !== '') {
                                broadcastClanMessage(this, clan.channel, '', `You clan was ranked #${clan.ranking} this week.\n\nYou received:\n- 1 ticket to a Shiny Rare raid.\n- 5 Rarity Gems per participants`, 'Dojo Rewards');
                            }
                        } else if (clan.ranking === 2 || clan.ranking === 3) {
                            let rewards = clan.rewards ?? {};
                            if (rewards.shiny !== undefined) {
                                rewards.shiny += 1;
                            } else {
                                rewards.shiny = 1;
                            }
                            updateClan(clan._id, { rewards });
                            clan.histories.forEach((history: any) => {
                                if (history.dojoPoints > 0) {
                                    addToInventory(history.discord_id, 145, 3);
                                }
                            });
                            if (clan.channel !== '') {
                                broadcastClanMessage(this, clan.channel, '', `You clan was ranked #${clan.ranking} this week.\n\nYou received:\n- 1 ticket to a Shiny raid.\n- 3 Rarity Gems per participants`, 'Dojo Rewards');
                            }
                        } else if (clan.ranking === 4 || clan.ranking === 5) {
                            let rewards = clan.rewards ?? {};
                            if (rewards.rare !== undefined) {
                                rewards.rare += 1;
                            } else {
                                rewards.rare = 1;
                            }
                            updateClan(clan._id, { rewards });
                            clan.histories.forEach((history: any) => {
                                if (history.dojoPoints > 0) {
                                    addToInventory(history.discord_id, 145, 2);
                                }
                            });
                            if (clan.channel !== '') {
                                broadcastClanMessage(this, clan.channel, '', `You clan was ranked #${clan.ranking} this week.\n\nYou received:\n- 1 ticket to a Rare raid.\n- 2 Rarity Gems per participants`, 'Dojo Rewards');
                            }
                        } else {
                            addExperienceToClan(clan._id, '', clan.dojoPoints * 1000);
                            clan.histories.forEach((history: any) => {
                                if (history.dojoPoints > 0) {
                                    addToInventory(history.discord_id, 145, 1);
                                }
                            });
                            if (clan.channel !== '') {
                                broadcastClanMessage(this, clan.channel, '', `You clan was ranked #${clan.ranking} this week.\n\nYou received:\n- 1 Rarity Gems per participants\n${clan.dojoPoints * 1000} exp. points for your clan.`, 'Dojo Rewards');
                            }
                        }
                    });
                    resetDojo();
                    this.restClient.post(Routes.channelMessages('741805312863895664'), {
                        body: {
                            content: 'Dojo reseted'
                        }
                    });
                }).catch((error) => {
                    Logger.error(error);
                });
            });
        }

        this.discordClient.on('error', (error) => {
            Logger.error('Error. Trying to reconnect.', error);
        });

        this.discordClient?.on('shardReady', (id) => {
            Logger.info(`Shard ${id} ready`);
        });

        this.commandHandler = new CommandHandler();

        /* this.commandHandler.registerCommand(AbilityInfo);
        // this.commandHandler.registerCommand(Booster);
        // this.commandHandler.registerCommand(Cards);
        this.commandHandler.registerCommand(Clan);
        this.commandHandler.registerCommand(Cheat);
        this.commandHandler.registerCommand(Favorite);
        this.commandHandler.registerCommand(Flee);
        // this.commandHandler.registerCommand(Forge);
        this.commandHandler.registerCommand(Guide);
        this.commandHandler.registerCommand(Gym);
        this.commandHandler.registerCommand(Help);
        this.commandHandler.registerCommand(Invite);
        this.commandHandler.registerCommand(ItemInfo);
        this.commandHandler.registerCommand(Lock);
        this.commandHandler.registerCommand(LockCommand);
        this.commandHandler.registerCommand(LockEvolution);
        this.commandHandler.registerCommand(MegaRaid);
        this.commandHandler.registerCommand(MoveInfo);
        this.commandHandler.registerCommand(Nickname);
        this.commandHandler.registerCommand(Prefix);
        this.commandHandler.registerCommand(Release);
        this.commandHandler.registerCommand(Shop);
        this.commandHandler.registerCommand(Team);
        this.commandHandler.registerCommand(Trade);
        this.commandHandler.registerCommand(Unfavorite);
         */
        this.commandHandler.registerCommand(Help);
        this.commandHandler.registerCommand(Cheat);
        if (process.env.BATTLE !== undefined) {
            this.commandHandler.registerCommand(Battle);
        } else {
            this.commandHandler.registerCommand(AbilityInfo);
            this.commandHandler.registerCommand(BpBuy);
            this.commandHandler.registerCommand(BpShop);
            this.commandHandler.registerCommand(Buy);
            this.commandHandler.registerCommand(Catch);
            this.commandHandler.registerCommand(Clan);
            this.commandHandler.registerCommand(Dojo);
            this.commandHandler.registerCommand(Event);
            this.commandHandler.registerCommand(Favorite);
            this.commandHandler.registerCommand(FightCommand);
            this.commandHandler.registerCommand(Flee);
            this.commandHandler.registerCommand(Give);
            this.commandHandler.registerCommand(Guide);
            this.commandHandler.registerCommand(Gym);
            this.commandHandler.registerCommand(Hold);
            this.commandHandler.registerCommand(Info);
            this.commandHandler.registerCommand(Inventory);
            this.commandHandler.registerCommand(ItemInfo);
            this.commandHandler.registerCommand(Learn);
            this.commandHandler.registerCommand(Lock);
            this.commandHandler.registerCommand(LockCommand);
            this.commandHandler.registerCommand(LockEvolution);
            this.commandHandler.registerCommand(Lootbox);
            this.commandHandler.registerCommand(MapCommand);
            this.commandHandler.registerCommand(Market);
            this.commandHandler.registerCommand(MegaRaid);
            this.commandHandler.registerCommand(Money);
            this.commandHandler.registerCommand(Move);
            this.commandHandler.registerCommand(MoveInfo);
            this.commandHandler.registerCommand(Nickname);
            this.commandHandler.registerCommand(Patreon);
            this.commandHandler.registerCommand(Ping);
            this.commandHandler.registerCommand(Pokedex);
            this.commandHandler.registerCommand(Pokemons);
            this.commandHandler.registerCommand(Quests);
            this.commandHandler.registerCommand(Raid);
            this.commandHandler.registerCommand(Release);
            this.commandHandler.registerCommand(Research);
            this.commandHandler.registerCommand(Reward);
            this.commandHandler.registerCommand(Select);
            this.commandHandler.registerCommand(Server);
            this.commandHandler.registerCommand(Shop);
            this.commandHandler.registerCommand(Sort);
            this.commandHandler.registerCommand(Start);
            this.commandHandler.registerCommand(Stats);
            this.commandHandler.registerCommand(Team);
            this.commandHandler.registerCommand(Trade);
            this.commandHandler.registerCommand(Unfavorite);
            this.commandHandler.registerCommand(Use);
            this.commandHandler.registerCommand(Vote);
            this.commandHandler.registerCommand(Wild);
            this.commandHandler.registerCommand(Wondertrade);
        }

        this.discordClient.on('interactionCreate', this.handleInteraction.bind(this));
        this.discordClient.on('messageCreate', (message: Message) => {
            this.dogstatsd.timing('message_time', Date.now() - message.createdTimestamp);
        });

        if (this.discordClient.shard?.ids.includes(0) || process.env.DEV !== undefined) {
            try {
                Logger.info('Started refreshing application (/) commands.');

                if (process.env.DEV !== undefined) {
                    let commands: any = await this.restClient.put(
                        Routes.applicationGuildCommands(process.env.APP_ID ?? '', '766667446235955221'),
                        { body: this.commandHandler.commandsForRest },
                    );
                } else {
                    let commands: any = await this.restClient.put(
                        Routes.applicationCommands(process.env.APP_ID ?? ''),
                        { body: this.commandHandler.commandsForRest },
                    );
                }

                Logger.info('Successfully reloaded application (/) commands.');
            } catch (error) {
                Logger.error(error);
            }
        }

        if (this.discordClient.shard?.ids.includes(0) || process.env.DEV !== undefined) {
            const express = require('express');
            const app = express();
            app.use(express.json());

            app.post('/hook', (req: any, res: any) => {
                if (req.headers.authorization === 'Helloworld') {
                    getPlayer(req.body.user).then(async result => {
                        if (result !== undefined) {
                            let streak = result.voteStreak || 0;
                            streak += 1;
                            let calculatedStreak = ((streak - 1) % 32);
                            let bonusTime = false;
                            updatePlayer(req.body.user, { voteStreak: streak, voted: new Date() });
                            if (voteStreakItems[calculatedStreak] < 0) {
                                await addLootbox(req.body.user, -voteStreakItems[calculatedStreak] - 1, voteStreakQuantity[calculatedStreak]);
                            } else {
                                addToInventory(req.body.user, voteStreakItems[calculatedStreak], voteStreakQuantity[calculatedStreak]);
                            }
                            if (moment(result.voted).add(24, 'hour') > moment()) {
                                await addLootbox(req.body.user, 2, 1);
                                bonusTime = true;
                            }
                            let embed = new MessageEmbed();
                            if (voteStreakItems[calculatedStreak] < 0) {
                                embed.setDescription(`Thanks for voting! You received **x${voteStreakQuantity[calculatedStreak]} ${lootboxesEmoji[-voteStreakItems[calculatedStreak] - 1]} ${lootboxesNames[-voteStreakItems[calculatedStreak] - 1]}**!${bonusTime ? `\n**Because you vote again in less than 24 hours, you got an additional x1 ${lootboxesEmoji[2]} ${lootboxesNames[2]}` : ''}\n\nYou can vote again in 12 hours!\n\nCurrent streak: ${streak}.\n\nVote within 24 hours to get an additional reward.`);
                            } else {
                                embed.setDescription(`Thanks for voting! You received **x${voteStreakQuantity[calculatedStreak]} ${items[voteStreakItems[calculatedStreak]].emoji} ${items[voteStreakItems[calculatedStreak]].name}**!${bonusTime ? `\n**Because you vote again in less than 24 hours, you got an additional x1 ${lootboxesEmoji[2]} ${lootboxesNames[2]}` : ''}\n\nYou can vote again in 12 hours!\n\nCurrent streak: ${streak}.\n\nVote within 24 hours to get an additional reward.`);
                            }
                            embed.setTitle('Vote for Pokeventure');
                            this.restClient.post(Routes.userChannels(), {
                                body: {
                                    recipient_id: req.body.user,
                                }
                            }).then((userChannel: any) => {
                                this.restClient.post(Routes.channelMessages(userChannel.id), {
                                    body: {
                                        embeds: [
                                            embed
                                        ]
                                    }
                                });
                            }).catch((error) => {
                                Logger.error(error);
                            });
                        }
                    }).catch((error) => {
                        Logger.error(error);
                    });
                    res.sendStatus(200);
                } else {
                    res.sendStatus(403);
                }
            });

            app.get('/test', (req: any, res: any) => {
                req.body.user = '146382118778437632';
                getPlayer(req.body.user).then(async result => {
                    let streak = result.voteStreak || 0;
                    streak += 1;
                    let calculatedStreak = ((streak - 1) % 32);
                    let bonusTime = false;
                    updatePlayer(req.body.user, { voteStreak: streak, voted: new Date() });
                    if (voteStreakItems[calculatedStreak] < 0) {
                        await addLootbox(req.body.user, -voteStreakItems[calculatedStreak] - 1, voteStreakQuantity[calculatedStreak]);
                    } else {
                        addToInventory(req.body.user, voteStreakItems[calculatedStreak], voteStreakQuantity[calculatedStreak]);
                    }
                    if (moment(result.voted).add(24, 'hour') > moment()) {
                        await addLootbox(req.body.user, 2, 1);
                        bonusTime = true;
                    }
                    let embed = new MessageEmbed();
                    if (voteStreakItems[calculatedStreak] < 0) {
                        embed.setDescription(`Thanks for voting! You received **x${voteStreakQuantity[calculatedStreak]} ${lootboxesEmoji[-voteStreakItems[calculatedStreak] - 1]} ${lootboxesNames[-voteStreakItems[calculatedStreak] - 1]}**!${bonusTime ? `\n\n**Because you vote again in less than 24 hours,\nyou got an additional x1 ${lootboxesEmoji[2]} ${lootboxesNames[2]}**` : ''}\n\nYou can vote again in 12 hours!\n\nCurrent bonus: ${streak}.\n\nVote within 24 hours to get an additional reward.`);
                    } else {
                        embed.setDescription(`Thanks for voting! You received **x${voteStreakQuantity[calculatedStreak]} ${items[voteStreakItems[calculatedStreak]].emoji} ${items[voteStreakItems[calculatedStreak]].name}**!${bonusTime ? `\n\n**Because you vote again in less than 24 hours,\nyou got an additional x1 ${lootboxesEmoji[2]} ${lootboxesNames[2]}**` : ''}\n\nYou can vote again in 12 hours!\n\nCurrent bonus: ${streak}.\n\nVote within 24 hours to get an additional reward.`);
                    }
                    embed.setTitle('Vote for Pokeventure');
                    this.restClient.post(Routes.userChannels(), {
                        body: {
                            recipient_id: req.body.user,
                        }
                    }).then((userChannel: any) => {
                        this.restClient.post(Routes.channelMessages(userChannel.id), {
                            body: {
                                embeds: [
                                    embed
                                ]
                            }
                        });
                    }).catch((error) => {
                        Logger.error(error);
                    });
                }).catch((error) => {
                    Logger.error(error);
                });
                res.sendStatus(200);
            });

            if (process.env.BATTLE === undefined) {
                app.listen(process.env.BETA === undefined ? 9000 : 9001, () => Logger.info('Node.js server started on port 9000.'));
            }
        }

        /* const creator = new SlashCreator({
            applicationID: process.env.APP_ID ?? '',
            publicKey: process.env.PUBLIC_KEY,
            token: process.env.BOT_TOKEN,
            handleCommandsManually: true,
        });

        try {
            creator
                .withServer(
                    new GatewayServer(
                        (handler) => this.discordClient.on('rawWS', async (event) => {
                            if (event.t === 'INTERACTION_CREATE') {
                                let data: any = <any>event.d;

                                let args = data.data.custom_id.split('_');
                                let user: User = {
                                    id: data.member?.user.id ?? data.user?.id,
                                    username: data.member?.user.name ?? data.user?.name,
                                    avatarURL: `https://cdn.discordapp.com/avatars/${data.member?.user.id ?? data.user?.id}/${data.member?.user.avatar ?? data.user?.avatar}.jpg`,
                                };

                                // ====== TALKING COOLDOWN ======
                                let hasTalked = null;
                                try {
                                    hasTalked = await this.redis.get(`interaction-${user.id}`);
                                } catch (e) {
                                    Logger.error(e);
                                }
                                if (hasTalked === null) {
                                    this.redis.set(`interaction-${user.id}`, '1', 'EX', process.env.COOLDOWN_INTERACTION ?? 1).catch((e: any) => {
                                        Logger.error(e);
                                    });
                                } else {
                                    if (data.member.user.id !== '146382118778437632') {
                                        return;
                                    }
                                }
                                try {
                                    handler(<any>event.d);
                                } catch (e) {
                                    // Do nothing
                                }
                                if (args[0] === 'choice') {
                                    this.discordClient.emit('choice', user, parseInt(args[1]), data.message.id);
                                } else {
                                    let channel: Eris.TextChannel = <Eris.TextChannel>this.discordClient.getChannel(data.channel_id);
                                    let message = await this.discordClient.getMessage(data.channel_id, data.message.id);

                                    await this.commandHandler!.handleInteraction(this, args[0], args, data.message.id, data.channel_id, data.guild_id, user);
                                }
                            }
                        })
                    )
                );
        } catch (e) {
            console.log(e);
        }*/
        //.registerCommandsIn(path.join(__dirname, 'commands'))
        //.syncCommands();

        this.discordClient?.login(process.env.BOT_TOKEN ?? '');
    }

    async handleInteraction(interaction: Interaction) {
        this.dogstatsd.timing('ws_ping', this.discordClient.ws.ping);
        this.dogstatsd.timing('time_since_interaction_create', Date.now() - interaction.createdTimestamp);
        let timeBefore: number = Date.now();
        let pingBefore: number = this.discordClient.ws.ping;
        if (timeBefore - interaction.createdTimestamp > 2900) {
            return;
        }
        if (interaction.isAutocomplete()) {
            if (interaction.options.getString('pokemon') !== null) {
                const result = interaction.commandName === 'research' ? searchPokemonBase(interaction.options.getString('pokemon') ?? '') : searchPokemon(interaction.options.getString('pokemon') ?? '');
                const resultFormated = result.map((pokemon: any) => {
                    return {
                        value: pokemon.name,
                        name: pokemon.displayName,
                    };
                });
                interaction.respond(resultFormated);
                return;
            } else if (interaction.options.getString('item') !== null) {
                const result = searchItem(interaction.options.getString('item') ?? '');
                const resultFormated = result.map((item: any) => {
                    return {
                        value: item.name,
                        name: item.name,
                    };
                });
                interaction.respond(resultFormated);
                return;
            }
        }
        if (interaction.isButton()) {
            let i: ButtonInteraction = interaction;
            if (i.customId.startsWith('choice')) {
                let args: string[] = i.customId.split('_');
                this.discordClient.emit('choice', i, interaction.user.id, parseInt(args[1]), interaction.message.id);
            } else if (i.customId.startsWith('battlechoice')) {
                let args: string[] = i.customId.split('_');
                this.discordClient.emit('battlechoice', i, interaction.user.id, parseInt(args[1]), interaction.message.id);
            } else {
                let args: string[] = i.customId.split('_');
                if (args[args.length - 1].includes('u:') && args[args.length - 1] !== `u:${interaction.user.id}`) {
                    return;
                }
                await i.update({ components: [] });
                this.commandHandler!.handleCommand(this, args[0], interaction, false, [], args);
            }
            return;
        }
        if (interaction.isSelectMenu()) {
            let i: SelectMenuInteraction = interaction;
            await interaction.deferReply().catch((error) => {
                Logger.error(`Error with defer 2: ${error} ${interaction.customId} ${Date.now() - interaction.createdTimestamp} ms\nRecevier after ${timeBefore - interaction.createdTimestamp}ms\nPing before ${pingBefore}ms\nPing ${this.discordClient.ws.ping}ms`);
                return;
            });
            this.commandHandler!.handleCommand(this, i.customId, interaction, false, []);
            return;
        }
        if (!interaction.isCommand()) {
            return;
        }
        await interaction.deferReply().catch((error) => {
            Logger.error(`Error with defer 3: ${error} ${interaction.commandName} ${Date.now() - interaction.createdTimestamp} ms\nRecevier after ${timeBefore - interaction.createdTimestamp}ms\nPing before ${pingBefore}ms\nPing ${this.discordClient.ws.ping}ms`);
            return;
        });
        if (process.env.BETA !== undefined && interaction.channel?.id !== '838141530996211712') { return; }
        if (process.env.BETA === undefined && interaction.channel?.id === '838141530996211712') { return; }
        const totalTime = process.hrtime();

        // ====== GUILD DATA CACHE ======
        let guildData = null;
        if (interaction.guildId === undefined) {
            guildData = {
                lock: [],
                lockCommands: {},
            };
        } else {
            try {
                guildData = await this.redis.get(`guild-${interaction.guildId}`);
                guildData = JSON.parse(guildData);
            } catch (e) {
                // console.log(e);
            }
            if (guildData === null) {
                guildData = await getGuildData(interaction.guildId ?? '');
                await this.redis.set(`guild-${interaction.guildId}`, JSON.stringify(guildData), 'EX', 60 * 60 * 24 * 30);
            }
        }
        let hasChanelLock = false;
        let channelLocked = false;
        if (guildData.lock !== undefined && guildData.lock !== null) {
            if (guildData.lock.length > 0) { hasChanelLock = true; }
            if (guildData.lock.length > 0 && !guildData.lock.includes(interaction.channelId)) { channelLocked = true; }
        }
        if (guildData.lockCommands === null) {
            guildData.lockCommands = {};
        }
        let { prefix } = guildData;
        if (prefix === '' || prefix === undefined) {
            prefix = '!';
        }

        this.commandHandler!.handleCommand(this, interaction.commandName, interaction, channelLocked, guildData.lockCommands[interaction.channelId] ?? []);

        /* if (this.pokeballs.indexOf(messageText) >= 0) {
            this.commandHandler!.handleCommand(this, 'catch', message, ['catch', messageText, 'silent'], ['catch', messageText, 'silent'], prefix, channelLocked, totalTime, externalEmojis, addReactions, manageMessages, guildData.lockCommands[message.channel.id] ?? []);
        } else if (messageText.startsWith(prefix)) {
            const messageSplitted = messageText.substring(prefix.length).trim().split(' ');
            const caseMessageSplitted = caseMessageTest.substring(prefix.length).trim().split(' ');
        } else if (message.content === '<@!666956518511345684>') {
            let context: CommandContext = {
                args: [],
                caseArgs: [],
                channel: message.channel,
                client: this,
                message,
                prefix,
                externalEmojis,
                addReactions,
                manageMessages,
                user: {
                    id: message.author.id,
                    username: message.author.username,
                    avatarURL: message.author.avatarURL,
                }
            };
    
            let channelsLocked = '';
            if (guildData.lock !== undefined && guildData.lock !== null && guildData.lock.length > 0) {
                guildData.lock.forEach((element: any) => {
                    channelsLocked += `<#${element}>\n`;
                });
            } else {
                channelsLocked = 'None';
            }
    
            sendEmbed(context, context.channel, `Guild info:\n\nID: ${context.message.guildID}\nPrefix: \`${prefix}\`\n\nChannels locked:\n${channelsLocked}\n\nShard: ${(<Eris.Message<Eris.GuildTextableChannel>>context.message).channel.guild.shard.id}`);
        } else if ((!(hasChanelLock && channelLocked) || !hasChanelLock) && (message.channel.type !== 1 && message.channel.type !== 3) && this.channelPokemons[message.channel.id] === undefined) {
            let lock = guildData.lockCommands[message.channel.id] ?? [];
            if (lock.length === 0 || (lock.includes('c') || lock.includes('catch'))) {
                const rand = getRndInteger(0, 40);
                if (rand === 0) {
                    const pokemon = getRandomPokemonForLottery();
                    if (pokemon !== null) {
                        let context: CommandContext = {
                            args: [],
                            caseArgs: [],
                            channel: message.channel,
                            client: this,
                            message,
                            prefix: '',
                            externalEmojis,
                            addReactions,
                            manageMessages,
                            user: {
                                id: message.author.id,
                                username: message.author.username,
                                avatarURL: message.author.avatarURL,
                            }
                        };
                        context.channel = message.channel;
                        sendEmbed(context, message.channel, 'A mystery Pokémon appeared! Quick, catch it!', `https://play.pokemonshowdown.com/sprites/ani${pokemon?.shiny ? '-shiny' : ''}/${getPokemon(pokemon?.dexId).name}.gif`, null, null, null, 'Catch it with !catch command', 'Wow!').then((mes) => {
                            this.channelPokemons[message.channel.id] = {
                                pokemon,
                                message: mes,
                                timeout: setTimeout(() => {
                                    mes.delete().catch(() => { });
                                    delete this.channelPokemons[message.channel.id];
                                }, 30000),
                            };
                        }).catch((reason) => {
                            Logger.error(reason);
                        });
                    }
                }
            }
        } */
    }
}
