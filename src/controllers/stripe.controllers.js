import { tryCatch } from '../utils/tryCatch.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const paymentIntent = tryCatch(async (req, res) => {
  const { products } = req.body;
  console.log(products);
  if (!products || products.length === 0) {
    return res
      .status(400)
      .json({ message: 'Products are required to create a payment session' });
  }

  const line_items = products.map((product) => {
    if (
      !product.category ||
      !product.color ||
      !product.imageUrl ||
      !product.qty
    ) {
      console.error('Missing product information:', product); // Log missing product info
      throw new Error(
        'Each product must have title, category, color, imageUrl, and qty',
      );
    }

    return {
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Products:',
          description: `Category: ${product.category}, Color: ${product.color}`,
          images: [product.imageUrl],
        },
        unit_amount: Math.round(product.price * 100), // Ensure this is dynamically calculated based on the product's actual price
      },
      quantity: product.qty,
    };
  });
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items, // Use the dynamically created line_items
    mode: 'payment',
    success_url:
      'https://ecomm-gold-rho.vercel.app/success.html?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://ecomm-gold-rho.vercel.app/checkout.html',
  });
  res.json({ id: session.id });
});

export const handleSuccessfulPayment = async (req, res) => {
  const sessionId = req.query.session_id;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(session);
    const customerEmail = session.customer_email;
    const products = session.line_items.data.map((item) => ({
      id: item.price.product,
      name: item.description,
      qty: item.quantity,
      price: item.amount_total / 100,
    }));

    // Create an order in ShipStation
    const shipStationResponse = await fetch(
      'https://ssapi.shipstation.com/orders/createorder',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            'Basic ' +
            Buffer.from(
              'a4f0ff6c4c6a4a1a891a654a8a603b57:910087f8660f4e4da1713715b17db934',
            ).toString('base64'),
        },
        body: JSON.stringify({
          orderNumber: session.id, // Use Stripe session ID as order number
          orderDate: new Date().toISOString(),
          orderStatus: 'awaiting_shipment',
          customerEmail: customerEmail,
          billTo: {
            name: 'Customer Name', // You can extract this from session or user details
            // Fill in the rest of the billing details
          },
          shipTo: {
            name: 'Customer Name', // You can extract this from session or user details
            // Fill in the rest of the shipping details
          },
          items: products.map((product) => ({
            lineItemKey: product.id,
            name: product.name,
            quantity: product.qty,
            unitPrice: product.price,
          })),
          amountPaid: session.amount_total, // Total paid amount
          paymentMethod: 'Credit Card', // Adjust as necessary
          requestedShippingService: 'Priority Mail',
          carrierCode: 'fedex', // Adjust as necessary
          serviceCode: 'fedex_2day', // Adjust as necessary
        }),
      },
    );

    const shipStationResult = await shipStationResponse.json();

    // Send response back to frontend
    res.json({
      success: true,
      orderId: shipStationResult.orderId,
      message: 'Order created successfully!',
    });
  } catch (error) {
    console.error('Error handling payment success:', error);
    res
      .status(500)
      .json({
        success: false,
        message: 'Payment processing failed.',
        error: error.message,
      });
  }
};
