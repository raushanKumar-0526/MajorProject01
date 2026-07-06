import express from 'express'
import dotenv from "dotenv";

dotenv.config({
  path: './env'
});

const app = express()

//immediately invoked function expression (IIFE)
//syntax : ;()()
// ; meams start of a new statement and ()() mean IIFE
;(async() => {
  try {
    console.log(process.env.MONGODB_URL);
    await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
    app.on("error", (error) => {
      console.error("Error : ",error)
      throw error
    })

    app.listen(process.env.PORT, () => {
      console.log(`App is listening on port ${process.env.PORT}`)
    })
  } catch (error) {
    console.error("Error : ",error)
    throw error
  }
})()