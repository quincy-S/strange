const express = require("express");
const app = express();
const slipRouter = require("./routes/slip");
const cors = require("cors");

app.use(cors());
app.use(express.static("dist"));
app.use(express.json());
app.use("/api/slip", slipRouter);

module.exports = app;
