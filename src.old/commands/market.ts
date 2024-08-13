import { Command, CommandContext, User } from 'command';
import {
  choiceMaker,
  paginationEmbed, sendEmbed
} from '../modules/utils';
import {
  addCoins, addPokemon, addToMarket, deleteFromMarket, deletePokemon, getMarket, getPlayer, getPokemonByObjectID, createMarketLog, getPokemonByNumber,
} from '../modules/database';
import {
  findPokemon,
  getPokemon as getPokemonPokedex, rarity, sendInfo,
} from '../modules/pokedex';
import { needToCheckMarket } from '../modules/market';
import { Pokemon } from 'pokemon';
import { SlashCommandBuilder } from '@discordjs/builders';
import { ButtonInteraction, Message, MessageEmbed } from 'discord.js';
import { Routes } from 'discord-api-types/v9';
import Logger from '../modules/logger';

const collectors: any = [];

function tax(amount: number) {
  if (amount * 0.05 < 1) {
    return Math.round(Math.max(amount - 1, 0));
  }
  return Math.round(Math.max(amount - amount * 0.05, 0));
}

export const Market: Command = {
  name: 'Market',
  keywords: ['market'],
  category: 'Bot',
  fullDesc: 'Sell and buy Pokémon from market.\n\nUsage: `%PREFIX%market` to see last offers.\nUsage `%PREFIX%market <filters>` to filter.\n(Available filters: `n|u|r|sr|ur|lr|shiny|mega|pokedex number`)\nUsage: `%PREFIX%market sort <option>` to sort.\n(Sort option available: `price|-price|level|-level|rarity|-rarity`)\nUsage: `%PREFIX%market sell <id> <price>` to sell one of your Pokémon. (Note: Limit of 10 offers per trainer)\nUsage: `%PREFIX%market buy <offer id>` to buy a Pokémon.\nUsage: `%PREFIX%market view <offer id>` to have more information about the offer.\nUsage: `%PREFIX%market me` to see all your offers.\nUsage: `%PREFIX%market cancel <offer id>` to cancel one of your offer.\n\nExample: `%PREFIX%market sr` to see all SR offers.\nExample: `%PREFIX%market 3` to see all Venusaur offers.\nExample: `%PREFIX%market sort level` to sort offers by level in ascending order.\nExample: `%PREFIX%market sort -level` to sort offers by level in descending order.\nExample: `%PREFIX%market lr mega shiny 3 sort price` to search for LR Venusaur-Mega shiny sorted by price in ascending order.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('market')
    .setDescription('Buy and sell Pokémons')
    .addSubcommand(option => option.setName('sell').setDescription('Sell a Pokémon')
      .addIntegerOption(option => option.setName('pokemon').setDescription('Pokémon ID').setRequired(true))
      .addIntegerOption(option => option.setName('price').setDescription('Price to sell your Pokémon').setRequired(true))
    )
    .addSubcommand(option => option.setName('buy').setDescription('Buy a Pokémon from market')
      .addStringOption(option => option.setName('offer').setDescription('Market offer ID').setRequired(true))
    )
    .addSubcommand(option => option.setName('me').setDescription('View your offers on market'))
    .addSubcommand(option => option.setName('cancel').setDescription('Cancel one of your offer')
      .addStringOption(option => option.setName('offer').setDescription('Market offer ID').setRequired(true))
    )
    .addSubcommand(option => option.setName('view').setDescription('View offer')
      .addStringOption(option => option.setName('offer').setDescription('Market offer ID').setRequired(true))
    )
    .addSubcommand(option => option.setName('offers').setDescription('View all offers')
      .addStringOption(option => option.setName('rarity').setDescription('Filter by rarity')
        .addChoice('N', 'n')
        .addChoice('U', 'u')
        .addChoice('R', 'r')
        .addChoice('SR', 'sr')
        .addChoice('UR', 'ur')
        .addChoice('LR', 'lr')
      )
      .addBooleanOption(option => option.setName('mega').setDescription('Filter by Mega'))
      .addBooleanOption(option => option.setName('shiny').setDescription('Filter by Shiny'))
      .addStringOption(option => option.setName('sort').setDescription('Sort offers')
        .addChoice('Price ⬆️', 'price_asc')
        .addChoice('Price ⬇️', 'price_desc')
        .addChoice('Rarity ⬆️', 'rarity_asc')
        .addChoice('Rarity ⬇️', 'rarity_desc')
        .addChoice('Level ⬆️', 'level_asc')
        .addChoice('Level ⬇️', 'level_desc')
      )
      .addStringOption(option => option.setName('name').setDescription('Filter by name'))
    ),

  handler(context: CommandContext): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      if (context.player?.tradeLocked) {
        sendEmbed({ context, message: 'You can\'t use Market because you have been caught doing activities against the bot rules.', image: null, thumbnail: null, author: context.user });
        resolve({});
        return;
      }
      if (context.commandInterction.options.getSubcommand(true) === 'sell') {
        const pokemonId: number = context.commandInterction.options.getInteger('pokemon', true);
        const price: number = context.commandInterction.options.getInteger('price', true);
        if (price < 1 || price > 2000000000) {
          sendEmbed({ context, message: 'Your offer price should be between 1 and 2,000,000,000.' });
          return;
        }
        getMarket({
          discord_id: context.user.id,
        }).then((res) => {
          if (res.length >= 10) {
            sendEmbed({ context, message: 'You can\'t have more than 10 offers at the same time on the market.' });
          } else {
            getPlayer(context.user.id).then((player) => {
              getPokemonByNumber(context.user.id, pokemonId - 1, player?.sort).then((res: Pokemon) => {
                if (res !== null) {
                  if (res.locked) {
                    sendEmbed({ context, message: 'You can\'t sell this Pokémon because you won it.' });
                    return;
                  }
                  if (res._id.toString() === player?.selectedPokemon._id.toString()) {
                    sendEmbed({ context, message: 'You can\'t sell your selected Pokémon.' });
                    return;
                  }
                  const pokemon = getPokemonPokedex(res.dexId, res.special);
                  sendEmbed({
                    context, message: `Do you want to sell your ${rarity[res.rarity]} ${pokemon.displayName} ${res.shiny ? '✨' : ''} for ${price.toLocaleString()} <:pokecoin:741699521725333534>?\nYou will receive ${tax(price).toLocaleString()} <:pokecoin:741699521725333534> after 5% tax.`, components: [
                      {
                        label: 'Accept',
                        style: 3,
                        customId: 'choice_1',
                      }, {
                        label: 'Decline',
                        style: 4,
                        customId: 'choice_2',
                      },
                    ]
                  }).then(async (message) => {
                    choiceMaker(context.client.discordClient, context.user.id, message.id, (interaction: ButtonInteraction, user: string, choice: number) => {
                      if (user === context.user.id) {
                        if (choice === 1) {
                          getPokemonByObjectID(res._id).then((pokemonToSell) => {
                            if (pokemonToSell !== null) {
                              addToMarket(context.user.id, pokemonToSell, price).then(() => {
                                needToCheckMarket();
                                deletePokemon(res._id);

                                const resultEmbed = new MessageEmbed();
                                resultEmbed.setDescription(`Your ${pokemon.displayName} has been put in the market for ${price.toLocaleString()} <:pokecoin:741699521725333534>. It will appear in the market soon.`);
                                interaction.reply({ embeds: [resultEmbed] });
                              }).catch((error) => {
                                reject(error);
                              });
                            } else {
                              const resultEmbed = new MessageEmbed();
                              resultEmbed.setDescription('You do not have the Pokémon anymore.');
                              interaction.reply({ embeds: [resultEmbed] });
                            }
                          }).catch((e) => {
                            reject(e);
                          });
                        }
                      }
                    }, 30000, true);
                  }).catch((error) => {
                    reject(error);
                  });
                } else {
                  sendEmbed({ context, message: 'Can\'t find Pokémon with this ID.' });
                }
              }).catch((error) => {
                reject(error);
              });
            }).catch((error) => {
              reject(error);
            });
          }
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand(true) === 'buy') {
        const offerId: string = context.commandInterction.options.getString('offer', true);
        getMarket({
          marketId: offerId,
        }).then((res) => {
          if (res.length === 1) {
            const pokemon = getPokemonPokedex(res[0].pokemon.dexId, res[0].pokemon.special);
            sendEmbed({
              context, message: `Do you want to buy ${rarity[res[0].pokemon.rarity]} ${pokemon.displayName} ${res[0].pokemon.shiny ? '✨' : ''} for ${res[0].price.toLocaleString()} <:pokecoin:741699521725333534>?`, image: null, thumbnail: null, author: null, footer: null, title: null, color: null, components: [
                {
                  type: 2,
                  label: 'Accept',
                  style: 3,
                  customId: 'choice_1',
                }, {
                  type: 2,
                  label: 'Decline',
                  style: 4,
                  customId: 'choice_2',
                },
              ]
            }).then(async (message) => {
              choiceMaker(context.client.discordClient, context.user.id, message.id, (interaction: ButtonInteraction, user: string, choice: number) => {
                if (user === context.user.id) {
                  if (choice === 1) {
                    getMarket({ _id: res[0]._id }).then((res) => {
                      if (res.length === 1) {
                        getPlayer(context.user.id).then((player) => {
                          if (player?.money.coins >= res[0].price) {
                            deleteFromMarket(res[0]._id).then((del) => {
                              if (del.recordId !== null) {
                                addCoins(context.user.id, -res[0].price, 'market buyer').then(() => {
                                  addCoins(res[0].discord_id, Math.round(res[0].price - res[0].price * 0.05), 'market seller').catch((error) => {
                                    reject(error);
                                  });
                                }).catch((error) => {
                                  reject(error);
                                });
                                delete res[0].pokemon._id;
                                res[0].pokemon.owner = context.user.id;
                                res[0].pokemon.fav = false;
                                res[0].pokemon.luckyEgg = false;
                                if (res[0].pokemon.rarity === 5 || res[0].pokemon.shiny) {
                                  res[0].pokemon.fav = true;
                                }
                                addPokemon(res[0].pokemon);
                                createMarketLog({
                                  buyer: context.user.id,
                                  seller: res[0].discord_id,
                                  price: res[0].price,
                                  pokemon: res[0].pokemon,
                                  date: new Date(),
                                });
                                const resultEmbed = new MessageEmbed();
                                resultEmbed.setDescription(`You have bought ${pokemon.displayName} from the market for ${res[0].price.toLocaleString()} <:pokecoin:741699521725333534>.`);
                                interaction.reply({ embeds: [resultEmbed] });


                                const embed = new MessageEmbed();
                                embed.setDescription(`You sold your ${rarity[res[0].pokemon.rarity]} ${pokemon.displayName} ${res[0].pokemon.shiny ? '✨' : ''} for ${res[0].price.toLocaleString()} <:pokecoin:741699521725333534>.\nYou received ${tax(res[0].price).toLocaleString()} <:pokecoin:741699521725333534> after 5% tax.`);
                                embed.setTitle('Pokémon sold');

                                context.client.restClient.post(Routes.userChannels(), {
                                  body: {
                                    recipient_id: res[0].discord_id,
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
                            }).catch((error) => {
                              reject(error);
                            });
                          } else {
                            const resultEmbed = new MessageEmbed();
                            resultEmbed.setDescription('You don\'t have enough money.');
                            interaction.reply({ embeds: [resultEmbed] });
                          }
                        }).catch((error) => {
                          reject(error);
                        });
                      } else {
                        sendEmbed({ context, message: 'This offer doesn\'t exist anymore.' });
                      }
                    }).catch((error) => {
                      reject(error);
                    });
                  }
                }
              }, 30000);
            }).catch((error) => {
              reject(error);
            });
          } else if (res.length > 1) {
            sendEmbed({ context, message: 'Oopsie there\'s 2 same offer ID. Ask for support on official Pokéventure server.' });
          } else {
            sendEmbed({ context, message: 'No offer found with this ID.' });
          }
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand(true) === 'me') {
        getMarket({ discord_id: context.user.id }).then((res) => {
          let text = '**POKEMON** | **LEVEL** | **PRICE** | **OFFER ID**\n\n';
          for (let i = 0; i < res.length; i++) {
            if (res[i].pokemon === null) { continue; }
            const pokemon = getPokemonPokedex(res[i].pokemon.dexId, res[i].pokemon.special);
            text += `${rarity[res[i].pokemon.rarity]} ${pokemon.displayName} ${res[i].pokemon.shiny ? '✨' : ''} | Lvl. ${res[i].pokemon.level} | ${res[i].price.toLocaleString()} <:pokecoin:741699521725333534> | \`${res[i].marketId}\`\n`;
          }
          sendEmbed({ context, message: text, image: null, thumbnail: null, author: context.user, footer: 'Cancel one of your offer by doing %PREFIX%market cancel <offer id>', title: 'Your offers' });
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand(true) === 'cancel') {
        getMarket({ discord_id: context.user.id, marketId: context.commandInterction.options.getString('offer', true) }).then((res) => {
          if (res.length >= 1) {
            deleteFromMarket(res[0]._id).then((del) => {
              if (del.recordId !== null) {
                addPokemon(res[0].pokemon);
                sendEmbed({ context, message: 'Your offer has been removed from market.' });
              }
            }).catch((error) => {
              reject(error);
            });
          } else {
            sendEmbed({ context, message: 'No offer found.' });
          }
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand(true) === 'view') {
        getMarket({ marketId: context.commandInterction.options.getString('offer', true) }).then((res) => {
          if (res.length >= 1) {
            sendInfo(res[0].pokemon, context, true, res[0].marketId);
            resolve({});
          } else {
            sendEmbed({ context, message: 'No offer found.' });
          }
        }).catch((error) => {
          reject(error);
        });
      } else {
        let filter: any = {
          _operators: { marketId: { exists: true } }
        };
        let sort: string = '_ID_DESC';
        let pokemon: any = {};
        
        let rarityFilter: string | null = context.commandInterction.options.getString('rarity');
        if (rarityFilter === 'n') {
          pokemon.rarity = 0;
        } else if (rarityFilter === 'u') {
          pokemon.rarity = 1;
        } else if (rarityFilter === 'r') {
          pokemon.rarity = 2;
        } else if (rarityFilter === 'sr') {
          pokemon.rarity = 3;
        } else if (rarityFilter === 'ur') {
          pokemon.rarity = 4;
        } else if (rarityFilter === 'lr') {
          pokemon.rarity = 5;
        }
        if (context.commandInterction.options.getBoolean('mega')) {
          pokemon.special = 'mega';
        }
        if (context.commandInterction.options.getBoolean('shiny')) {
          pokemon.shiny = true;
        }
        if (context.commandInterction.options.getString('sort') !== null) {
          let sort = context.commandInterction.options.getString('sort', true);
          if (sort === 'price_desc') {
            sort = 'PRICE_DESC';
          } else if (sort === 'price_asc') {
            sort = 'PRICE_ASC';
          } else if (sort === 'rarity_desc') {
            sort = 'RARITY_DESC';
          } else if (sort === 'rarity_asc') {
            sort = 'RARITY_ASC';
          } else if (sort === 'level_desc') {
            sort = 'LEVEL_DESC';
          } else if (sort === 'level_asc') {
            sort = 'LEVEL_ASC';
          }
        }

        if (context.commandInterction.options.getString('name') !== null) {
          let searchPokemon = findPokemon(context.commandInterction.options.getString('name', true));
          if (searchPokemon !== undefined) {
            let id = searchPokemon.map((pkm: any) => pkm.dexId)[0];
            pokemon.dexId = id;
          }
        }

        if (Object.keys(pokemon).length !== 0) {
          filter = { ...filter, pokemon };
        }

        getMarket(filter, sort).then((res) => {
          let count = 0;

          const pages = [];
          let embed = new MessageEmbed();
          let description = '';
          description = 'View an offer with `/market view <offer id>`\nBuy an offer with \`/market buy <offer id>\`\n\n**POKEMON** | **LEVEL** | **PRICE** | **OFFER ID**\n\n';
          embed.setTitle('Market');
          for (let i = 0; i < res.length; i++) {
            if (res[i].pokemon === null) { continue; }
            const pokemon = getPokemonPokedex(res[i].pokemon.dexId, res[i].pokemon.special);
            description += `${rarity[res[i].pokemon.rarity]} ${pokemon.displayName} ${res[i].pokemon.shiny ? '✨' : ''} | Lvl. ${res[i].pokemon.level} | ${res[i].price.toLocaleString()} <:pokecoin:741699521725333534> | \`${res[i].marketId}\`\n`;
            count++;
            if (count === 10) {
              count = 0;
              embed.setDescription(description);
              pages.push(embed);
              embed = new MessageEmbed();
              description = '**POKEMON** | **LEVEL** | **PRICE** | **OFFER ID**\n\n';
            }
          }
          if (count > 0 || pages.length === 0) {
            embed.setDescription(description);
            pages.push(embed);
          }
          paginationEmbed(context, pages);
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      }
    });
  },
};
