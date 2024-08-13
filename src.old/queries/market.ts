import { gql } from 'graphql-request';
import { POKEMON_DATA } from './pokemon';

export const GET_MARKET = gql`
  query getMarket($filter: FilterFindManyMarketInput, $sort: SortFindManyMarketInput) {
    marketAll(filter: $filter, sort: $sort) {
        _id
        discord_id
        price
        marketId
        pokemon	 {
            ...PokemonData
        }
    }
  }
  ${POKEMON_DATA}
`;

export const ADD_TO_MARKET = gql`
  mutation addToMarket($seller: String, $pokemon: PokemonInput, $price: Float) {
    createMarket(record: {discord_id: $seller, pokemon: $pokemon, price: $price}) {
      recordId
    }
  }
`;

export const DELETE_OFFER = gql`
    mutation deleteMarket($id: MongoID) {
        deleteMarket(filter: { _id: $id }) {
            recordId
        }
    }
`;

export const DELETE_OFFERS = gql`
    mutation deleteMarkets($ids: [MongoID]) {
        deleteMarkets(filter: { _operators: { _id: { in: $ids } } } ) {
            numAffected
        }
    }
`;