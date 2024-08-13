import { gql } from 'graphql-request';

export const GENERATE_BINGO = gql`
  mutation generateBingo($discord_id: String) {
    generateBingo(discord_id: $discord_id) {
        bingo
    }
  }
`;

export const GET_BINGO = gql`
  query bingo($discord_id: String) {
    bingo(filter: {discord_id: $discord_id}) {
      card
    }
  }
`;

export const UPDATE_BINGO = gql`
  mutation updateBingo($discord_id: String, $data: JSON) {
    updateBingo(filter: {discord_id: $discord_id}, record: {card: $data}) {
      recordId
    }
  }
`;