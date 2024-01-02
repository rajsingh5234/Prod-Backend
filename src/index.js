import dotenv from "dotenv";
import connectDB from "./config/connectDB.js";
import connectCloudinary from "./config/connectCloudinary.js";
import { app } from "./app.js";

// dotenv.config({ path: "./.env" })
dotenv.config()

const PORT = process.env.PORT || 8000;

connectCloudinary();

connectDB()
   .then(() => {
      app.listen(PORT, () => {
         console.log(`Server listning on port: ${PORT}`);
      })
   })
   .catch((error) => {
      console.log("MONGO_DB Connection Failed", error);
   });

