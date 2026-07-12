import "dotenv/config";
import connect_DB from './db/index.js';
import {app} from "./app.js"

connect_DB()
.then( () => {
  app.listen(process.env.PORT || 8000 , () => {
    console.log(`Server is running on port ${process.env.PORT}`)
  })
})
.catch( (error) => {
  console.log("MongoDB connection failed !!",error)
})
 