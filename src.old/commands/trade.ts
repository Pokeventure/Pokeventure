import { Command, CommandContext } from 'command';
import { getImage, sendDM, sendEmbed } from '../modules/utils';
import {
  updatePokemon, evolvePokemon, addCoins, getPlayer, getPokemonByObjectID, getPokemonByNumber, createTradeLog,
} from '../modules/database';
import { getPokemon as getPokemonFromID } from '../modules/pokedex';
import { Pokemon } from 'pokemon';
import { SlashCommandBuilder } from '@discordjs/builders';
import Logger from '../modules/logger';
import { MessageEmbed } from 'discord.js';

const rarity = ['<:n_:744200749600211004>', '<:u_:744200749541621851>', '<:r_:744200749554073660>', '<:sr:744200749189431327>', '<:ur:744200749537558588>', '<:lr:746745321660481576>'];

export const Trade: Command = {
  name: 'Trade',
  keywords: ['trade', 't'],
  category: 'Bot',
  fullDesc: 'Command to trade with other players. Start a trade with `%PREFIX%trade @user <Pokémon ID>`. Once both players have have selected their Pokémons or sent money, they will have to use `%PREFIX%trade accept` to complete the trade.\nNote: You can\'t trade your selected Pokémon.\nNote: Traded Pokémon will earn 1.5x more expérience.\n\nUsage: `%PREFIX%trade @user <Pokémon ID>`\nUsage: `%PREFIX%trade <accept|decline|cancel>`\nUsage: `%PREFIX%trade`\n\nExample: `%PREFIX%trade @Ash 4` will start a trade with Ash and will select Pokémon with ID #4.\nExample: `%PREFIX%trade @Ash money <amount>` to trade money.\nExample: `%PREFIX%trade accept` will accept trade when both player have selected their Pokémon.\nExample: `%PREFIX%trade cancel` will decline the trade.\nExample: `%PREFIX%trade cancel` will cancel the trade.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('trade')
    .setDescription('Trade with other players.')
    .addSubcommand(subcommand => subcommand.setName('pokemon').setDescription('Trade a Pokémon with a player')
      .addUserOption(option => option.setName('player').setDescription('Player to trade with').setRequired(true))
      .addIntegerOption(option => option.setName('pokemon').setDescription('Pokémon ID').setRequired(true))
    ).addSubcommand(subcommand => subcommand.setName('money').setDescription('Trade a Pokémon money a player')
      .addUserOption(option => option.setName('player').setDescription('Player to trade with').setRequired(true))
      .addIntegerOption(option => option.setName('money').setDescription('Amount of money').setRequired(true))
    )
    .addSubcommand(subcommand => subcommand.setName('accept').setDescription('Accept trade'))
    .addSubcommand(subcommand => subcommand.setName('cancel').setDescription('Cancel trade'))
    .addSubcommand(subcommand => subcommand.setName('view').setDescription('View current trade')),

  handler(context: CommandContext): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (context.player?.tradeLocked) {
        sendEmbed({ context, message: 'You can\'t use Trade because you have been caught doing activities against the bot rules.', image: null, thumbnail: null, author: context.user });
        resolve({});
        return;
      }
      if (context.commandInterction.options.getSubcommand() === 'view') {
        if (context.client.trades[context.user.id] !== undefined) {
          let { tradingWith } = context.client.trades[context.user.id];
          if (context.client.trades[context.user.id].selectedPokemon !== undefined) {
            let { selectedPokemon } = context.client.trades[context.user.id];
            const selectedPokemonSpecies = getPokemonFromID(selectedPokemon.dexId, selectedPokemon.special);
            sendEmbed({ context, message: `You are currently trading with <@${tradingWith}>.\n<@${tradingWith}> will send ${rarity[selectedPokemon.rarity]} ${selectedPokemonSpecies.displayName} ${selectedPokemon.shiny ? '✨' : ''} (Lvl. ${selectedPokemon.level})`, image: getImage(selectedPokemonSpecies, selectedPokemon.shiny.true, selectedPokemon.special), thumbnail: null, author: context.user });
          } else {
            sendEmbed({ context, message: `You are currently trading with <@${tradingWith}>.`, image: null, thumbnail: null, author: context.user });
          }
        } else {
          sendEmbed({ context, message: 'You are not currently in a trade. Start a trade with `%PREFIX%trade @user <Pokémon ID>`.', image: null, thumbnail: null, author: context.user });
        }
      }
      if (context.commandInterction.options.getSubcommand() === 'accept') {
        if (context.client.trades[context.user.id] !== undefined
          && context.client.trades[context.user.id].tradingWith !== undefined) {
          if (context.client.trades[context.user.id].selectedPokemon !== undefined || context.client.trades[context.user.id].money !== undefined) {
            let { tradingWith } = context.client.trades[context.user.id];
            if (context.client.trades[tradingWith].tradingWith !== undefined
              && context.client.trades[tradingWith].tradingWith === context.user.id
              && (context.client.trades[tradingWith].selectedPokemon !== undefined || context.client.trades[tradingWith].money !== undefined)) {
              if (context.client.trades[tradingWith].selectedPokemon !== undefined && context.player?.selectedPokemon.toString() === context.client.trades[tradingWith].selectedPokemon._id.toString()) {
                sendEmbed({ context, message: 'You can\'t trade your selected Pokémon!', image: null, thumbnail: null, author: context.user });
                resolve({});
                return;
              }
              context.client.trades[context.user.id].accepted = true;
              if (context.client.trades[context.user.id].accepted && context.client.trades[tradingWith].accepted) {
                const player1 = await getPlayer(context.user.id);
                const player2 = await getPlayer(tradingWith);

                if (context.client.trades[context.user.id].selectedPokemon !== undefined) {
                  const pokemon1Exists = await getPokemonByObjectID(context.client.trades[context.user.id].selectedPokemon._id);
                  if (pokemon1Exists === undefined || pokemon1Exists.owner !== tradingWith || (pokemon1Exists._id ?? '') === (player1.selectedPokemon ?? '')) {
                    sendEmbed({ context, message: 'An error occured during the trade. #1' });
                    resolve({});
                    return;
                  }
                }
                if (context.client.trades[tradingWith].selectedPokemon !== undefined) {
                  const pokemon2Exists = await getPokemonByObjectID(context.client.trades[tradingWith].selectedPokemon._id);
                  if (pokemon2Exists === undefined || pokemon2Exists.owner !== context.user.id || (pokemon2Exists._id ?? '') === (player2.selectedPokemon ?? '')) {
                    sendEmbed({ context, message: 'An error occured during the trade. #1' });
                    resolve({});
                    return;
                  }
                }
                if (context.client.trades[context.user.id].money !== undefined) {
                  if (player2?.money.coins < context.client.trades[context.user.id].money) {
                    sendEmbed({ context, message: 'An error occured during the trade. #2' });
                    resolve({});
                    return;
                  }
                }
                if (context.client.trades[tradingWith].money !== undefined) {
                  if (player1?.money.coins < context.client.trades[tradingWith].money) {
                    sendEmbed({ context, message: 'An error occured during the trade. #2' });
                    resolve({});
                    return;
                  }
                }

                let log: any = { sender: context.user.id, receiver: tradingWith };
                if (context.client.trades[context.user.id].selectedPokemon !== undefined) {
                  const pokemon1 = context.client.trades[context.user.id].selectedPokemon;
                  log.pokemon1 = {
                    receiver: context.user.id,
                    pokemon: pokemon1,
                  };
                  const matchingEvolutions1 = getPokemonFromID(pokemon1.dexId, pokemon1.special).evolutions.find((x) => x.condition === 'trade');
                  // VDAY tweak
                  if (context.client.trades[tradingWith].selectedPokemon !== undefined) {
                    const pokemon2 = context.client.trades[tradingWith].selectedPokemon;
                    if ((pokemon1.dexId === 381 && pokemon2.dexId === 380) || (pokemon1.dexId === 381 && pokemon2.dexId === 380)) {
                      pokemon1.forme = 'vday';
                      pokemon2.forme = 'vday';
                      await updatePokemon(pokemon1._id, { forme: 'vday' });
                      await updatePokemon(pokemon2._id, { forme: 'vday' });
                    }
                  }
                  updatePokemon(pokemon1._id, { owner: context.user.id, luckyEgg: false });
                  const pokemon1Species = getPokemonFromID(pokemon1.dexId, pokemon1.special);

                  let embed1 = new MessageEmbed();
                  embed1.setDescription(`You received ${rarity[pokemon1.rarity]} ${pokemon1Species.displayName} ${pokemon1.shiny ? '✨' : ''} (Lvl. ${pokemon1.level}) from <@${tradingWith}>. Take care!`)
                    .setImage(getImage(pokemon1, true, pokemon1.shiny, pokemon1.special))
                    .setFooter('Traded Pokémon will earn 1.5x more experience!');

                  sendDM(context.client, context.user.id, { embeds: [embed1] }).then(() => {
                    if (matchingEvolutions1 !== undefined) {
                      evolvePokemon(context, pokemon1, matchingEvolutions1.id, context.user, null, pokemon1.forme, false, true);
                    }
                  }).catch((error) => {
                    Logger.error(error);
                  });
                }
                if (context.client.trades[tradingWith].selectedPokemon !== undefined) {
                  const pokemon2 = context.client.trades[tradingWith].selectedPokemon;
                  log.pokemon2 = {
                    receiver: tradingWith,
                    pokemon: pokemon2,
                  };
                  const matchingEvolutions2 = getPokemonFromID(pokemon2.dexId, pokemon2.special).evolutions.find((x) => x.condition === 'trade');
                  // VDAY tweak
                  if (context.client.trades[context.user.id].selectedPokemon !== undefined) {
                    const pokemon1 = context.client.trades[context.user.id].selectedPokemon;
                    if ((pokemon1.dexId === 381 && pokemon2.dexId === 380) || (pokemon1.dexId === 381 && pokemon2.dexId === 380)) {
                      pokemon1.forme = 'vday';
                      pokemon2.forme = 'vday';
                      await updatePokemon(pokemon1._id, { forme: 'vday' });
                      await updatePokemon(pokemon2._id, { forme: 'vday' });
                    }
                  }
                  updatePokemon(pokemon2._id, { owner: tradingWith, luckyEgg: false });
                  const pokemon2Species = getPokemonFromID(pokemon2.dexId, pokemon2.special);

                  let embed2 = new MessageEmbed();
                  embed2.setDescription(`You received ${rarity[pokemon2.rarity]} ${pokemon2Species.displayName} ${pokemon2.shiny ? '✨' : ''} (Lvl. ${pokemon2.level}) from <@${context.user.id}>. Take care!`)
                    .setImage(getImage(pokemon2, true, pokemon2.shiny, pokemon2.special))
                    .setFooter('Traded Pokémon will earn 1.5x more experience!');

                  sendDM(context.client, tradingWith, { embeds: [embed2] }).then(() => {
                    if (matchingEvolutions2 !== undefined) {
                      evolvePokemon(context, pokemon2, matchingEvolutions2.id, tradingWith, null, pokemon2.forme, false, true);
                    }
                  }).catch((error) => {
                    Logger.error(error);
                  });
                }

                if (context.client.trades[context.user.id].money !== undefined) {
                  log.money1 = {
                    receiver: context.user.id,
                    amount: context.client.trades[context.user.id].money,
                  };
                  addCoins(context.user.id, context.client.trades[context.user.id].money, 'trade');
                  addCoins(tradingWith, -context.client.trades[context.user.id].money, 'trade');

                  let embed1 = new MessageEmbed();
                  embed1.setDescription(`You received ${context.client.trades[context.user.id].money.toLocaleString()} <:pokecoin:741699521725333534> Coins from <@${tradingWith}>.`);

                  sendDM(context.client, context.user.id, { embeds: [embed1] });
                }
                if (context.client.trades[tradingWith].money !== undefined) {
                  log.money2 = {
                    receiver: tradingWith,
                    amount: context.client.trades[tradingWith].money,
                  };
                  addCoins(context.user.id, -context.client.trades[tradingWith].money, 'trade');
                  addCoins(tradingWith, context.client.trades[tradingWith].money, 'trade');

                  let embed2 = new MessageEmbed();
                  embed2.setDescription(`You received ${context.client.trades[tradingWith].money.toLocaleString()} <:pokecoin:741699521725333534> Coins from <@${context.user.id}>.`);

                  sendDM(context.client, tradingWith, { embeds: [embed2] });
                }

                createTradeLog(log);
                sendEmbed({ context, message: 'Trade accepted!', image: null, thumbnail: null, author: context.user });
                delete context.client.trades[context.user.id];
                delete context.client.trades[tradingWith];
              } else {
                sendEmbed({ context, message: `Waiting for <@${tradingWith}> to accept.`, image: null, thumbnail: null, author: context.user });
              }
            } else {
              sendEmbed({ context, message: 'You have to select a Pokémon or send money to accept the trade.', image: null, thumbnail: null, author: context.user });
            }
          } else {
            sendEmbed({ context, message: 'The person you are trading has not sent anything yet.', image: null, thumbnail: null, author: context.user });
          }
        } else {
          sendEmbed({ context, message: 'You are currently not trading.', image: null, thumbnail: null, author: context.user });
        }
      }
      if (context.commandInterction.options.getSubcommand() === 'cancel') {
        if (context.client.trades[context.user.id] !== undefined && context.client.trades[context.user.id].tradingWith !== undefined) {
          let { tradingWith } = context.client.trades[context.user.id];
          delete context.client.trades[context.user.id];
          delete context.client.trades[tradingWith];
        }
      }
      if (context.commandInterction.options.getSubcommand() === 'money') {
        let mention = context.commandInterction.options.getUser('player', true);
        const money = context.commandInterction.options.getInteger('money', true);
        if (mention.id === context.user.id) {
          sendEmbed({ context, message: 'You can\'t trade with yourself.', image: null, thumbnail: null, author: context.user });
        } else if (mention.bot) {
          sendEmbed({ context, message: 'You can\'t trade with bots.', image: null, thumbnail: null, author: context.user });
        } else if (money < 0) {
          sendEmbed({ context, message: 'Invalid amount.', image: null, thumbnail: null, author: context.user });
        } else if (money > context.player?.money.coins) {
          sendEmbed({ context, message: 'You don\'t have enough money.', image: null, thumbnail: null, author: context.user });
        } else if (context.client.trades[context.user.id] !== undefined
          && context.client.trades[context.user.id].tradingWith !== undefined
          && context.client.trades[context.user.id].tradingWith !== mention.id) {
          sendEmbed({ context, message: 'You are currently in an other trade. Finish it or cancel it with `%PREFIX%trade cancel`.', image: null, thumbnail: null, author: context.user });
        } else if (context.client.trades[context.user.id] !== undefined
          && context.client.trades[mention.id].tradingWith !== undefined
          && context.client.trades[mention.id].tradingWith !== context.user.id) {
          sendEmbed({ context, message: `<@${mention.id}> is already trading. Wait until the trade is finished and try again.`, image: null, thumbnail: null, author: context.user });
        } else if (context.client.trades[context.user.id] !== undefined) {
          context.client.trades[mention.id] = { money, tradingWith: context.user.id };
          sendEmbed({ context, message: `Hey <@${mention?.id}>! ${context.user.username} will send ${money.toLocaleString()} Coins to you. Both of you will have to accept with \`%PREFIX%trade accept\` or decline with \`%PREFIX%trade cancel\`.`, image: null, thumbnail: null, author: null, footer: 'You will be prompted to accept the trade before the trade happens', title: 'Trade' });
        } else {
          sendEmbed({ context, message: `Hey <@${mention?.id}>! ${context.user.username} will send ${money.toLocaleString()} Coins to you. Both of you will have to accept with \`%PREFIX%trade accept\` or decline with \`%PREFIX%trade cancel\`.`, image: null, thumbnail: null, author: null, footer: 'You will be prompted to accept the trade before the trade happens', title: 'Trade' });
          context.client.trades[mention.id] = { money, tradingWith: context.user.id };
          context.client.trades[context.user.id] = { tradingWith: mention.id };
        }
      }
      if (context.commandInterction.options.getSubcommand() === 'pokemon') {
        const pokemonNumber = context.commandInterction.options.getInteger('pokemon', true);
        let mention = context.commandInterction.options.getUser('player', true);
        if (mention === undefined) {
          sendEmbed({ context, message: 'No valid user found.', image: null, thumbnail: null, author: context.user });
        } else if (mention.id === context.user.id) {
          sendEmbed({ context, message: 'You can\'t trade with yourself.', image: null, thumbnail: null, author: context.user });
        } else if (mention.bot) {
          sendEmbed({ context, message: 'You can\'t trade with bots.', image: null, thumbnail: null, author: context.user });
        } else if (context.client.trades[context.user.id] !== undefined
          && context.client.trades[context.user.id].tradingWith !== undefined
          && context.client.trades[context.user.id].tradingWith !== mention.id) {
          sendEmbed({ context, message: 'You are currently in an other trade. Finish it or cancel it with `%PREFIX%trade cancel`.', image: null, thumbnail: null, author: context.user });
        } else if (context.client.trades[context.user.id] !== undefined
          && context.client.trades[mention.id].tradingWith !== undefined
          && context.client.trades[mention.id].tradingWith !== context.user.id) {
          sendEmbed({ context, message: `<@${mention.id}> is already trading. Wait until the trade is finished and try again.`, image: null, thumbnail: null, author: context.user });
        } else if (context.client.trades[context.user.id] !== undefined
          && context.client.trades[context.user.id].selectedPokemon !== undefined) {
          let selectedPokemon: any = null;
          await getPokemonByNumber(context.user.id, pokemonNumber - 1, context.player?.sort ?? '_ID_ASC').then((res: Pokemon) => {
            if (res !== null) {
              selectedPokemon = res;
              const selectedPokemonSpecies = getPokemonFromID(res.dexId, res.special);
              if (context.player?.selectedPokemon._id === res._id) {
                sendEmbed({ context, message: 'You can\'t trade your selected Pokémon!', image: null, thumbnail: null, author: context.user });
                resolve({});
                return;
              }
              if (res.locked) {
                sendEmbed({ context, message: 'This Pokémon is a reward and not tradable.', image: null, thumbnail: null, author: context.user });
                resolve({});
                return;
              }
              sendEmbed({ context, message: `Hey <@${mention?.id}>! ${context.user.username} will send a ${rarity[selectedPokemon.rarity]} ${selectedPokemonSpecies.displayName} ${selectedPokemon.shiny ? '✨' : ''} (Lvl. ${selectedPokemon.level}) to you. Both of you will have to accept with \`%PREFIX%trade accept\` or decline with \`%PREFIX%trade cancel\`.`, image: getImage(selectedPokemon, true, selectedPokemon.shiny, selectedPokemon.special), thumbnail: null, author: null, footer: 'You will be prompted to accept the trade before the trade happens', title: 'Trade' });
              context.client.trades[mention.id] = { selectedPokemon, tradingWith: context.user.id };
            } else {
              sendEmbed({ context, message: 'No Pokémon match this ID.', image: null, thumbnail: null, author: context.user });
              resolve({});
              return;
            }
          }).catch((e) => {
            reject(e);
          });
        } else {
          let selectedPokemon: any = null;
          await getPokemonByNumber(context.user.id, pokemonNumber - 1, context.player?.sort ?? '_ID_ASC').then((res: Pokemon) => {
            if (res !== null) {
              selectedPokemon = res;
              const selectedPokemonSpecies = getPokemonFromID(res.dexId, res.special);
              if (context.player?.selectedPokemon._id === res._id) {
                sendEmbed({ context, message: 'You can\'t trade your selected Pokémon!', image: null, thumbnail: null, author: context.user });
                resolve({});
                return;
              }
              if (res.locked) {
                sendEmbed({ context, message: 'This Pokémon is a reward and not tradable.', image: null, thumbnail: null, author: context.user });
                resolve({});
                return;
              }
              sendEmbed({ context, message: `Hey <@${mention?.id}>! Player ${context.user.username} has started a trade with you! ${context.user.username} will send a ${rarity[selectedPokemon.rarity]} ${selectedPokemonSpecies.displayName} ${selectedPokemon.shiny ? '✨' : ''} (Lvl. ${selectedPokemon.level}) to you. Send your Pokémon with \`%PREFIX%trade @user <Pokémon ID>\``, image: getImage(selectedPokemon, true, selectedPokemon.shiny, selectedPokemon.special), thumbnail: null, author: null, footer: 'You will be prompted to accept the trade before the trade happens', title: 'Trade' });
              context.client.trades[mention.id] = { selectedPokemon, tradingWith: context.user.id };
              context.client.trades[context.user.id] = { tradingWith: mention.id };
            } else {
              sendEmbed({ context, message: 'No Pokémon match this ID.', image: null, thumbnail: null, author: context.user });
              resolve({});
              return;
            }
          }).catch((e) => {
            reject(e);
          });
        }
      }
      resolve({});
    });
  },
};
