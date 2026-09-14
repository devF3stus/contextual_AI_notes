const mongoose = require("mongoose");

const NoteSchema = new mongoose.Schema({
  title: {
    type: String,
    default: null,
  },
  content: {
    type: String,
    default: "",
  },
  partition_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Partition",
    default: null,
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

module.exports = mongoose.model("Note", NoteSchema);
