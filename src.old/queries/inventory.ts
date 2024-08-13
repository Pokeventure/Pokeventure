import { gql } from 'graphql-request';

export const GET_INVENTORY = gql`
  query getInventory($discord_id: String) {
    inventory(filter: {discord_id: $discord_id}) {
      discord_id
      inventory
      lootbox
    }
  }
`;

export const ADD_TO_INVENTORY = gql`
  mutation addToInventory($discord_id: String, $item: Int, $quantity: Int) {
    addItem(discord_id: $discord_id, item: $item, quantity: $quantity) {
      ok
    }
  }
`;

export const ADD_LOOTBOX = gql`
  mutation addLootbox($discord_id: String, $item: Int, $quantity: Int) {
    addLootbox(discord_id:$discord_id, item: $item, quantity: $quantity) {
      ok
    }  
  }
`;