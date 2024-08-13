import { model, Schema } from "mongoose";

const logSchema = new Schema({
    type: String,
    data: Object
});

export const Log = model('Log', logSchema);