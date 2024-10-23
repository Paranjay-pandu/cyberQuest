const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firebaseUid: { 
    type: String, 
    required: true,
    unique: true
  },
  username: { 
    type: String, 
    required: true,
    trim: true,
    unique: true
  },
  email: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  tags: [{ type: String, trim: true }],
  streak: {
    current: { type: Number, default: 0, min: 0 },
    highest: { type: Number, default: 0, min: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  stats: [
    {
      daily_points: [{ type: Number, min: 0 }],
      date: { type: Date, default: Date.now },
    },
  ],
  progress: [
    {
      course_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Course",
        required: true
      },
      completed_modules: [{ type: String }],
      quiz_scores: [
        {
          quiz_id: { type: String, required: true },
          score: { type: Number, required: true, min: 0 },
          date_taken: { type: Date, default: Date.now },
        },
      ],
    },
  ],
  totalXp: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  banners: { type: String, trim: true },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  region: { type: String, trim: true },
  created_at: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);

// usage:
// user.updateStreak().then(updatedUser => {
//   console.log('Streak updated:', updatedUser);
// }).catch(err => {
//   console.error('Error updating streak:', err);
// });
