import express from 'express'
import dotenv from "dotenv";
import connect_DB from './db/index.js';

dotenv.config({
  path: './.env'
});

const app = express()

connect_DB()
 