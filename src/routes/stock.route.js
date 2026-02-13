import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addStock, getAllStock, deleteStock, filterStock, deleteAllStock } from "../controllers/stock.controllers.js";

const stockRouter = Router();

// Routes with Authentication
stockRouter.route("/get-all-stock").get(verifyJWT, getAllStock);
stockRouter.route("/add-stock").post(verifyJWT, addStock);
stockRouter.route("/delete-all").delete(verifyJWT, deleteAllStock);
stockRouter.route("/filter").get(verifyJWT, filterStock);
stockRouter.route("/:id").delete(verifyJWT, deleteStock);

export default stockRouter;
