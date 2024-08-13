import { getPokemon } from "./pokedex";
import { getLocations, randomPokemon } from "./world";
import event from '../../data/event';
import { ButtonContext, CommandContext } from "../types/command";
import { User } from "discord.js";
import { Quest } from "../models/quest";
import { addCoins, addQuests, createPokemon } from "./database";
import items from "../../data/items";
import { lootboxesEmoji, lootboxesNames } from "./lootbox";
import { Chance } from "chance";
import { calculateLevelExperience, sendEmbed } from "./utils";

const rarity = ['<:n_:744200749600211004>', '<:u_:744200749541621851>', '<:r_:744200749554073660>', '<:sr:744200749189431327>', '<:ur:744200749537558588>', '<:lr:746745321660481576>'];
const regionNames = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar'];
const gymDifficulty = ['Standard', 'Expert', 'Master', 'Nightmare', 'Ultranightmare'];

export async function incrementQuest(context: CommandContext | ButtonContext, user: User, questType: string, value: number, data?: any[] | any) {
  const quests = await Quest.find({ discord_id: user.id }).exec();
  // In case we have more quests to add because of async shit
  if (quests === null || quests === undefined || quests.length === 0) { return; }
  const newQuests: any[] = [];
  const newItems: any[] = [];
  const newLootbox: any[] = [];
  for (let index = 0; index < quests.length; index++) {
    let updated = false;
    const quest = quests[index];
    if (quest.patreon && (context.player?.patronLevel ?? 0) <= 0) {
      continue;
    }
    if (quest.type === questType) {
      if (quest.data !== undefined) {
        if (questType === 'catchPokemonsSpecific') {
          if (quest.data[0].includes(data[0]) && quest.data[1] === data[1]) {
            quest.value += value;
            updated = true;
          }
        } else if (questType === 'winFight') {
          if (data === quest.data) {
            quest.value += value;
            updated = true;
          }
        } else if (typeof quest.data === 'string' || typeof quest.data === 'number') {
          if (data !== undefined && data !== null && data.includes(quest.data)) {
            quest.value += value;
            updated = true;
          }
        } else if (quest.data.includes(data)) {
          quest.value += value;
          updated = true;
        }
      } else {
        quest.value += value;
        updated = true;
      }
    }
    if (quest.value >= quest.objective) {
      // Give reward and delete quest
      let text = '';
      quest.reward.forEach((reward: any) => {
        console.log(reward);
        if (reward.coins) {
          addCoins(context.user.id, reward.coins, 'quest');
          text += `<:pokecoin:741699521725333534> x${reward.coins} coins\n`;
        } else if (reward.item) {
          newItems.push(reward);
          text += `${items[reward.item].emoji} x${reward.quantity} ${items[reward.item].name}\n`;
        } else if (reward.lootbox) {
          newLootbox.push(reward);
          text += `${lootboxesEmoji[reward.lootbox]} x${reward.quantity} ${lootboxesNames[reward.lootbox]}\n`;
        } else if (reward.quest) {
          newQuests.push(reward.quest);
          text += ':notebook_with_decorative_cover: A new quest!\n';
        } else if (reward.pokemon) {
          const pokemon = getPokemon(reward.pokemon.dexId, reward.pokemon.special);

          let generatedPokemon = randomPokemon(pokemon.dexId, reward.pokemon.level, [], reward.pokemon.shiny ? 1000 : 1, reward.pokemon.special, 0);
          createPokemon(context.user.id, {
            dexId: pokemon.dexId,
            level: reward.pokemon.level,
            shiny: reward.pokemon.shiny || false,
            moves: generatedPokemon.moves,
            ivs: reward.pokemon.ivs,
            rarity: reward.pokemon.rarity,
            fav: true,
            special: reward.pokemon.special,
            forme: reward.pokemon.forme,
            abilitySlot: generatedPokemon.abilitySlot,
            nature: generatedPokemon.nature,
            gender: generatedPokemon.gender,
            experience: calculateLevelExperience(generatedPokemon.level),
            friendship: 0,
            owner: user.id,
            firstOwner: user.id
          });
          // registerPokemon(user.id, generatedPokemon);
          text += `A level ${reward.pokemon.level} ${rarity[reward.pokemon.rarity]} ${pokemon.displayName} ${reward.pokemon.shiny ? '✨' : ''}!\n`;
        } else if (reward.randomPokemon) {
          const chance = new Chance();
          const randomPokemonData: any = chance.pickone(reward.randomPokemon);

          let generatedPokemon = randomPokemon(randomPokemonData.dexId, randomPokemonData.level ?? 1, [], randomPokemonData.shiny ? 1000 : 1, randomPokemonData.special, 2);
          createPokemon(context.user.id, {
            dexId: generatedPokemon.dexId,
            level: generatedPokemon.level,
            shiny: generatedPokemon.shiny,
            moves: generatedPokemon.moves,
            ivs: generatedPokemon.ivs,
            rarity: generatedPokemon.rarity,
            fav: true,
            special: generatedPokemon.special,
            abilitySlot: generatedPokemon.abilitySlot,
            nature: generatedPokemon.nature,
            gender: generatedPokemon.gender,
            owner: user.id,
            firstOwner: user.id,
            friendship: 0,
            experience: calculateLevelExperience(generatedPokemon.level),
          });
          // registerPokemon(user.id, generatedPokemon);
          text += `A level ${generatedPokemon.level} ${rarity[generatedPokemon.rarity]} ${getPokemon(generatedPokemon.dexId, generatedPokemon.special).displayName} ${generatedPokemon.shiny ? '✨' : ''}!\n`;
        }
      });
      await sendEmbed(context, { description: `You completed a quest! You received:\n${text}`, title: `Good job ${user.username}` });
      if (quest.repeatable) {
        quest.value = 0;
        quest.save();
      } else {
        quest.deleteOne();
      }
      // addStats(user.id, 'quests', 1);
    } else if (updated) {
      quest.save();
    }
  }
  if (newQuests.length > 0) {
    await addQuests(user.id, newQuests);
    if (newQuests[0].tutorial) {
      await sendEmbed(context, { description: `${getQuestText(newQuests[0])}`, author: context.user, footer: { text: 'Check your quests with /quests' }, title: 'New tutorial quest!' });
    }
  }
  if (newItems.length > 0) {
    for (let i = 0; i < newItems.length; i++) {
      // await addToInventory(user.id, newItems[i].item, newItems[i].quantity);
    }
  }
  if (newLootbox.length > 0) {
    for (let i = 0; i < newLootbox.length; i++) {
      // await addLootbox(user.id, newLootbox[i].lootbox, newLootbox[i].quantity);
    }
  }
}

export function getQuestText(quest: any) {
  let questsText = '';
  switch (quest.type) {
    case 'catchAny':
      questsText += `**Catch ${quest.objective} Pokémons.** (${quest.value}/${quest.objective})`;
      break;
    case 'tutorialMove':
      questsText += '**[TUTORIAL] Move to a location to earn a reward (`/move`)**';
      break;
    case 'tutorialWild':
      questsText += '**[TUTORIAL] Spawn a wild Pokémon to earn a reward (`/wild`)**';
      break;
    case 'tutorialFight':
      questsText += '**[TUTORIAL] Fight a wild Pokémon to earn a reward (`/fight`)**';
      break;
    case 'tutorialCatch':
      questsText += '**[TUTORIAL] Catch a wild Pokémon to earn a reward. Pokémons are easier to catch when defeated (`/catch`)**';
      break;
    case 'tutorialShop':
      questsText += '**[TUTORIAL] Buy an item in the shop (`/shop`)**';
      break;
    case 'tutorialReward':
      questsText += '**[TUTORIAL] Claim a reward (`/reward`)**';
      break;
    case 'tutorialLootbox':
      questsText += '**[TUTORIAL] Open a lootbox (`/lootbox open` or `!help lootbox` for more informations)**';
      break;
    case 'raid':
      questsText += `**Participate in raids ${quest.objective} time.** (${quest.value}/${quest.objective})`;
      break;
    case 'defeat':
      questsText += `**Defeat ${quest.objective} Pokémons.** (${quest.value}/${quest.objective})`;
      break;
    case 'catchType':
      questsText += `**Catch ${quest.objective} Pokémons of ${quest.data} type.** (${quest.value}/${quest.objective})`;
      break;
    case 'catchInLocation':
      questsText += `**Catch ${quest.objective} Pokémons in ${getLocations()[quest.data[0]].name} location.** (${quest.value}/${quest.objective})`;
      break;
    case 'gymClearDifficulty':
      questsText += `**Beat all gym trainers at ${gymDifficulty[quest.data[0]]} difficulty in one region.** (${quest.value}/${quest.objective})`;
      break;
    case 'gymClearRegion':
      questsText += `**Beat all gym trainers in the ${regionNames[quest.data[0]]} region.** (${quest.value}/${quest.objective})`;
      break;
    case 'defeatSpecificTrainer':
      questsText += `**Beat ${quest.data.join(', ')}** (${quest.value}/${quest.objective})`;
      break;
    case 'defeatTrainer':
      questsText += `**Beat ${quest.objective} trainers.** (${quest.value}/${quest.objective})`;
      break;
    case 'completeBingo':
      questsText += `**Complete ${quest.objective} Bingo grids.** (${quest.value}/${quest.objective})`;
      break;
    case 'findCurrency':
      questsText += `**Get ${quest.objective} ${event.currencyEmoji} ${event.currencyName}.** (${quest.value}/${quest.objective})`;
      break;
    case 'catchPokemonsSpecific':
      questsText += `**Catch ${quest.objective} ${quest.data[0].map((x: any) => getPokemon(x, quest.data[1]).displayName).join(', ')}** (${quest.value}/${quest.objective})`;
      break;
    case 'catchSpecialPokemons':
      questsText += `**Catch ${quest.objective} 🎄 Xmas Pokémon** (${quest.value}/${quest.objective})`;
      break;
    case 'winFight':
      questsText += `**Win ${quest.objective} fights with 🎃 Halloween Hoopa** (${quest.value}/${quest.objective})`;
      break;
  }
  return questsText;
}