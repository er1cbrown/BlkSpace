import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import postsRouter from "./posts";
import relaysRouter from "./relays";
import networkRouter from "./network";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/posts", postsRouter);
router.use("/feed", postsRouter);
router.use("/relays", relaysRouter);
router.use("/network", networkRouter);

export default router;
