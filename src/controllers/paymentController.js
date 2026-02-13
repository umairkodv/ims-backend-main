import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Handle stripe payment
export const processPayment = async (req, res) => {
    const { productId, token } = req.body;

    try {
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        const charge = await stripe.charges.create({
            amount: product.price * 100, // Price in cents
            currency: 'usd',
            description: `Purchased product: ${product.name}`,
            source: token.id,
        });

        res.status(200).json({ success: true, charge });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};