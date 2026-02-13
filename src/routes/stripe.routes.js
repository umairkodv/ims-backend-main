import { Router } from "express";
import { handleSuccessfulPayment, paymentIntent } from "../controllers/stripe.controllers.js";


const stripeRouter = Router();

stripeRouter.route("/create-checkout-session").post(paymentIntent);
stripeRouter.route("/success").post(handleSuccessfulPayment);

export default stripeRouter;