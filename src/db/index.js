import mongoose from "mongoose";
import { DB_NAME } from "../constants";

const connect_DB = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
    console.log(connectionInstance);
  } catch (error) {
    console.log("Error ", error);
    process.exit(1);
  }
}

export default connect_DB