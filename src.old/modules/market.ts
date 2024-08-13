import { ObjectId } from 'mongodb';
import moment from 'moment';
import {
  createPokemons, deleteMutilpleFromMarket, getMarket, giveMarketId,
} from './database';
import Client from './client';
import { rarity } from './pokedex';
import Logger from './logger';

let needToCheckMarketVar = true;

function needToCheckMarket() {
  needToCheckMarketVar = true;
}

function objectIdWithTimestamp(timestamp: any) {
  /* Convert string date to Date object (otherwise assume timestamp is a date) */
  if (typeof (timestamp) === 'string') {
    timestamp = new Date(timestamp);
  }

  /* Convert date object to hex seconds since Unix epoch */
  const hexSeconds = Math.floor(timestamp / 1000).toString(16);

  /* Create an ObjectId with that hex timestamp */
  const constructedObjectId = new ObjectId(`${hexSeconds}0000000000000000`);

  return constructedObjectId;
}

async function checkMarket() {
  giveMarketId();
}

async function cleanMarket(client: Client) {
  const date = moment().subtract(1, 'w').toDate();
  const market = await getMarket({
    _operators: { _id: { lt: objectIdWithTimestamp(date.getTime()) } },
  });
  const bulkCreate: any[] = [];
  const idsToDelete: any[] = [];
  for (let i = 0; i < market.length; i++) {
    if (market[i].pokemon !== null) {
      delete market[i].pokemon._id;
      bulkCreate.push(market[i].pokemon);
    }
    idsToDelete.push(market[i]._id);
  }
  if (bulkCreate.length > 0) {
    createPokemons(bulkCreate);
  }
  if (idsToDelete.length > 0) {
    deleteMutilpleFromMarket(idsToDelete);
  }
  for (let i = 0; i < bulkCreate.length; i++) {
    /* TODO const user = await client.discordClient.getRESTUser(bulkCreate[i].owner);

    if (user !== undefined) {
      user.getDMChannel().then((channel) => {
        const embed = new MessageEmbed();
        embed.setDescription(`Your offer for Lvl. ${bulkCreate[i].level} ${rarity[bulkCreate[i].rarity]} ${bulkCreate[i].name} has been removed from the market because nobody bought it.`)
          .setTitle('Offer removed from market')
          .setFooter('Offers are removed after 1 week');
        channel.createMessage(embed.getObject());
      }).catch((error) => {
        Logger.error(error);
      });
    } */
  }
}

export {
  cleanMarket, checkMarket, needToCheckMarket,
};
