const mongoose = require("mongoose");

const antiNukeSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },

  enabled: {
    type: Boolean,
    default: false,
  },

  punishment: {
    type: String,
    enum: ["ban", "kick", "strip"],
    default: "strip",
  },
});

module.exports = mongoose.model("AntiNuke", antiNukeSchema);
