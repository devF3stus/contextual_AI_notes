const mongoose = require("mongoose");

const StickyNoteSchema = new mongoose.Schema({
  page_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Page",
    required: true,
  },
  content: {
    type: String,
    required: true,
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

module.exports = mongoose.model("StickyNote", StickyNoteSchema);
