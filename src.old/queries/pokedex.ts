import { gql } from 'graphql-request';

export const GET_POKEDEX = gql`
  query getPokedex($discord_id: String) {
    pokedex(filter: {discord_id: $discord_id}) {
        discord_id
        count
        shiny
        data
    }
  }
`;

export const UPDATE_POKEDEX = gql`
  mutation updatePokedex($discord_id: String, $data: UpdateOnePokedexInput!) {
    updatePokedex(record: $data, filter: { discord_id: $discord_id }) {
      recordId
    }
  }
`;

export const CREATE_POKEDEX = gql`
  mutation createPokedex($discord_id: String) {
    createPokedex(record: { discord_id: $discord_id }) {
      recordId
    }
  }
`;