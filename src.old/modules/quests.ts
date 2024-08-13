import { Chance } from 'chance';
import { CommandContext, User } from 'command';
import {
  getQuests, addToInventory, addLootbox, addQuests, createPokemon, addCoins, removeQuest, updateQuest, addStats,
} from './database';
import items from '../../data/items';
import { lootboxesEmoji, lootboxesNames } from './lootbox';
import { getPokemon, registerPokemon } from './pokedex';
import { sendEmbed } from './utils';
import { getLocations, randomPokemon } from './world';
import event from '../../data/event';

const rarity = ['<:n_:744200749600211004>', '<:u_:744200749541621851>', '<:r_:744200749554073660>', '<:sr:744200749189431327>', '<:ur:744200749537558588>', '<:lr:746745321660481576>'];
const regionNames = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar'];
const gymDifficulty = ['Standard', 'Expert', 'Master', 'Nightmare', 'Ultranightmare'];

async function incrementQuest(context: CommandContext, user: User, questType: string, value: number, data?: any[] | any) {
  const quests = await getQuests(user.id);
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
      if (quest.data !== null) {
        if (questType === 'catchPokemonsSpecific') {
          if (quest.data[0].includes(data[0]) && quest.data[1] === data[1]) {
            quest.value += value;
            updated = true;
          }
        } else if (questType === 'winFight') {
          if(data === quest.data) {
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
        if (reward.item < 0) {
          addCoins(user.id, reward.quantity, 'quest');
          text += `${items[reward.item].emoji} x${reward.quantity} ${items[reward.item].name}\n`;
        } else if (reward.item !== undefined) {
          newItems.push(reward);
          text += `${items[reward.item].emoji} x${reward.quantity} ${items[reward.item].name}\n`;
        } else if (reward.lootbox !== undefined) {
          newLootbox.push(reward);
          text += `${lootboxesEmoji[reward.lootbox]} x${reward.quantity} ${lootboxesNames[reward.lootbox]}\n`;
        } else if (reward.quest !== undefined) {
          newQuests.push(reward.quest);
          text += ':notebook_with_decorative_cover: A new quest!\n';
        } else if (reward.pokemon !== undefined) {
          const pokemon = getPokemon(reward.pokemon.dexId, reward.pokemon.special);

          let generatedPokemon = randomPokemon(pokemon.dexId, reward.pokemon.level, [], reward.pokemon.shiny ? 1000 : 1, reward.pokemon.special, 0);
          createPokemon(user.id, pokemon.dexId, reward.pokemon.level, reward.pokemon.shiny || false, generatedPokemon.moves, reward.pokemon.ivs, reward.pokemon.rarity, true, reward.pokemon.special, reward.pokemon.forme, generatedPokemon.abilitySlot, generatedPokemon.nature, generatedPokemon.gender);
          registerPokemon(user.id, generatedPokemon);
          text += `A level ${reward.pokemon.level} ${rarity[reward.pokemon.rarity]} ${pokemon.displayName} ${reward.pokemon.shiny ? '✨' : ''}!\n`;
        } else if (reward.randomPokemon) {
          const chance = new Chance();
          const randomPokemonData: any = chance.pickone(reward.randomPokemon);

          let generatedPokemon = randomPokemon(randomPokemonData.dexId, randomPokemonData.level ?? 1, [], randomPokemonData.shiny ? 1000 : 1, randomPokemonData.special, 2);
          createPokemon(user.id, generatedPokemon.dexId, generatedPokemon.level, generatedPokemon.shiny, generatedPokemon.moves, generatedPokemon.ivs, generatedPokemon.rarity, true, generatedPokemon.special, null, generatedPokemon.abilitySlot, generatedPokemon.nature, generatedPokemon.gender);
          registerPokemon(user.id, generatedPokemon);
          text += `A level ${generatedPokemon.level} ${rarity[generatedPokemon.rarity]} ${generatedPokemon.displayName} ${generatedPokemon.shiny ? '✨' : ''}!\n`;
        }
      });
      await sendEmbed({ context, message: `You completed a quest! You received:\n${text}`, image: null, thumbnail: null, author: null, footer: null, title: `Good job ${user.username}`, followUp: true });
      if (quest.repeatable) {
        quest.value = 0;
        await updateQuest(quest._id, quest);
      } else {
        await removeQuest(quest._id);
      }
      addStats(user.id, 'quests', 1);
    } else if (updated) {
      await updateQuest(quest._id, quest);
    }
  }
  if (newQuests.length > 0) {
    await addQuests(user.id, newQuests);
    if (newQuests[0].tutorial) {
      await sendEmbed({ context, message: `${getQuestText(newQuests[0])}`, image: null, thumbnail: null, author: context.user, footer: 'Check your quests with /quests', title: 'New tutorial quest!', followUp: true });
    }
  }
  if (newItems.length > 0) {
    for (let i = 0; i < newItems.length; i++) {
      await addToInventory(user.id, newItems[i].item, newItems[i].quantity);
    }
  }
  if (newLootbox.length > 0) {
    for (let i = 0; i < newLootbox.length; i++) {
      await addLootbox(user.id, newLootbox[i].lootbox, newLootbox[i].quantity);
    }
  }
}

function getQuestText(quest: any) {
  let questsText = '';
  switch (quest.type) {
    case 'catchAny':
      questsText += `**Catch ${quest.objective} Pokémons.** (${quest.value}/${quest.objective})`;
      break;
    case 'tutorialMove':
      questsText += '**[TUTORIAL] Move to a location to earn a reward (`%PREFIX%move`)**';
      break;
    case 'tutorialWild':
      questsText += '**[TUTORIAL] Spawn a wild Pokémon to earn a reward (`%PREFIX%wild`)**';
      break;
    case 'tutorialFight':
      questsText += '**[TUTORIAL] Fight a wild Pokémon to earn a reward (`%PREFIX%fight`)**';
      break;
    case 'tutorialCatch':
      questsText += '**[TUTORIAL] Catch a wild Pokémon to earn a reward. Pokémons are easier to catch when defeated (`%PREFIX%catch`)**';
      break;
    case 'tutorialShop':
      questsText += '**[TUTORIAL] Buy an item in the shop (`%PREFIX%shop`)**';
      break;
    case 'tutorialReward':
      questsText += '**[TUTORIAL] Claim a reward (`%PREFIX%reward`)**';
      break;
    case 'tutorialLootbox':
      questsText += '**[TUTORIAL] Open a lootbox (`%PREFIX%lootbox open` or `!help lootbox` for more informations)**';
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

export {
  incrementQuest, getQuestText,
};
