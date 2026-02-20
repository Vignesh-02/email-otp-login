require('dotenv').config();

const express = require('express')
const app = express()
const loginRoutes = require('./routes/login')
const connectDB = require('./db/connectDB')
app.use(express.json());


app.use('/', loginRoutes)


const port = process.env.PORT || 3030;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI)
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();