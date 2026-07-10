import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors'

const app = express()
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended: true, limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//import router

import usesrRouter from "./routes/user.routes.js"

//routes

app.use("/users",usesrRouter)

export { app }