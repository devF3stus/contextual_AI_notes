const mongoose = require("mongoose");

const PartitionSchema = new mongoose.Schema({
  name: { type: String, required: true }
});

module.exports = mongoose.model("Partition", PartitionSchema);
