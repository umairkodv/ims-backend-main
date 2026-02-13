import mongoose, { Schema } from "mongoose";

const UnlockcodeSchema = new Schema({
    imei: {
        type: String,
        minlength: 15,
        maxlength: 15,
        required: true
    },
    code: {
        type: String,
    },
}, { timestamps: true });

export const Unlockcode = mongoose.model('Unlockcode', UnlockcodeSchema);
