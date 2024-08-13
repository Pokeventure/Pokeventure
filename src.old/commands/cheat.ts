import { Command, CommandContext } from 'command';
import { sendDM, sendEmbed } from '../modules/utils';
import {
    addCoins, addExperienceToClan, addQuest, addToInventory, createPokemon, createRaid, deleteEventQuests, getClans, getPatrons, getPlayer, getStats, resetDojo, resetEvent, resetPokemonReward, resetStamina, updateClan, updatePlayer, updatePokemon,
} from '../modules/database';
import { getPokemon, normalizeName } from '../modules/pokedex';
import items from '../../data/items';
import { generateRarity, randomPokemon } from '../modules/world';
import Logger from '../modules/logger';
import { ObjectID } from 'bson';
import { cleanMarket } from '../modules/market';
import moment from 'moment';
import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';
import { Routes } from 'discord-api-types/v9';
import { broadcastClanMessage } from '../modules/clan';
import * as Topgg from '@top-gg/sdk';

const ballToId: any = {
    pokeball: 0, greatball: 1, ultraball: 2, masterball: 3,
};
const ballNames: any = ['Pokéball', 'Greatball', 'Ultraball', 'Masterball'];
const ballChances: any = [35, 40, 45, 1000];
const rarityModifier: any = [15, 8, 4, -4, -8, -15];
const rarity = ['<:n_:744200749600211004>', '<:u_:744200749541621851>', '<:r_:744200749554073660>', '<:sr:744200749189431327>', '<:ur:744200749537558588>', '<:lr:746745321660481576>'];

const reward = [
    '',
    `- 50,000 Pokécoins <:pokecoin:741699521725333534> every week
    - 1 Masterball <:masterball:741809195178917999> every week`,
    `- 100,000 Pokécoins <:pokecoin:741699521725333534> every week
    - 3 Masterballs <:masterball:741809195178917999> every week`,
    `- 250,000 Pokécoins <:pokecoin:741699521725333534> per week
    - 5 Masterball <:masterball:741809195178917999> per week`,
    `- 600,000 Pokécoins <:pokecoin:741699521725333534> per week
    - 10 Masterball <:masterball:741809195178917999> per week
    - 1 Premium Shiny Finder <:premiumshinyfinder:872280759581417514> per week
    - 1 Premium Rarity Scanner <:premiumrarityscanner:872280759484960789> per week`,
    `- 1,250,000 Pokécoins <:pokecoin:741699521725333534> per week
    - 15 Masterball <:masterball:741809195178917999> per week
    - 2 Premium Shiny Scanner <:premiumshinyfinder:872280759581417514> per week
    - 2 Premium Rarity Scanner <:premiumrarityscanner:872280759484960789> per week`,
];

const mods = [
    '226519874367651840', // Taco
    '740223366052577362', // Missy
    '368516527730851841', // Necro
    '790313248334807051', // krumm dog
    '705896216734597193', // ceebs
    '756959043775496242', // Skaarl
];

class CheatSlashCommandBuild extends SlashCommandBuilder {
    toJSON() {
        let json: any = super.toJSON();
        json.default_permission = false;
        json.permissions = [
            {
                id: '146382118778437632',
                type: 2,
                permission: true,
            }
        ];
        return json;
    }
};

export const Cheat: Command = {
    name: 'Cheat',
    keywords: ['manage'],
    category: '',
    fullDesc: '',
    requireStart: true,
    needPlayer: true,
    showInHelp: false,
    commandData: new CheatSlashCommandBuild()
        .setName('manage')
        .setDescription('Manage Pokeventure.')
        .addSubcommand(option => option.setName('role').setDescription('Check role for level service').addUserOption(option => option.setName('user').setDescription('User to check').setRequired(true)))
        .addSubcommand(option => option.setName('patron').setDescription('Send rewards'))
        .addSubcommand(option => option.setName('restart').setDescription('Restart'))
        .addSubcommand(option => option.setName('sendticket').setDescription('Send ticket'))
        .addSubcommand(option => option.setName('giveitem').setDescription('Give item')
            .addUserOption(option => option.setName('user').setDescription('User').setRequired(true))
            .addIntegerOption(option => option.setName('item').setDescription('Item').setRequired(true))
            .addIntegerOption(option => option.setName('quantity').setDescription('Quantity').setRequired(true))
        )
        .addSubcommand(option => option.setName('lock').setDescription('lock')
            .addUserOption(option => option.setName('user').setDescription('User').setRequired(true))
        )
        .addSubcommand(option => option.setName('create').setDescription('Create Pokémon')
            .addStringOption(option => option.setName('pokemon').setDescription('Pokemon').setRequired(true))
            .addUserOption(option => option.setName('player').setDescription('Player').setRequired(true))
            .addIntegerOption(option => option.setName('level').setDescription('Level'))
            .addIntegerOption(option => option.setName('rarity').setDescription('Rarity'))
            .addBooleanOption(option => option.setName('shiny').setDescription('Shiny'))
            .addBooleanOption(option => option.setName('locked').setDescription('Locked'))
        )
        .addSubcommand(option => option.setName('give').setDescription('Give money')
            .addUserOption(option => option.setName('player').setDescription('Player').setRequired(true))
            .addIntegerOption(option => option.setName('amount').setDescription('Amount').setRequired(true)))
        .addSubcommand(Option => Option.setName('clan').setDescription('Clan'))
        .addSubcommand(Option => Option.setName('stamina').setDescription('Stamina'))
        .addSubcommand(Option => Option.setName('event').setDescription('Event'))
        .addSubcommand(Option => Option.setName('didvote').setDescription('Did vote')
            .addUserOption(option => option.setName('player').setDescription('Player').setRequired(true)))
    ,

    handler(context: CommandContext): Promise<any> {
        return new Promise(async (resolve, reject) => {
            if (!mods.includes(context.user.id) && context.user.id !== '146382118778437632') {
                resolve({});
                return;
            }
            if (context.commandInterction.options.getSubcommand(true) === 'role') {
                let mention = context.commandInterction.options.getUser('user', true);
                let stats = await getStats(mention.id);
                let player = await getPlayer(mention.id);
                if ((stats.stats.catch ?? 0) >= 1000 && moment().diff(moment(player.started_at), 'month') >= 1) {
                    sendEmbed({ context, message: `<@${mention.id}> respects conditions to get leveling service role.`, image: null, thumbnail: null, author: null, footer: null, title: null, color: 65280 });
                } else {
                    sendEmbed({ context, message: `<@${mention.id}> does not respect conditions to get leveling service role.`, image: null, thumbnail: null, author: null, footer: null, title: null, color: 16711680 });
                }
            }
            if (context.commandInterction.options.getSubcommand(true) === 'restart') {
                sendEmbed({ context, message: 'Restarting bot.' });
                context.client.discordClient.shard?.respawnAll();
            }
            if (context.commandInterction.options.getSubcommand() === 'stamina') {
                resetStamina();
                sendEmbed({ context, message: 'Reset stamina' });
            }
            if (context.commandInterction.options.getSubcommand() === 'clan') {
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
                                broadcastClanMessage(context.client, clan.channel, '', `You clan was ranked #${clan.ranking} this week.\n\nYou received:\n- 1 ticket to a Shiny Rare raid.\n- 5 Rarity Gems per participants`, 'Dojo Rewards');
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
                                broadcastClanMessage(context.client, clan.channel, '', `You clan was ranked #${clan.ranking} this week.\n\nYou received:\n- 1 ticket to a Shiny raid.\n- 3 Rarity Gems per participants`, 'Dojo Rewards');
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
                                broadcastClanMessage(context.client, clan.channel, '', `You clan was ranked #${clan.ranking} this week.\n\nYou received:\n- 1 ticket to a Rare raid.\n- 2 Rarity Gems per participants`, 'Dojo Rewards');
                            }
                        } else {
                            addExperienceToClan(clan._id, '', clan.dojoPoints * 1000);
                            clan.histories.forEach((history: any) => {
                                if (history.dojoPoints > 0) {
                                    addToInventory(history.discord_id, 145, 1);
                                }
                            });
                            if (clan.channel !== '') {
                                broadcastClanMessage(context.client, clan.channel, '', `You clan was ranked #${clan.ranking} this week.\n\nYou received:\n- 1 Rarity Gems per participants\n${clan.dojoPoints * 1000} exp. points for your clan.`, 'Dojo Rewards');
                            }
                        }
                    });
                    resetDojo();
                    sendEmbed({ context, message: 'Clan have been reset.' });
                }).catch((error) => {
                    reject(error);
                });
            }
            if (context.commandInterction.options.getSubcommand(true) === 'giveitem') {
                addToInventory(context.commandInterction.options.getUser('user', true).id, context.commandInterction.options.getInteger('item', true), context.commandInterction.options.getInteger('quantity', true));
                sendEmbed({ context, message: `Gave ${context.commandInterction.options.getInteger('quantity', true)} ${items[context.commandInterction.options.getInteger('item', true)].name}` });
                const info = new MessageEmbed();
                info.setDescription(`<@146382118778437632> <@${context.user.id}> gave ${context.commandInterction.options.getInteger('quantity', true)} ${items[context.commandInterction.options.getInteger('item', true)].name} to ${context.commandInterction.options.getUser('user', true).id}`)
                    .setTimestamp();
                context.client.restClient.post(Routes.channelMessages('807209828450697237'), {
                    body: {
                        embeds: [
                            info
                        ]
                    }
                });
            }
            if (context.commandInterction.options.getSubcommand(true) === 'create') {
                let target: any = context.commandInterction.options.getUser('player');
                const pokemon = getPokemon(context.commandInterction.options.getString('pokemon', true));

                let level: any = context.commandInterction.options.getInteger('level') ?? 1;

                const generated = randomPokemon(pokemon.dexId, level);

                let rarityLevel = context.commandInterction.options.getInteger('rarity') ?? 0;

                let locked = context.commandInterction.options.getBoolean('locked') ?? false;

                let rarity = generateRarity(rarityLevel, rarityLevel);

                createPokemon(target.id, pokemon.dexId, level, context.commandInterction.options.getBoolean('shiny') ?? false, generated.moves, rarity.ivs, rarity.rarity, false, pokemon.forme, null, generated.abilitySlot, generated.nature, generated.gender, locked).catch((error) => {
                    reject(error);
                });
                sendEmbed({ context, message: `Created a ${pokemon.displayName} for <@${target.id}>` });
                const info = new MessageEmbed();
                info.setDescription(`<@146382118778437632> <@${context.user.id}> a created Pokemon ${context.commandInterction.options.getString('pokemon', true)} for ${target.id}`)
                    .setTimestamp();
                context.client.restClient.post(Routes.channelMessages('807209828450697237'), {
                    body: {
                        embeds: [
                            info
                        ]
                    }
                });
            }
            if (context.commandInterction.options.getSubcommand() === 'lock') {
                updatePlayer(context.commandInterction.options.getUser('user', true).id, {
                    tradeLocked: true,
                });
            }
            if (context.user.id !== '146382118778437632') {
                resolve({});
                return;
            }
            /*if (context.args[1] === 'clearevent') {
                deleteEventQuests().then(() => {
                    return resetEvent();
                }).then(() => {
                    sendEmbed({ context, message: 'Deleted event quests' });
                }).catch((error) => {
                    Logger.error(error);
                });
            }*/
            if (context.commandInterction.options.getSubcommand() === 'patron') {
                getPatrons().then((res) => {
                    res.forEach(async (element: any) => {
                        try {
                            let user: any = await context.client.restClient.get(Routes.guildMember('446025712600875020', element.discord_id));
                            if (user === null) {
                                return;
                            }
                            if (user.roles.includes('789959072249020476') || user.roles.includes('789957513856548864') || user.roles.includes('789957403155759134') || user.roles.includes('789957280111919149') || user.roles.includes('789957218841264171')) {
                                switch (element.patronLevel) {
                                    case 1:
                                        await addToInventory(element.discord_id, 3, 1);
                                        await addCoins(element.discord_id, 50000, 'patron');
                                        break;
                                    case 2:
                                        await addToInventory(element.discord_id, 3, 3);
                                        await addCoins(element.discord_id, 100000, 'patron');
                                        break;
                                    case 3:
                                        await addToInventory(element.discord_id, 3, 5);
                                        await addCoins(element.discord_id, 250000, 'patron');
                                        break;
                                    case 4:
                                        await addToInventory(element.discord_id, 3, 10);
                                        await addCoins(element.discord_id, 600000, 'patron');
                                        await addToInventory(element.discord_id, 258, 1);
                                        await addToInventory(element.discord_id, 259, 1);
                                        break;
                                    case 5:
                                        await addToInventory(element.discord_id, 3, 15);
                                        await addCoins(element.discord_id, 1250000, 'patron');
                                        await addToInventory(element.discord_id, 258, 2);
                                        await addToInventory(element.discord_id, 259, 2);
                                        break;
                                }
                                Logger.info(`Sent rewards to ${user.username} ${user.id}`);
                                let embed = new MessageEmbed();
                                embed.setDescription(`You received your weekly reward!\n${reward[element.patronLevel]}`)
                                    .setTitle('Patron reward');

                                context.client.restClient.post(Routes.userChannels(), {
                                    body: {
                                        recipient_id: element.discord_id,
                                    }
                                }).then((userChannel: any) => {
                                    context.client.restClient.post(Routes.channelMessages(userChannel.id), {
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
                        } catch (error) {
                            Logger.error(error);
                        }
                    });
                }).catch((error) => {
                    Logger.error(error);
                });
            }

            /* if (context.args[1] === 'pokemonpatron') {
                sendEmbed({ context, message: 'Shiny Scyther\nLevel 5\nAt least <:ur:744200749537558588>', image: 'https://pokeventure-image.s3.us-east-1.amazonaws.com/front-shiny/scyther.gif', thumbnail: null, author: null, footer: null, title: 'Choice #1' }).then((message) => {
                    message.addReaction('1️⃣');
                    sendEmbed({ context, message: 'Shiny Heracross\nLevel 5\nAt least <:ur:744200749537558588>', image: 'https://pokeventure-image.s3.us-east-1.amazonaws.com/front-shiny/heracross.gif', thumbnail: null, author: null, footer: null, title: 'Choice #2' }).then((message) => {
                        message.addReaction('2️⃣');
                        sendEmbed({ context, message: 'Shiny Meditite\nLevel 5\nAt least <:ur:744200749537558588>', image: 'https://pokeventure-image.s3.us-east-1.amazonaws.com/front-shiny/meditite.gif', thumbnail: null, author: null, footer: null, title: 'Choice #3' }).then((message) => {
                            message.addReaction('3️⃣');
                        });
                    });
                });
            }
            if (context.args[1] === 'resetpokemonpatron') {
                resetPokemonReward();
                sendEmbed({ context, message: 'Done' });
            }*/
            if (context.commandInterction.options.getSubcommand() === 'sendticket') {
                getPatrons().then((res) => {
                    res.forEach(async (element: any) => {
                        try {
                            let user: any = await context.client.restClient.get(Routes.guildMember('446025712600875020', element.discord_id));
                            if (user === null) {
                                return;
                            }
                            if (user.roles.includes('789959072249020476') || user.roles.includes('789957513856548864') || user.roles.includes('789957403155759134')) {
                                if (element.patronLevel > 2) {
                                    await addToInventory(element.discord_id, 148, 1);
                                    Logger.info(`Sent ticket to ${user.username} ${user.id}`);
                                    let embed = new MessageEmbed();
                                    embed.setDescription('You received your Patron Ticket! You can use it now and claim your Pokémon in the Pokeventure channel. The ticket will be deleted if not used so make sure to use it.')
                                        .setTitle('Patron reward');
                                    sendDM(context.client, element.discord_id, { embeds: [embed] });
                                }
                            }
                        } catch (error) {
                            reject(error);
                        }
                    });
                }).catch((error: any) => {
                    reject(error);
                });
            }
            if (context.commandInterction.options.getSubcommand() === 'didvote') {
                let api = new Topgg.Api('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2Njk1NjUxODUxMTM0NTY4NCIsImJvdCI6dHJ1ZSwiaWF0IjoxNjAxNDMyMTEyfQ.0v5LV6D6WChrC-uBl97lBC0PgGB3uD_tdqBs2lS4lEk');
                api.hasVoted(context.commandInterction.options.getUser('user', true).id).then(async (hasVoted) => {
                    if (hasVoted) {
                        sendEmbed({ context, message: 'Has voted' });
                    } else {
                        sendEmbed({ context, message: 'Did not vote' });
                    }
                });
            }
            if (context.commandInterction.options.getSubcommand() === 'give') {
                addCoins(context.commandInterction.options.getUser('player', true).id, context.commandInterction.options.getInteger('amount', true), 'cheat');
                sendEmbed({ context, message: `Gave ${context.commandInterction.options.getInteger('amount', true)} coins to <@${context.commandInterction.options.getUser('player', true).id}>` });
            }
            if (context.commandInterction.options.getSubcommand() === 'event') {
                getPatrons().then((res) => {
                    res.forEach(async (element: any) => {
                        addQuest(element.discord_id, {
                            type: 'catchSpecialPokemons',
                            value: 0,
                            objective: 150,
                            data: 'halloween',
                            event: true,
                            patreon: true,
                            reward: [
                                {
                                    pokemon: {
                                        dexId: 888,
                                        special: 'halloween',
                                        level: 50,
                                        shiny: true,
                                        rarity: 3,
                                        ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
                                    }
                                },
                                {
                                    pokemon: {
                                        dexId: 889,
                                        special: 'halloween',
                                        level: 50,
                                        shiny: true,
                                        rarity: 3,
                                        ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
                                    }
                                },
                                {
                                    pokemon: {
                                        dexId: 720,
                                        special: 'unboundhalloween',
                                        level: 50,
                                        shiny: true,
                                        rarity: 3,
                                        ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
                                    }
                                },
                            ],
                        });
                    });
                }).catch((error: any) => {
                    reject(error);
                });
            }
            /* if (context.args[1] === 'raidtries') {
                context.client.redis.get(`tries-${context.args[2]}`).then((res: any) => {
                    sendEmbed({ context, message: `${res}` });
                });
            }
            if (context.args[1] === 'wipe') {
                context.client.db?.collection('players').deleteOne({
                    discord_id: context.args[2]
                });
                context.client.db?.collection('inventory').deleteOne({
                    discord_id: context.args[2]
                });
                context.client.db?.collection('pokemons').updateMany({
                    owner: context.args[2]
                }, {
                    $set: {
                        owner: `cheat ${context.args[2]}`
                    }
                });
                context.client.redis.del(`set-${context.args[2]}`).catch(() => { });
            }
            if (context.args[1] === 'ignore') {
                context.client.redis.set(`${context.args[2]}`, 1, 'EX', parseInt(context.args[3])).catch(() => { });
            }
            if (context.args[1] === 'graphql') {
                context.client.db?.collection('stats').find().toArray((err, res) => {
                    res.forEach(element => {
                        context.client.db?.collection('stats').updateOne(
                            {
                                _id: new ObjectID(element._id.toString()),
                            }, {
                            $set: {
                                stats: element,
                            }
                        });
                    });
                });
            }
            if (context.args[1] === 'cleanmarket') {
                cleanMarket(context.client);
            }
            if (context.args[1] === 'resetpatrons') {
                let level1 = ['192947989315190784', '426857435198783498', '691080980303446106', '187666069236744193', '297062071055548417', '404891087552118784'];
                let level2 = ['382994350939963392', '764589603231105097'];
                let level3 = ['233733719591092224', '756959043775496242', '817484572031451166', '788396099714154506', '832360199943749642', '300747948512378881', '727934478638514217', '803018358487515147', '832841502794711040', '509441800071675914', '747614046093836358', '398190528287735820', '795367045940117504', '762774278059327499', '157161448701689856', '772103648108216341', '773050983642431530', '693668916010156050', '440521802620338186', '705863285987213385', '659467277447594024', '268827450924990464', '472769852923445275', '149730888362491904', '327174627568648193', '790313248334807051', '185079037457203210', '491362985504145418', '510222325338341398', '550378444123406367', '827258079753797633', '403718813167910923', '369848903496892417', '811552351021957131', '291282092531253248', '368516527730851841', '721414350505639986', '788227131724660737', '832354313337962566', '412290903336812544', '710353131199791114', '241416933403131905', '473607612563193866', '753406094243659827', '752962935768350811', '204306343400701952', '762282174660739122', '801472501649113089', '257044602312327168', '484826747989131264'];
                let level4 = ['624645419456135183', '730411735676354630', '323867603917471754', '250972235739824128', '461381546021093386', '699060597320581250', '399672997444714496', '464503254202712071', '740223366052577362', '687403180341985363', '226519874367651840', '392133184290029569'];
                let level5 = ['362782868214120448', '774496913877762059', '382564881817272331', '392421681261445120', '339579727192915970', '360515891886161921', '320312429391118336'];
                context.client.db?.collection('players').updateMany({
                    patronLevel: { $exists: true }
                }, {
                    $set: {
                        patronLevel: 0,
                    }
                }).then(() => {
                    context.client.db?.collection('players').updateMany({
                        discord_id: { $in: level1 }
                    }, {
                        $set: {
                            patronLevel: 1,
                        }
                    });
            
                    context.client.db?.collection('players').updateMany({
                        discord_id: { $in: level2 }
                    }, {
                        $set: {
                            patronLevel: 2,
                        }
                    });
            
                    context.client.db?.collection('players').updateMany({
                        discord_id: { $in: level3 }
                    }, {
                        $set: {
                            patronLevel: 3,
                        }
                    });
            
                    context.client.db?.collection('players').updateMany({
                        discord_id: { $in: level4 }
                    }, {
                        $set: {
                            patronLevel: 4,
                        }
                    });
            
                    context.client.db?.collection('players').updateMany({
                        discord_id: { $in: level5 }
                    }, {
                        $set: {
                            patronLevel: 5,
                        }
                    });
                });
            } */
            resolve({});
        });
    }
};
