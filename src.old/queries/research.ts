import { gql } from 'graphql-request';

export const CREATE_RESEARCH = gql`
  mutation createResearch($discord_id: String, $data: JSON) {
    createResearch(record: {discord_id: $discord_id, data: $data}) {
      recordId
    }
  }
`;

export const UPDATE_RESEARCH = gql`
  mutation updateResearch($discord_id: String, $data: JSON) {
    updateResearch(filter: {discord_id: $discord_id}, record: {data: $data}) {
      recordId
    }
  }
`;
