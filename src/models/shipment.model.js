import mongoose, { Schema } from "mongoose";

const ShipmentSchema = Schema({
    orderID: {
        type: Number,
    },
    serialNumbers: {
        type: [String]
    },
    source: {
        type: String,
    },
    orderDate: {
        type: Date,
    },
    trackingNumber: {
        type: String,
    },
    SKU: {
        type: String,
    },
    quantity: {
        type: Number,
    },
    PulledTime: {
        type: Date,
    },
    IMEI: {
        type: [Number],
        // minlength: 15,
        // maxlength: 15,
    },
    remainingItems: {
        type: Number,
        default: function () {
            return this.quantity;
        }
    }

}, {
    timestamps: true
});

export const Shipment = mongoose.model('Shipment', ShipmentSchema);

const TesterShipmentSchema = Schema({
    orderID: {
        type: Number,
    },
    orderNumber: {
        type: String,
    },
    serialNumbers: {
        type: [String]
    },
    orderDate: {
        type: Date,
    },
    trackingNumber: {
        type: String,
    },
    PulledTime: {
        type: Date,
    },
    SKU: {
        type: String,
    },
    quantity: {
        type: Number,
    },
    IMEI: {
        type: [Number],
        // minlength: 15,
        // maxlength: 15,
    },
    remainingItems: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

export const TesterShipment = mongoose.model('TesterShipment', TesterShipmentSchema);

const DispatchedShipmentSchema = Schema({
    orderID: {
        type: Number,
    },
    orderNumber: {
        type: String,
    },
    serialNumbers: {
        type: [String]
    },
    orderDate: {
        type: Date,
    },
    trackingNumber: {
        type: String,
    },
    PulledTime: {
        type: Date,
    },
    SKU: {
        type: String,
    },
    quantity: {
        type: Number,
    },
    testedAt: {
        type: Date
    },
    IMEI: {
        type: [Number],
        // minlength: 15,
        // maxlength: 15,
    },
    remainingItems: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

export const DispatchedShipment = mongoose.model('DispatchedShipment', DispatchedShipmentSchema);

const ShippedItemSchema = Schema({
    orderID: {
        type: Number,
    },
    orderNumber: {
        type: String,
    },
    orderDate: {
        type: Date,
    },
    trackingNumber: {
        type: String,
    },
    SKU: {
        type: String,
    },
    quantity: {
        type: Number,
    },
    IMEI: {
        type: [Number],
        // minlength: 15,
        // maxlength: 15,
    },
    Remarks: {
        type: String,
    },
    DispatchedStatus: {
        type: Boolean,
        required: true
    }
}, {
    timestamps: true
});

export const ShippedItems = mongoose.model('ShippedItems', ShippedItemSchema);

const ReturnItemSchema = Schema({
    orderID: {
        type: Number,
    },
    orderNumber: {
        type: String,
    },
    orderDate: {
        type: Date,
    },
    SKU: {
        type: String,
    },
    quantity: {
        type: Number,
    },
    IMEI: {
        type: [Number],
        // minlength: 15,
        // maxlength: 15,
    },
    Remarks: {
        type: [String],
    },
    DispatchedStatus: {
        type: Boolean,
        required: true
    }
}, {
    timestamps: true
});

export const ReturnItems = mongoose.model('ReturnItems', ReturnItemSchema);