import cloudinary from "../../cloudinaryConfig.js";
import stream from "stream";
import { Product } from "../models/product.model.js";
import { OrderHistory } from "../models/orderhistory.model.js";

// Get all products
export const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getAllOrders = async (req, res) => {
    try {
        const orders = await OrderHistory.find();
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single product by ID
export const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPhonesBySeries = async (req, res) => {
    const { series } = req.params;
    try {
        const phones = await Product.find({ series });
        if (phones.length === 0) {
            return res.status(404).json({ message: `No phones found for series: ${series}` });
        }
        res.status(200).json(phones);
    } catch (error) {
        console.error("Error fetching phones by series:", error);
        res.status(500).json({ message: error.message });
    }
};

export const addReview = async (req, res) => {
    try {
        const { user, rating, comment } = req.body;
        // Validate input
        if (!user || !rating || !comment || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Invalid review input' });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Create the review object
        const review = { user, rating, comment };

        // Add the review to the product's reviews array
        product.reviews.push(review);

        // Save the product with the new review
        await product.save();

        res.status(201).json({ message: 'Review added successfully', review });
    } catch (error) {
        res.status(500).json({ message: 'Error adding review', error });
    }
}

// Create a new product
export const createProduct = async (req, res) => {
    const { name, description, SKU, feature, brand, model, series } = req.body;
    try {
        const existingProduct = await Product.findOne({ brand, model, series });
        if (existingProduct) {
            return res.status(400).json({
                message: 'Product with this brand, model, and series already exists.'
            });
        }
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map((file) => {
                return new Promise((resolve, reject) => {
                    const bufferStream = new stream.PassThrough();
                    bufferStream.end(file.buffer);
                    bufferStream.pipe(cloudinary.uploader.upload_stream({
                        folder: "products",
                    }, (error, result) => {
                        if (error) {
                            console.error("Cloudinary upload error:", error);
                            return reject(error);
                        }
                        resolve(result.secure_url);
                    }));
                });
            });
            // Wait for all uploads to complete
            imageUrls = await Promise.all(uploadPromises);
        }
        const newProduct = new Product({
            name,
            description,
            SKU,
            feature,
            brand,
            model,
            series,
            imageUrl: imageUrls,
        });
        await newProduct.save();
        return res.status(201).json({
            message: 'Product created successfully',
            product: newProduct
        });
    } catch (error) {
        console.error("Error creating product:", error);
        res.status(400).json({ message: error.message });
    }
};

export const createVariants = async (req, res) => {
    try {
        const { Brand, Model, Series, Network, Storage, Color, Price, Quantity, Category } = req.body;
        console.log(Brand, Model, Series)
        const product = await Product.findOne({ brand: Brand, model: Model, series: Series });
        console.log(product);
        if (!product) {
            return res.status(404).json({
                message: 'Product not found with the given brand, model, and series.'
            });
        }

        const newVariant = {
            carrier: Network,
            storage: Storage,
            color: Color,
            category: Category,
            price: Price,
            quantity: Quantity
        };

        product.variants.push(newVariant);
        await product.save();

        return res.status(200).json({
            message: 'Variant added successfully',
            product
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error adding variant',
            error: error.message
        });
    }
}

export const getVariantsByProduct = async (req, res) => {
    const { brand, model, series } = req.params;

    try {
        // Find the product using brand, model, and series
        const product = await Product.findOne({ brand, model, series });

        if (!product) {
            return res.status(404).json({
                message: 'Product not found with the given brand, model, and series.'
            });
        }

        // Return the variants of the found product
        return res.status(200).json({
            message: 'Variants retrieved successfully',
            variants: product.variants
        });
    } catch (error) {
        console.error("Error retrieving variants:", error);
        return res.status(500).json({
            message: 'Error retrieving variants',
            error: error.message
        });
    }
};

export const deleteVariant = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await Product.updateOne(
            { "variants._id": id },
            { $pull: { variants: { _id: id } } }
        );

        // Check if a variant was actually deleted
        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'Variant not found' });
        }

        res.status(200).json({ message: 'Variant deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const featureToggle = async (req, res) => {
    const { id } = req.params;

    try {
        // Find the product by ID
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Toggle the feature status
        product.feature = !product.feature;
        const updatedProduct = await product.save();

        res.status(200).json(updatedProduct);
    } catch (error) {
        console.error("Error toggling feature:", error);
        res.status(400).json({ message: error.message });
    }
}
// Update product by ID
export const updateProduct = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const updatedProduct = await Product.findByIdAndUpdate(id, updates, { new: true });
        if (!updatedProduct) return res.status(404).json({ message: 'Product not found' });
        res.status(200).json(updatedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete product by ID
export const deleteProduct = async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) return res.status(404).json({ message: 'Product not found' });
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const toggleProductActiveStatus = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        product.active = !product.active; // Assuming there's an 'active' field
        await product.save();
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};