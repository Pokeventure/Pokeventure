import { Chance } from 'chance';
import { CommandContext, User } from 'command';
import { addCurrency } from './database';
import { incrementQuest } from './quests';
import { getRndInteger, sendEmbed } from './utils';
import event from '../../data/event';
import { randomPokemon } from './world';

async function giveCurrency(context: CommandContext, amount = 1) {
  if (amount <= 0) { return 0; }
  if (event.currency && new Date() >= new Date(event.startDate) && new Date() < new Date(event.endDate)) {
    addCurrency(context.user.id, amount);
    incrementQuest(context, context.user, 'findCurrency', amount);
    await sendEmbed({ context, message: `You got ${amount} ${event.currencyEmoji} ${event.currencyName}`, image: null, thumbnail: null, author: context.user });
    return amount;
  }
  return 0;
}

function giveCurrencyChance(context: CommandContext, user: User, amount = 1) {
  if (amount <= 0) { return 0; }
  if (event.currency && new Date() >= new Date(event.startDate) && new Date() < new Date(event.endDate)) {
    const chance = new Chance();
    const shouldGive = chance.weighted([true, false], [1, 3]);
    if (shouldGive) {
      giveCurrency(context, amount);
      return amount;
    }
  }
  return 0;
}

function generateRandomEncounter() {
  const rand = getRndInteger(0, event.eventLure.length);
  return randomPokemon(event.eventLure[rand].dexId, 10, [], 1, undefined, 0, event.eventLure[rand].special);
}

export {
  giveCurrency, giveCurrencyChance, generateRandomEncounter
};
