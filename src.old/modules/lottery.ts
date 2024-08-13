import { Chance } from 'chance';
import { randomPokemon } from './world';
import { getRndInteger } from './utils';
import lottery from '../../data/lottery';

function getRandomPokemonForLottery(lure: boolean = false) {
  let lotteryFiltered: any;

  const rarity = getRndInteger(0, 10000);
  let rarityLevel = 0;
  if (rarity >= 9999) {
    rarityLevel = 5;
  } else if (rarity >= 9900) {
    rarityLevel = 4;
  } else if (rarity >= 9500) {
    rarityLevel = 3;
  } else if (rarity >= 8500) {
    rarityLevel = 2;
  } else if (rarity >= 5000) {
    rarityLevel = 1;
  } else {
    rarityLevel = 0;
  }

  let filteredEncounters = lottery.filter((x: any) => x.rarity === rarityLevel);
  if (!lure) {
    filteredEncounters = filteredEncounters.filter((x: any) => x.lure === undefined);
  }
  if (filteredEncounters.length === 0) {
    lotteryFiltered = lottery.filter((x: any) => x.rarity === 0);
  } else {
    lotteryFiltered = filteredEncounters;
  }

  if (lotteryFiltered.length === 0) { return null; }

  const rand = getRndInteger(0, lotteryFiltered.length);
  let forme = undefined;
  if (lotteryFiltered[rand].forme !== null) {
    const chance = new Chance();
    forme = chance.pickset(lotteryFiltered[rand].forme, 1)[0];
  }
  return randomPokemon(lotteryFiltered[rand].id, 10, [], 1, lotteryFiltered[rand].special, 0, <string | null | undefined>forme);
}

export {
  getRandomPokemonForLottery,
};
