import { Chance } from 'chance';
import lootbox from '../../data/lootbox';

export const lootboxesEmoji = ['<:lootbox1:751796757586771990>', '<:lootbox2:751796757637234728>', '<:lootbox3:751796757628977272>', '🎁'];
export const lootboxesNames = ['Common lootbox', 'Rare lootbox', 'Legendary lootbox', 'Birthday Present'];

export function getRandomLoot(type: number, quantity: number) {
    const itemsReturn: any = {};
    const items: any[] = [];
    const odds: any[] = [];
    lootbox[type].forEach((element) => {
        items.push(element.id);
        odds.push(element.odds);
    });

    const chance = new Chance();

    quantity = chance.integer({ min: 5, max: 10 }) * quantity;
    for (let i = 0; i < quantity; i++) {
        const res = chance.weighted(items, odds);
        if (itemsReturn[res] === undefined) {
            itemsReturn[res] = 0;
        }
        itemsReturn[res]++;
    }
    return itemsReturn;
}