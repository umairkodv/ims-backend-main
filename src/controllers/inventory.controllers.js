import xlsx from "xlsx";
import { InventoryItem } from "../models/inventory.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { tryCatch } from "../utils/tryCatch.js";
import { notFound } from "../utils/notFound.js";
import { validateRequiredFields } from "../utils/validations.js";


export const getAllInventoryItems = tryCatch(async (req, res) => {
    //getting all the inventory items
    const Inventory = await InventoryItem.find({}).sort({ createdAt: -1 });

    if (!Inventory || Inventory.length === 0) {
        return res.status(404).json({ status: 404, success: false, message: "No Inventory Found" })
    }


    return res.status(200).json(
        new ApiResponse(200, "", Inventory)
    )
})

export const addInventoryItem = tryCatch(async (req, res) => {
    const { LotID, AddedBy, BoughtQuantity, ReceivedQuantity, items } = req.body;
    validateRequiredFields([LotID, AddedBy, BoughtQuantity, ReceivedQuantity, items], res);

    //Checking if Mobile item already added to inventory
    const existingIMEIs = await InventoryItem.find({ 'items.IMEI': { $in: items.map(item => item.IMEI) } });
    if (existingIMEIs.length > 0) {
        return res.status(409).json(new ApiResponse(200, "IMEI already exists in the database"));
    }

    //checking that the LOT ID SHOULD BE UNIQUE  
    const existingInventory = await InventoryItem.findOne({ LotID });
    if (existingInventory) {
        const existingIMEIs = existingInventory.items.map(item => item.IMEI);
        const newItems = items.filter(item => !existingIMEIs.includes(item.IMEI));

        existingInventory.items.push(...items);
        await existingInventory.save();

        const foundItems = await InventoryItem.find({
            'items.IMEI': { $in: newItems.map(item => item.IMEI) }
        }, { 'items.$': 1 });

        return res.status(200).json(new ApiResponse(200, `Items added to Lot ID: ${LotID}`, { inventoryItem: foundItems[0] }));
    }


    // Create a new inventory item
    const newInventoryItem = await InventoryItem.create({
        LotID,
        AddedBy,
        BoughtQuantity,
        ReceivedQuantity,
        items
    });
    //checking if the inventory is created or not
    notFound(newInventoryItem, res);


    return res.status(201).json(
        new ApiResponse(200, "Inventory item added successfully", { inventoryItem: newInventoryItem })
    )
})

export const getInventoryByIMEI = tryCatch(async (req, res) => {

    const { imei } = req.params;
    // Find the inventory item by IMEI
    const inventoryItem = await InventoryItem.findOne({ 'items.IMEI': imei });

    // If no inventory item found for the IMEI, return 404
    if (!inventoryItem) {
        return res.status(404).json({ message: 'No inventory item found for the given IMEI' });
    }

    // Find the specific item in the inventory by IMEI
    const selectedItem = inventoryItem.items.find((item) => item.IMEI == imei);

    if (!selectedItem) {
        return res.status(404).json({ message: 'No item found with the given IMEI' });
    }

    const { LotID } = inventoryItem;


    return res.status(200).json(
        new ApiResponse(200, "Inventory item found", { selectedItem, LotID })
    )
});

export const uploadInventoryItem = tryCatch(async (req, res) => {
    // checking that file shouldn't be empty
    if (!req.file || req.file.buffer === null) {
        return res.status(400).json(new ApiResponse(400, "No file uploaded"));
    }

    try {
        // Read the Excel file (supporting .xlsb)
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Parse the sheet data
        const data = xlsx.utils.sheet_to_json(sheet);

        // Extract Item data and group by LotID
        const itemsByLot = data.reduce((acc, row) => {
            const lotID = row['Lot Number'];
            if (!acc[lotID]) {
                acc[lotID] = {
                    LotID: lotID,
                    BoughtQuantity: 0,
                    ReceivedQuantity: 0,
                    AddedBy: "Admin",
                    items: []
                };
            }
            acc[lotID].items.push({
                IMEI: row['Piece Identifier'],
                Model: row.Model,
                Brand: row.Make,
                Color: row.Color,
                Network: "AT&T",
                Status: "Available",
            });
            return acc;
        }, {});

        // Process each lot
        for (const lotID in itemsByLot) {
            const lot = itemsByLot[lotID];
            const uniqueItems = [];

            for (const item of lot.items) {
                const existingItem = await InventoryItem.findOne({ 'items.IMEI': item.IMEI });
                if (!existingItem) {
                    uniqueItems.push(item);
                } else {
                    return res.status(404).json(new ApiResponse(404, "IMEI Duplicacy found in the database"));
                }
            }

            if (uniqueItems.length > 0) {
                lot.BoughtQuantity = uniqueItems.length;
                lot.ReceivedQuantity = uniqueItems.length;

                const existingInventory = await InventoryItem.findOne({ LotID: lot.LotID });
                if (existingInventory) {
                    // If Lot ID exists, add the items to the existing inventory
                    existingInventory.items.push(...uniqueItems);
                    existingInventory.BoughtQuantity += lot.BoughtQuantity;
                    existingInventory.ReceivedQuantity += lot.ReceivedQuantity;
                    await existingInventory.save();
                } else {
                    // If Lot ID does not exist, create a new inventory item
                    await InventoryItem.create({
                        LotID: lot.LotID,
                        AddedBy: lot.AddedBy,
                        BoughtQuantity: lot.BoughtQuantity,
                        ReceivedQuantity: lot.ReceivedQuantity,
                        items: uniqueItems
                    });
                }
            }
        }

        return res.status(201).json(new ApiResponse(201, `Upload File Successfully (${req.file?.originalname})`));

    } catch (err) {
        return res.status(500).json(new ApiResponse(500, "Error Uploading file to database", err));
    }
});

export const uploadInventoryItemCTDI = tryCatch(async (req, res) => {
    // checking that file shouldn't be empty
    if (!req.file || req.file.buffer === null) {
        return res.status(400).json(new ApiResponse(400, "No file uploaded"));
    }

    try {
        // Read the Excel file
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Parse the sheet data
        const data = xlsx.utils.sheet_to_json(sheet);

        // Extract Item data and group by LotID
        const itemsByLot = data.reduce((acc, row) => {
            const lotID = row.LOT_NBR;
            if (!acc[lotID]) {
                acc[lotID] = {
                    LotID: lotID,
                    BoughtQuantity: 0,
                    ReceivedQuantity: 0,
                    AddedBy: "Admin",
                    items: []
                };
            }
            acc[lotID].items.push({
                IMEI: row.RECV_SERIAL_NBR,
                Model: row.MODEL,
                Brand: row.MANUFACTURER_NAME,
                Color: row.COLOR,
                Network: "AT&T",
                Status: "Available",
            });
            return acc;
        }, {});

        // Process each lot
        for (const lotID in itemsByLot) {
            const lot = itemsByLot[lotID];
            const uniqueItems = [];

            for (const item of lot.items) {
                const existingItem = await InventoryItem.findOne({ 'items.IMEI': item.IMEI });
                if (!existingItem) {
                    uniqueItems.push(item);
                } else {
                    return res.status(404).json(new ApiResponse(404, "IMEI Duplicacy found in the database"));
                }
            }

            if (uniqueItems.length > 0) {
                lot.BoughtQuantity = uniqueItems.length;
                lot.ReceivedQuantity = uniqueItems.length;

                const existingInventory = await InventoryItem.findOne({ LotID: lot.LotID });
                if (existingInventory) {
                    // If Lot ID exists, add the items to the existing inventory
                    existingInventory.items.push(...uniqueItems);
                    existingInventory.BoughtQuantity += lot.BoughtQuantity;
                    existingInventory.ReceivedQuantity += lot.ReceivedQuantity;
                    await existingInventory.save();
                } else {
                    // If Lot ID does not exist, create a new inventory item
                    await InventoryItem.create({
                        LotID: lot.LotID,
                        AddedBy: lot.AddedBy,
                        BoughtQuantity: lot.BoughtQuantity,
                        ReceivedQuantity: lot.ReceivedQuantity,
                        items: uniqueItems
                    });
                }
            }
        }

        return res.status(201).json(new ApiResponse(201, `Upload File Successfully (${req.file?.originalname})`));

    } catch (err) {
        return res.status(500).json(new ApiResponse(500, "Error Uploading file to database", err));
    }
});

export const updateInventory = tryCatch(async (req, res) => {
    const { id, LotID, AddedBy, BoughtQuantity, ReceivedQuantity, items } = req.body;
    // Find the inventory item by ID and update it
    const updatedItem = await InventoryItem.findOneAndUpdate(
        { _id: id },
        { LotID, AddedBy, BoughtQuantity, ReceivedQuantity, items },
        { new: true }
    );

    notFound(updatedItem, res)

    return res.status(201).json(
        new ApiResponse(200, "Inventory item updated successfully", updatedItem)
    )
})

export const updateInventoryItem = tryCatch(async (req, res) => {
    const { id, IMEI, Network, Color, Brand, Model, Status } = req.body;

    

    const updatedItem = await InventoryItem.findOneAndUpdate(
        { "items._id": id },
        {
            $set: {
                "items.$.Model": Model,
                "items.$.Brand": Brand,
                "items.$.Network": Network,
                "items.$.Color": Color,
                "items.$.Status": Status,
                "items.$.IMEI": IMEI
            }
        },
        { new: true }
    );

    if (!updatedItem) {
        return res.status(404).json({ message: "Inventory Item not found" });
    }

    return res.status(200).json({ message: "Inventory Item updated successfully" });
});

export const deleteInventory = tryCatch(async (req, res) => {
    const { id } = req.params;

    // Find the inventory item by ID and delete it
    const deletedItem = await InventoryItem.findOneAndDelete({ _id: id });

    //checking if the inventory is created or not
    notFound(deletedItem, res);

    return res.status(201).json(
        new ApiResponse(200, "Inventory deleted successfully")
    )
});

export const deleteInventoryItems = tryCatch(async (req, res) => {
    const { id } = req.params;

    // Find the inventory item by ID and delete the specific item from the items array
    const updatedItem = await InventoryItem.findOneAndUpdate(
        { "items._id": id },
        { $pull: { items: { _id: id } } },
        { new: true }
    );

    // Checking if the item exists
    notFound(updatedItem, res);

    return res.status(200).json(
        new ApiResponse(200, "Inventory Item deleted successfully")
    );
});