import { gql } from 'graphql-request';

export const GET_GUILD = gql`
  query getGuild($guild_id: String) {
    guild(filter: {guild_id: $guild_id}) {
        guild_id
        prefix
        lock
        lockCommands
    }
  }
`;

export const CREATE_GUILD = gql`
  mutation createGuild($guild_id: String) {
    createGuild(record: { guild_id: $guild_id }) {
        recordId
        record {
          guild_id
          prefix
          lock
          lockCommands
        }
    }
  }
`;

export const UPDATE_GUILD = gql`
    mutation updateGuild($guild_id: String, $data: UpdateOneGuildInput!) {
        updateGuild(record: $data, filter: {guild_id: $guild_id}) {
            recordId
        }
    }
`;
