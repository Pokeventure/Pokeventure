import { Command, CommandContext } from 'command';
import Logger from '../modules/logger';
import { getPlayer } from '../modules/database';
import Fight from '../modules/fight';
import { choiceMaker, sendDM, sendEmbed } from '../modules/utils';
import { SlashCommandBuilder } from '@discordjs/builders';
import { ButtonInteraction, GuildMember } from 'discord.js';

const fights: any = [];
const collectors: any = [];

export const Battle: Command = {
  name: 'Battle',
  keywords: ['battle', 'pvp'],
  category: 'Fight',
  fullDesc: 'Will start a duel with an other user. You will need to have a team. To create a team, use the command `%PREFIX%team`. Battle will happen in DMs. You need to have your DMs open to the bot on a least one server.\n\nUsage: `%PREFIX%battle @player`\nUsage: `%PREFIX%battle @player broadcast` to display fight result in the current channel',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  earlyAccess: false,
  canBeBlocked: true,
  commandData: new SlashCommandBuilder()
    .setName('battle')
    .setDescription('Start a Player vs Player battle.')
    .addSubcommand((input) => input.setName('start').setDescription('Start a fight battle against player')
      .addMentionableOption((input) => input.setName('player').setDescription('Player to battle').setRequired(true))
      .addBooleanOption((input) => input.setName('broadcast').setDescription('Broadcast fight in this channel'))
    )
    .addSubcommand((input) => input.setName('cancel').setDescription('Add a Pokémon to your clan\'s Dojo')),

  async handler(context: CommandContext) {
    if (context.commandInterction.options.getSubcommand() === 'start') {
      let mentionned: any = context.commandInterction.options.getMentionable('player', true);
      if (collectors[context.user.id] !== undefined) {
        collectors[context.user.id].stop();
        delete collectors[context.user.id];
      }
      if (mentionned.id === context.user.id) {
        sendEmbed({ context, message: 'You can\'t challenge yourself.' });
        return;
      }
      if (mentionned.bot) {
        sendEmbed({ context, message: 'You can\'t challenge bot.' });
        return;
      }
      if (fights[context.user.id] !== undefined) {
        sendEmbed({ context, message: 'You are already in a battle. If you are stuck, use `%PREFIX%battle cancel`.' });
        return;
      }
      if (fights[mentionned.id] !== undefined) {
        sendEmbed({ context, message: `<@${mentionned.id}> is already in a battle.` });
        return;
      }

      sendEmbed({
        context, message: `Hi <@${mentionned.id}>! <@${context.user.id}> has challenged you to a battle.`, image: null, thumbnail: null, author: null, footer: 'Invitation will expire in 60 seconds.', components: [
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
      }).then((message) => {
        choiceMaker(context.client.discordClient, mentionned.id, message.id, async (interaction: ButtonInteraction, user: string, choice: number) => {
          if (choice === 1) {
            const player1 = await getPlayer(context.user.id);
            const team1 = player1.selectedTeam;
            if (team1 === null) {
              sendEmbed({ context, message: `<@${context.user.id}> has no team. Make one with \`%PREFIX%team\`` });
              return;
            }
            if (team1.teamPopulated.length === 0) {
              sendEmbed({ context, message: `<@${context.user.id}> has no Pokémon in their team. Make one with \`%PREFIX%team\`` });
              return;
            }
            const player1Team: any[] = [];

            team1.teamPopulated.sort((a: any, b: any) => {
              return team1.team.indexOf(b._id) - team1.team.indexOf(a._id);
            });
            for (let j = 0; j < 3; j++) {
              let pokemonToAdd = team1.teamPopulated.pop();
              if (pokemonToAdd !== undefined) {
                player1Team.push(pokemonToAdd);
              }
            }

            // Player 2

            const player2 = await getPlayer(mentionned.id);
            const team2 = player2.selectedTeam;
            if (team2 === null) {
              sendEmbed({ context, message: `<@${mentionned.id}> has no team. Make one with \`%PREFIX%team\`` });
              return;
            }
            if (team2.teamPopulated.length === 0) {
              sendEmbed({ context, message: `<@${mentionned.id}> has no Pokémon in their team. Make one with \`%PREFIX%team\`` });
              return;
            }
            const player2Team: any[] = [];
            team2.teamPopulated.sort((a: any, b: any) => {
              return team2.team.indexOf(b._id) - team2.team.indexOf(a._id);
            });
            for (let j = 0; j < 3; j++) {
              let pokemonToAdd = team2.teamPopulated.pop();
              if (pokemonToAdd !== undefined) {
                player2Team.push(pokemonToAdd);
              }
            }
            // const p1Channel = await context.client.discordClient.users.get(context.user.id)?.getDMChannel();
            // const p2Channel = await context.client.discordClient.users.get(context.message.mentions[0].id)?.getDMChannel();
            // Probe DMs
            let messagep1 = undefined;
            let messagep2 = undefined;
            try {
              messagep1 = await sendDM(context.client, context.user.id, { content: `Your battle with <@${mentionned.id}> will begin soon.` });
            } catch (e) {
              sendEmbed({ context, message: `An error occured. It seems that I can't send DMs to <@${context.user.id}>. Please enable them if you want to battle.` });
              return;
            }
            try {
              messagep2 = await sendDM(context.client, mentionned.id, { content: `Your battle with <@${context.user.id}> will begin soon.` });
            } catch (e) {
              sendEmbed({ context, message: `An error occured. It seems that I can't send DMs to <@${mentionned.id}>. Please enable them if you want to battle.` });
              return;
            }
            // fights[mentionned.id] = { opponent: context.user.id, fight };
            // fights[context.user.id] = { opponent: mentionned.id, fight };
            if (messagep1 !== undefined && messagep2 !== undefined) {
              const p1Context: any = {
                message: messagep1,
                userID: context.user.id,
                username: context.user.username,
              };
              const p2Context: any = {
                message: messagep2,
                userID: mentionned.id,
                username: mentionned.user.username,
              };

              context.client.redis.publish('fight', JSON.stringify({
                p1: p1Context,
                p2: p2Context,
                p1Team: player1Team,
                p2Team: player2Team,
                channel: context.channel,
                broadcast: context.commandInterction.options.getBoolean('broadcast') ?? false,
                interaction: context.interaction,
              }));
            }
          }
        }, 60000, true);
      }).catch((error) => {
        Logger.error(error);
      });
      //sendEmbed({ context, message: `Hey <@${context.message.mentions[0].id}>! You have been invited to fight. Send \`accept\` to accept the fight or send \`decline\` to decline the fight.` });
    } else if (context.commandInterction.options.getSubcommand() === 'cancel') {
      if (fights[context.user.id] !== undefined && fights[context.user.id].fight !== undefined) {
        fights[context.user.id].fight.kill();
        delete fights[context.user.id];
      }
      if (fights[context.user.id] !== undefined && fights[fights[context.user.id].opponent] !== undefined) {
        fights[fights[context.user.id].opponent].fight.kill();
        delete fights[fights[context.user.id].opponent];
      }
      sendEmbed({ context, message: 'Battle has been canceled' });
    }
  },
};
