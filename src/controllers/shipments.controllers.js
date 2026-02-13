import { v4 as uuidv4 } from 'uuid';
import xlsx from 'xlsx';
import { ApiResponse } from "../utils/ApiResponse.js";
import { tryCatch } from "../utils/tryCatch.js";
import { DispatchedShipment, ReturnItems, Shipment, ShippedItems, TesterShipment } from "../models/shipment.model.js";
import { notFound } from "../utils/notFound.js";
import { InventoryItem } from "../models/inventory.model.js";
import { validateRequiredFields } from "../utils/validations.js";
import mongoose from "mongoose";



// ORDER PULLER ROLE !
export const getAllShipments = tryCatch(async (req, res) => {
    const ShipmentData = await Shipment.find();

    if (!ShipmentData) {
        return res.status(404).json({ status: 404, success: false, message: "No Shipment data found" })
    }

    return res.status(200).json(
        new ApiResponse(200, "", ShipmentData)
    )
});

export const deleteShipmentById = tryCatch(async (req, res) => {
    const { id } = req.params;

    // Validate required fields (if necessary)
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json(new ApiResponse(400, "Valid shipment ID is required"));
    }

    const deletedShipment = await Shipment.findByIdAndDelete(id);

    if (!deletedShipment) {
        return res.status(404).json(new ApiResponse(404, `Shipment  not found`));
    }

    // Optionally, you may want to delete related data or perform other actions here if needed

    return res.status(200).json(new ApiResponse(200, `Shipment deleted successfully`));
});

export const assignIMEI = tryCatch(async (req, res) => {
    const { IMEI, PulledTime, trackingNumber } = req.body

    const InventoryIMEI = await InventoryItem.findOne({ 'items.IMEI': IMEI });

    if (!InventoryIMEI) {
        return res.status(404).json({ status: 404, success: false, message: "Provided IMEI doesn't exist in inventory!" })
    }

    const item = InventoryIMEI.items.filter(item => item.IMEI == IMEI);

    if (item[0].Status !== "Available" && item[0].Status !== "Problem") {
        return res.status(404).json({ status: 404, success: false, message: `IMEI not available in the inventory , current status is ${item[0].Status}` })
    }
    // Update the status to 'In progress'
    const updatedItem = await InventoryItem.findOneAndUpdate(
        { 'items.IMEI': IMEI },
        { $set: { 'items.$.Status': 'In progress' } },
        { new: true } // Return the updated document
    );

    if (!updatedItem) {
        return res.status(404).json({ status: 404, success: false, message: "No IMEI found in inventory database" })
    }

    const ShipmentData = await Shipment.findOne({ trackingNumber });

    if (!ShipmentData) {
        return res.status(404).json({ status: 404, success: false, message: "No Shipment data found" })
    }
    if (ShipmentData.remainingItems === 0) {
        return res.status(404).json({ status: 404, success: false, message: "Cannot Assign More IMEI, Quantity if full!" })
    }

    ShipmentData.IMEI.push(IMEI);
    ShipmentData.remainingItems = ShipmentData.remainingItems - 1;
    ShipmentData.PulledTime = PulledTime;

    await ShipmentData.save();

    let testerShipmentData = await TesterShipment.findOne({ trackingNumber });

    if (testerShipmentData) {
        // Document already exists, so just push the new IMEI into the existing document

        testerShipmentData.IMEI.push(IMEI);
        testerShipmentData.remainingItems = testerShipmentData.IMEI.length;
        testerShipmentData.PulledTime = PulledTime;

        await testerShipmentData.save();
    } else {
        // Document does not exist, so create a new testerShipment document
        testerShipmentData = await TesterShipment.create({
            orderID: ShipmentData.orderID,
            orderNumber: ShipmentData.orderNumber,
            orderDate: ShipmentData.orderDate,
            trackingNumber: ShipmentData.trackingNumber,
            SKU: ShipmentData.SKU,
            quantity: ShipmentData.quantity,
            remainingItems: 1,
            PulledTime,
            serialNumbers: ShipmentData.serialNumbers,
            IMEI: [IMEI],
        });
    }

    return res.status(200).json(
        new ApiResponse(200, `Assigned Successfully To TrackingNum : ${trackingNumber}`, ShipmentData)
    )
});

export const returnItemIMEI = tryCatch(async (req, res) => {
    try {
        const { currentIMEI, newIMEI, trackingNumber } = req.body

        const currentIMEIInventory = await InventoryItem.findOne({ 'items.IMEI': currentIMEI });

        if (!currentIMEIInventory) {
            return res.status(404).json({ status: 404, success: false, message: "Current IMEI doesn't exist in inventory!" })
        }

        const newIMEIInventory = await InventoryItem.findOne({ 'items.IMEI': newIMEI });

        if (!newIMEIInventory) {
            return res.status(404).json({ status: 404, success: false, message: "New IMEI doesn't exist in inventory!" })
        }
        const ShipmentData = await Shipment.findOne({ trackingNumber });

        if (!ShipmentData) {
            return res.status(404).json({ status: 404, success: false, message: "No Shipment data found" })
        }

        const currentIMEIItem = currentIMEIInventory.items.filter(item => item.IMEI == currentIMEI);

        if (currentIMEIItem[0].Status !== "In progress") {
            return res.status(404).json({ status: 404, success: false, message: `Current IMEI is not in progress, current status is ${currentIMEIItem[0].Status}` })
        }

        // Update the status of current IMEI to 'Problem'
        await InventoryItem.findOneAndUpdate(
            { 'items.IMEI': currentIMEI },
            { $set: { 'items.$.Status': 'Problem' } }
        );


        // Update the status of new IMEI to 'In progress'
        const updatedItem = await InventoryItem.findOneAndUpdate(
            { 'items.IMEI': newIMEI },
            { $set: { 'items.$.Status': 'In progress' } },
            { new: true } // Return the updated document
        );

        if (!updatedItem) {
            return res.status(404).json({ status: 404, success: false, message: "New IMEI not updated to in progress in inventory" })
        }

        //updating the IMEI Item Array
        const currentIndex = ShipmentData.IMEI.findIndex(imei => imei == currentIMEI);
        ShipmentData.IMEI[currentIndex] = newIMEI;
        await ShipmentData.save();

        let testerShipmentData = await TesterShipment.findOne({ trackingNumber });

        // Document already exists, so just push the new IMEI array / NEW items, into the dispatch ITEMS
        testerShipmentData.IMEI = ShipmentData.IMEI;
        testerShipmentData.remainingItems = testerShipmentData.IMEI.length;
        await testerShipmentData.save();

        return res.status(200).json(
            new ApiResponse(200, `Item Changed Successfully`, { ShipmentData, currentIndex })
        )
    } catch (err) {
        console.log(err)
    }
});


export const uploadShipment = tryCatch(async (req, res) => {
    if (!req.file || req.file.buffer === null) {
        return res.status(400).json(new ApiResponse(400, "No file uploaded"));
    }

    try {
        // Read the Excel file from memory buffer
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[1];
        const sheet = workbook.Sheets[sheetName];

        // Parse the sheet data
        const data = xlsx.utils.sheet_to_json(sheet, { raw: false });

        // Extracting Shipment data
        const serialNumbersMap = new Map(); // Map to track serial numbers for each source
        const items = data.map((row, index) => {
            let sourceCode = '';
            switch (row.StoreName) {
                case 'New Amazon Store':
                    if (row.ShippingPaid > 15.00) {
                        sourceCode = 'AS';
                    } else if (row.ShippingPaid > 4.00 && row.ShippingPaid <= 15.00) {
                        sourceCode = 'AE';
                    } else {
                        sourceCode = 'A';
                    }
                    break;
                case 'New back-market Store':
                    sourceCode = 'B';
                    break;
                case 'New Walmart Store':
                    sourceCode = 'W';
                    break;
                case 'New eBay Store':
                    sourceCode = 'EB';
                    break;
                default:
                    sourceCode = '';
                    break;
            }

            // Initialize serial number for the source if not already set
            if (!serialNumbersMap.has(row.StoreName)) {
                serialNumbersMap.set(row.StoreName, 1);
            }

            // Generate serial numbers based on quantity
            const serialNumber = serialNumbersMap.get(row.StoreName);
            const serialNumbers = row['Quantity'] > 1 ? Array.from({ length: row['Quantity'] }, (_, i) => `${sourceCode}${serialNumber}-${i + 1}`) : [`${sourceCode}${serialNumber}`];
            serialNumbersMap.set(row.StoreName, serialNumber + 1); // Increment serial number for next item
            return {
                orderID: row.OrderItemID,
                SKU: row.SKU,
                trackingNumber: row.TrackingNumber,
                orderDate: new Date(row.OrderDate),
                quantity: row.Quantity,
                source: row.StoreName,
                serialNumbers: serialNumbers // Use the array directly
            };
        });

        // Check if Shipment model is not found
        notFound(Shipment, res);

        // Save new items to the database
        await Shipment.insertMany(items);

        return res.status(201).json(new ApiResponse(201, `Upload File Successfully (${req.file?.originalname})`));
    } catch (err) {

        return res.status(500).json(new ApiResponse(500, "Error Uploading file"));
    }
});

// EXTRA CONTROLLER FOR FETCHING
export const getAllShipmentsCOMMENT = tryCatch(async (req, res) => {
    const shipStationShipmentsEndpoint = 'https://ssapi.shipstation.com/shipments?sortBy=shipDate&sortOrder=desc&pageSize=500';
    const shipStationOrdersEndpoint = 'https://ssapi.shipstation.com/orders?orderStatus=shipped&orderDate=2023-02-27&pageSize=500';

    // Fetch shipments
    // const shipmentsResponse = await axios.get(shipStationShipmentsEndpoint, {
    //     auth: {
    //         username: process.env.SHIPSTATION_API_KEY,
    //         password: process.env.SHIPSTATION_API_SECRET,
    //     },
    // });
    // // Fetch orders
    // const ordersResponse = await axios.get(shipStationOrdersEndpoint, {
    //     auth: {
    //         username: process.env.SHIPSTATION_API_KEY,
    //         password: process.env.SHIPSTATION_API_SECRET,
    //     },
    // });

    // const shipments = shipmentsResponse.data.shipments;
    // const orders = ordersResponse.data.orders;

    // // Merge shipments and orders based on order ID
    // const mergedData = shipments.map(shipment => {
    //     const order = orders.find(order => order.orderKey === shipment.orderKey);
    //     return {
    //         shipmentId: shipment.shipmentId,
    //         orderId: shipment.orderId,
    //         orderKey: shipment.orderKey,
    //         userId: shipment.userId,
    //         customerEmail: shipment.customerEmail,
    //         orderNumber: shipment.orderNumber,
    //         createDate: shipment.createDate,
    //         shipDate: shipment.shipDate,
    //         sku: order?.items[0]?.sku,
    //         source: order?.advancedOptions?.source,
    //     };
    // });

    notFound(mergedData, res);

    return res.status(201).json(
        new ApiResponse(201, "Shipments and orders merged successfully!", mergedData)
    );
});

// TESTER ROLE!

export const getAllTesterShipments = tryCatch(async (req, res) => {
    const tester = await TesterShipment.find().sort({ createdAt: -1 });

    if (!tester) {
        return res.status(404).json({ status: 404, success: false, message: "No Shipment data found" })
    }

    return res.status(200).json(
        new ApiResponse(200, "", tester)
    )
});

export const releaseIMEI = tryCatch(async (req, res) => {
    const { IMEI } = req.params;
    let { time } = req.body;

    validateRequiredFields([time, IMEI], res)

    const ShipmentData = await TesterShipment.findOne({ IMEI });
    if (!ShipmentData) {
        return res.status(404).json({ status: 404, success: false, message: "No IMEI number found in database" })
    }

    if (ShipmentData.remainingItems > 1) {
        await TesterShipment.updateOne(
            { IMEI: { $in: IMEI } },
            {
                $pull: { IMEI: { $in: [IMEI] } },
                $inc: { remainingItems: -IMEI.length }
            }
        );
    } else {
        // Delete the whole document
        await TesterShipment.deleteOne({ IMEI });
        await Shipment.deleteOne({ IMEI });
    }

    const existingData = await DispatchedShipment.findOne({ trackingNumber: ShipmentData.trackingNumber });

    if (existingData) {
        // Document already exists, push the new IMEI values
        existingData.IMEI.push(IMEI);
        await existingData.save();
    } else {
        // Document does not exist, create a new one
        const data = await DispatchedShipment.create({
            orderID: ShipmentData.orderID,
            orderNumber: ShipmentData.orderNumber,
            serialNumbers: ShipmentData.serialNumbers,
            PulledTime: ShipmentData.PulledTime,
            testedAt: time,
            orderDate: ShipmentData.orderDate,
            trackingNumber: ShipmentData.trackingNumber,
            SKU: ShipmentData.SKU,
            quantity: ShipmentData.quantity,
            IMEI: IMEI,
            Remarks: null,
            DispatchedStatus: true
        });
    }

    // // Update the status to 'Sold out' for the dispatched items
    // await InventoryItem.updateMany(
    //     { 'items.IMEI': { $in: IMEI } },
    //     { $set: { 'items.$.Status': 'Sold out' } }
    // );

    return res.status(200).json(
        new ApiResponse(200, "Phone Released Successfully!",)
    )
});



// DISPATCHER ROLE !
export const getAllDispatchedShipments = tryCatch(async (req, res) => {
    const shipments = await DispatchedShipment.find().sort({ createdAt: -1 });

    if (!shipments) {
        return res.status(404).json({ status: 404, success: false, message: "No Shipment data found" })
    }

    return res.status(200).json(
        new ApiResponse(200, "", shipments)
    )
});

export const dispatchTrackingNumber = tryCatch(async (req, res) => {
    const { trackingNumber } = req.params;

    validateRequiredFields([trackingNumber], res)

    const ShipmentData = await DispatchedShipment.findOne({ trackingNumber });

    if (!ShipmentData) {
        return res.status(404).json({ status: 404, success: false, message: "No tracking number found in database" })
    }
    return res.status(200).json(
        new ApiResponse(200, "Tracking Number Found Successfully!", ShipmentData.IMEI)
    )
});

export const dispatchShipment = tryCatch(async (req, res) => {
    const { trackingNumber } = req.params;
    let { IMEI } = req.body;

    validateRequiredFields([trackingNumber], res)

    const ShipmentData = await DispatchedShipment.findOne({ trackingNumber });

    if (!ShipmentData) {
        return res.status(404).json({ status: 404, success: false, message: "No tracking number found in database" })
    }
    if (!Array.isArray(IMEI)) {
        IMEI = [IMEI]; // Convert to array if it's not already
    }

    const matchingIMEI = IMEI.filter(imei => ShipmentData.IMEI.includes(imei));
    if (matchingIMEI.length === 0) {
        return res.status(400).json({ status: 400, success: false, message: "No IMEI found in this tracking Num" });
    }
    if (ShipmentData.remainingItems > 1) {
        await DispatchedShipment.updateOne(
            { trackingNumber },
            { $pull: { IMEI: { $in: IMEI } }, $inc: { remainingItems: -IMEI.length } }
        );
    } else {
        // Delete the whole document
        await DispatchedShipment.deleteOne({ trackingNumber });
        await Shipment.deleteOne({ trackingNumber });
    }

    const existingData = await ShippedItems.findOne({ trackingNumber });

    if (existingData) {
        // Document already exists, push the new IMEI values
        existingData.IMEI.push(...IMEI);
        await existingData.save();
    } else {
        // Document does not exist, create a new one
        const data = await ShippedItems.create({
            orderID: ShipmentData.orderID,
            orderNumber: ShipmentData.orderNumber,
            orderDate: ShipmentData.orderDate,
            trackingNumber: ShipmentData.trackingNumber,
            SKU: ShipmentData.SKU,
            quantity: ShipmentData.quantity,
            IMEI: IMEI,
            Remarks: null,
            DispatchedStatus: true
        });
    }

    // Update the status to 'Sold out' for the dispatched items
    await InventoryItem.updateMany(
        { 'items.IMEI': { $in: IMEI } },
        { $set: { 'items.$.Status': 'Sold out' } }
    );

    return res.status(200).json(
        new ApiResponse(200, "IMEI Dispatched Successfully!", ShipmentData.remainingItems - IMEI.length)
    )
});




// SHIPPED ITEM ROLE !
export const getAllShippedItems = tryCatch(async (req, res) => {
    const shippedData = await ShippedItems.find();

    if (!shippedData) {
        return res.status(404).json({ status: 404, success: false, message: "No Shipped data found" })
    }

    return res.status(200).json(
        new ApiResponse(200, "", shippedData)
    )
});

export const addRemarks = tryCatch(async (req, res) => {
    const { returnIMEI, comment, status } = req.body;
    validateRequiredFields([comment, returnIMEI, status], res);

    const shippedItem = await ShippedItems.findOne({ IMEI: { $in: [returnIMEI] } });

    if (!shippedItem) {
        return res.status(404).json({ status: 404, success: false, message: "No IMEI found in inventory database" });
    }

    let returnItem = await ReturnItems.findOne({ IMEI: { $in: [returnIMEI] } }); // Find using returnIMEI

    if (!returnItem) {
        // Create a new document in ReturnItems if returnIMEI doesn't exist
        returnItem = await ReturnItems.create({
            orderID: shippedItem.orderID,
            orderNumber: shippedItem.orderNumber,
            orderDate: shippedItem.orderDate,
            SKU: shippedItem.SKU,
            quantity: shippedItem.quantity,
            Remarks: [comment], // Changed to array since Remarks is being pushed later
            DispatchedStatus: false,
            IMEI: [returnIMEI], // Changed to array since IMEI is being pushed later
        });
    } else {
        // Push the returnIMEI to the IMEI array
        returnItem.IMEI.push(returnIMEI);
        returnItem.Remarks.push(comment);
        await returnItem.save();
    }

    if (shippedItem.IMEI.length > 1) {
        await ShippedItems.findOneAndUpdate(
            { IMEI: { $in: [returnIMEI] } }, // Find using returnIMEI
            { $pull: { IMEI: returnIMEI } }
        );
    } else {
        // If there is only one IMEI left, delete the whole document
        await ShippedItems.deleteOne({ IMEI: { $in: [returnIMEI] } }); // Find using returnIMEI
    }

    // Update the status according to the dispatcher choice
    const updatedItem = await InventoryItem.findOneAndUpdate(
        { 'items.IMEI': returnIMEI }, // Find using returnIMEI
        { $set: { 'items.$.Status': status } },
        { new: true } // Return the updated document
    );

    return res.status(200).json(
        new ApiResponse(200, "Remarks Added Successfully!", shippedItem)
    )
});

// RETURN ITEM ROLE !
export const getAllReturnItems = tryCatch(async (req, res) => {
    const returnData = await ReturnItems.find();

    if (!returnData) {
        return res.status(404).json({ status: 404, success: false, message: "No Return data found" })
    }

    return res.status(200).json(
        new ApiResponse(200, "", returnData)
    )
});