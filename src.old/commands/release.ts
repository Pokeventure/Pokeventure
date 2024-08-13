import { Command, CommandContext, User } from 'command';
import { rarity } from '../modules/pokedex';
import { deletePokemons, getPokemons, addCoins } from '../modules/database';
import { choiceMaker, sendEmbed } from '../modules/utils';
import Logger from '../modules/logger';
import { SlashCommandBuilder } from '@discordjs/builders';
import { ButtonInteraction, MessageEmbed } from 'discord.js';
import { COPYFILE_EXCL } from 'node:constants';

const releaseAmount = [
  75,
  200,
  500,
  1500,
  3500,
  15000,
];

export const Release: Command = {
  name: 'Release',
  keywords: ['release', 'rel'],
  category: 'Pokémon',
  fullDesc: `Command to release your Pokémons and earn some money. This command won't release your currently selected Pokémon or your favorite Pokémons.\nHere the value of each rarity:\n${rarity[0]}: ${releaseAmount[0]} <:pokecoin:741699521725333534>\n${rarity[1]}: ${releaseAmount[1]} <:pokecoin:741699521725333534>\n${rarity[2]}: ${releaseAmount[2]} <:pokecoin:741699521725333534>\n${rarity[3]}: ${releaseAmount[3]} <:pokecoin:741699521725333534>\n${rarity[4]}: ${releaseAmount[4]} <:pokecoin:741699521725333534>\n${rarity[5]}: ${releaseAmount[5]} <:pokecoin:741699521725333534>\n\nShines ✨ value are multiplied by 5.\nUsage: \`%PREFIX%release <IDs|all>\`\n\nExample: \`%PREFIX%release 3,15,45\` will release Pokémons #3, #15 and #45.\nExample: \`%PREFIX%release all\` will release all your Pokémons that are not your favorite Pokémons or is you currently selected Pokémon.\nExample: \`%PREFIX%release all N\` will release all your Pokémons that are <:n_:744200749600211004> rarity.`,
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('release')
    .setDescription('Release your Pokémon and earn some money.')
    .addBooleanOption(option => option.setName('all').setDescription('Release all Pokemon'))
    .addStringOption(option => option.setName('rarity').setDescription('Unfavorite Pokemon by rarity')
      .addChoice('N', 'n')
      .addChoice('U', 'u')
      .addChoice('R', 'r')
      .addChoice('SR', 'sr')
      .addChoice('UR', 'ur')
      .addChoice('LR', 'lr')
    )
    .addStringOption(option => option.setName('id').setDescription('Pokémon ID (IDs can be separated by , )')),

  handler(context: CommandContext): any {
    let moneyResult = 0;
    let idsToRemove: any[] = [];
    let ids: any[] = [];
    let all = false;
    let rarity = -1;
    if (context.args === undefined) {
      if (context.commandInterction.options.getBoolean('all')) {
        all = true;
      } else {
        if (context.commandInterction.options.getString('rarity') === 'n') {
          rarity = 0;
        } else if (context.commandInterction.options.getString('rarity') === 'u') {
          rarity = 1;
        } else if (context.commandInterction.options.getString('rarity') === 'r') {
          rarity = 2;
        } else if (context.commandInterction.options.getString('rarity') === 'sr') {
          rarity = 3;
        } else if (context.commandInterction.options.getString('rarity') === 'ur') {
          rarity = 4;
        } else if (context.commandInterction.options.getString('rarity') === 'lr') {
          rarity = 5;
        }
        ids = (context.commandInterction.options.getString('id') ?? '').replace(/\s/g, '').split(',');
      }
    }
    getPokemons(context.user.id, context.player?.sort ?? '_ID_ASC').then((res) => {
      let hasMaxRarity = false;
      let hasShiny = false;
      for (let i = 0; i < res.length; i++) {
        if (res[i]._id === context.player?.selectedPokemon._id) { continue; }
        if (res[i].fav) { continue; }
        if (rarity >= 0) {
          if (res[i].rarity === rarity) {
            if (res[i].rarity === 5) { hasMaxRarity = true; }
            if (res[i].shiny) { hasShiny = true; }
            moneyResult += releaseAmount[res[i].rarity] * (res[i].shiny ? 5 : 1);
            idsToRemove.push(res[i]._id);
          }
        } else if (all || ids.includes((i + 1).toString())) {
          if (res[i].rarity === 5) { hasMaxRarity = true; }
          if (res[i].shiny) { hasShiny = true; }
          moneyResult += releaseAmount[res[i].rarity] * (res[i].shiny ? 5 : 1);
          idsToRemove.push(res[i]._id);
        } else if (context.args !== undefined) {
          if(res[i]._id === context.args[1]) {
            moneyResult += releaseAmount[res[i].rarity] * (res[i].shiny ? 5 : 1);
            idsToRemove.push(res[i]._id);
          }
        }
      }
      if (idsToRemove.length === 0) {
        sendEmbed({ context, message: 'No valid Pokémon to be released' });
        return;
      }
      let security = Date.now().toString();
      context.client.redis.set(`release-${context.user.id}`, security, 'EX', 30).catch(() => { });
      sendEmbed({
        context, message: `${idsToRemove.length} Pokémons will be released. You will earn ${moneyResult} <:pokecoin:741699521725333534>.\n${hasShiny ? '⚠️ You will release at least one Shiny ✨ ⚠️\n' : ''}${hasMaxRarity ? '⚠️ You will release at least one <:lr:746745321660481576> Pokémon ⚠️\n' : ''}Are you sure to continue?`, image: null, thumbnail: null, author: context.user, footer: null, title: 'Release', color: null, components: [
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
        choiceMaker(context.client.discordClient, context.user.id, message.id, async (interaction: ButtonInteraction, user: string, choice: number) => {
          if (choice === 1) {
            let securityCheck = await context.client.redis.get(`release-${context.user.id}`).catch(() => { });
            if (securityCheck !== security) {
              return;
            }
            moneyResult = 0;
            idsToRemove = [];
            getPokemons(context.user.id, context.player?.sort ?? '_ID_ASC').then((res) => {
              for (let i = 0; i < res.length; i++) {
                if (res[i]._id === context.player?.selectedPokemon._id) { continue; }
                if (res[i].fav) { continue; }
                if (rarity >= 0) {
                  if (res[i].rarity === rarity) {
                    moneyResult += releaseAmount[res[i].rarity] * (res[i].shiny ? 5 : 1);
                    idsToRemove.push(res[i]._id);
                  }
                } else if (all || ids.includes((i + 1).toString())) {
                  moneyResult += releaseAmount[res[i].rarity] * (res[i].shiny ? 5 : 1);
                  idsToRemove.push(res[i]._id);
                } else if (context.args !== undefined) {
                  if(res[i]._id === context.args[1]) {
                    moneyResult += releaseAmount[res[i].rarity] * (res[i].shiny ? 5 : 1);
                    idsToRemove.push(res[i]._id);
                  }
                }
              }
              addCoins(context.user.id, moneyResult, 'release');
              deletePokemons(idsToRemove);
              context.commandInterction.deleteReply();
              let embed = new MessageEmbed();
              embed.setDescription(`${idsToRemove.length} Pokémons have been released. You earned ${moneyResult} <:pokecoin:741699521725333534>.`)
                .setTitle('Release')
                .setAuthor(context.user.username, context.user.avatarURL);
              interaction.reply({ embeds: [embed] });
            }).catch((error) => {
              Logger.error(error);
            });
          } else {
            interaction.reply('Pokémon have not been released');
          }
        }, 30000, true);
      }).catch((error) => {
        Logger.error(error);
      });
    }).catch((error) => {
      Logger.error(error);
    });
  },
};
