import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();

app.use(cookieParser())

app.use(cors({
   origin: process.env.CORS_ORIGIN,
   credentials: true
}))

app.use(express.json({ limit: "16kb" }))

app.use(express.urlencoded({ extended: true, limit: "16kb" }))

app.use(express.static("public"))

// routes import
import userRouter from "./modules/User/user.route.js";

// routes declaration
app.use("/api/v1/users", userRouter);


// error middleware
app.use(errorMiddleware)

export { app };