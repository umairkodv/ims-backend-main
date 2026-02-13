import mongoose from 'mongoose';


const variantSchema = new mongoose.Schema({
    carrier: {
        type: String,
        required: true
    },
    storage: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
});

const productSchema = new mongoose.Schema({
    variants: [variantSchema],
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    SKU: {
        type: String,
        required: true,
    },
    feature: {
        type: Boolean,
        required: true,
    },
    brand: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    series: {
        type: String,
        required: true,
    },
    imageUrl: {
        type: [String],
        required: true,
    }
}, { timestamps: true });

export const Product = mongoose.model('Product', productSchema);
