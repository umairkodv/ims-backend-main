import express from "express"
import cors from "cors"
import {
    loginUser,
    logoutUser,
    recoverPassword,
    registerUser,
    resetPassword,
    verifyOTP
} from "./controllers/user.controllers.js"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.static("public"))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//routes


//routes import
import userRouter from './routes/user.routes.js'
import inventoryRouter from "./routes/inventory.routes.js"
import shipmentRouter from "./routes/shipment.routes.js"
import attributesRouter from "./routes/attributes.routes.js"
import settingRouter from "./routes/settings.route.js"
import unlockCodeRouter from "./routes/unlockCode.routes.js"
import { ApiResponse } from "./utils/ApiResponse.js"
import stockRouter from "./routes/stock.route.js"
import productRouter from "./routes/product.routes.js"
import stripeRouter from "./routes/stripe.routes.js"
import authRouter from "./routes/auth.routes.js";
import { OrderHistory } from "./models/orderhistory.model.js"
import Stripe from "stripe"

app.get("/", (req, res) => {
    res.send("IMS Gallery!");
});

app.route("/api/v1/register").post(registerUser);
app.route("/api/v1/login").post(loginUser);
app.route("/api/v1/logout").post(logoutUser);
// resetPass (user will enter email) -> verifyOTP (user will enter correct OTP) -> newPass (user will enter newPass and confirmPass)
app.route("/api/v1/reset-password").post(resetPassword);
app.route("/api/v1/verify-otp").post(verifyOTP);
// after verifying OTP user will be accessable to enter his new password
app.route("/api/v1/recover-password").post(recoverPassword);

const stripeInstance = Stripe(process.env.STRIPE_SECRET_KEY);

app.route("/api/v1/order/create").post(async (req, res) => {
    try {
        const { sessionId } = req.body;

        // Fetch session details from Stripe
        const session = await stripeInstance.checkout.sessions.retrieve(sessionId);
        console.log(session)
        // Verify the payment was successful
        if (session.payment_status === 'paid') {
            const products = session?.display_items?.map(item => ({
                productId: item.custom.name,
                category: item.custom.description,
                color: item.custom.images[0],
                price: item.amount_total / 100,
                qty: item.quantity
            }));

            const order = new OrderHistory({
                userId: "67166f54baee15b47a7cf3c4",
                products,
                shippingAddress: "ABC Address",
                totalAmount: session.amount_total / 100,
                paymentIntentId: session.payment_intent,
                status: 'completed',
                paymentMethod: 'credit_card',
                orderDate: Date.now(),
            });

            await order.save();

            res.status(200).json({ success: true, order });
        } else {
            res.status(400).json({ success: false, message: "Payment not completed" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});



//routes declaration
// http://localhost:8000/api/v1/users
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter)
app.use("/api/v1/stripe", stripeRouter)
app.use("/api/v1/product", productRouter)
app.use("/api/v1/settings", settingRouter)
app.use("/api/v1/inventory", inventoryRouter)
app.use("/api/v1/shipments", shipmentRouter)
app.use("/api/v1/unlockcode", unlockCodeRouter)
app.use("/api/v1/attributes", attributesRouter)
app.use("/api/v1/stock", stockRouter)




// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json(new ApiResponse(500, "Something Broke !", err));
});

export { app };