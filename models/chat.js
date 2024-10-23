const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the User model
  chat_id: { type: String, required: true }, // Unique identifier for the chat
  messages: [
    {
      message: { type: String, required: true }, // Message content
      from: { type: String, enum: ["user", "bot"], required: true }, // "user" or "bot"
      timestamp: { type: Date, default: Date.now }, // Default to current date
    }
  ],
  created_at: { type: Date, default: Date.now }, // Timestamp for when the chat started
}, { timestamps: true }); // Add timestamps for tracking creation and update time

module.exports = mongoose.model("Chat", conversationSchema);