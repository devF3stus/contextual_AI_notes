const mongoose = require("mongoose");

const PageSchema = new mongoose.Schema({
  note_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Note",
    required: true,
  },
  page_number: {
    type: Number,
    required: true,
  },
  content: {
    type: String,
    default: "",
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model("Page", PageSchema);
