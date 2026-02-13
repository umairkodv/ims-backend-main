import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addReview, createProduct, createVariants, deleteProduct, deleteVariant, featureToggle, getAllOrders, getAllProducts, getPhonesBySeries, getProductById, getVariantsByProduct, updateProduct } from "../controllers/product.controllers.js";
import upload from "../../multerConfig.js";


const productRouter = Router();

productRouter.route("/").get(getAllProducts);
productRouter.route("/orders").get(getAllOrders);
productRouter.route("/series/:series").get(getPhonesBySeries);
productRouter.route("/single/:id").get(getProductById);
productRouter.route("/add-review/:id").get(addReview);
productRouter.route("/create").post(verifyJWT, upload.array('images', 10), createProduct);
productRouter.route("/add-varient").post(verifyJWT, createVariants);
productRouter.route("/variant-del/:id").delete(verifyJWT, deleteVariant);
productRouter.route("/:brand/:model/:series/variants").get(getVariantsByProduct);
productRouter.route("/feature-toggle/:id").patch(featureToggle);
productRouter.route("/toggle-active/:id").patch(verifyJWT, getProductById);
productRouter.route("/update/:id").put(verifyJWT, updateProduct);
productRouter.route("/delete/:id").delete(verifyJWT, deleteProduct);

export default productRouter;