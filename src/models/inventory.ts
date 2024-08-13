import { model, Schema } from "mongoose";
import { IInventory } from "../types/game";

const inventorySchema = new Schema<IInventory>({
    discord_id: String,
    inventory: Object,
    lootbox: Object,
});

export const Inventory = model<IInventory>('Inventory', inventorySchema, 'inventory');
export type Inventory = IInventory & Document;