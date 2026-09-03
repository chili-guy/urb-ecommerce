import adminRouter from "./admin";
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storeRouter from "./store";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminRouter);
router.use(storeRouter);

export default router;
