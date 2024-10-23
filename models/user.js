const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true,
    trim: true,
    unique: true // Add unique constraint
  },
  email: { 
    type: String, 
    required: true, // Make email required
    unique: true,
    trim: true,
    lowercase: true
  },
  tags: [{ type: String, trim: true }],
  streak: {
    current: { type: Number, default: 0, min: 0 },
    highest: { type: Number, default: 0, min: 0 },
    lastUpdated: { type: Date, default: Date.now } // Add last updated date
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
  banners: { type: String, trim: true },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  region: { type: String, trim: true },
  created_at: { type: Date, default: Date.now },
}, { timestamps: true });

userSchema.methods.updateStreak = function () {
  const today = new Date();
  const streakDays = this.stats.filter(stat => {
    const points = stat.daily_points.reduce((acc, points) => acc + points, 0);
    return points > 0 && new Date(stat.date).setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0);
  }).length;

  // Update current streak
  this.streak.current = streakDays;

  // Update highest streak if current streak is greater
  if (this.streak.current > this.streak.highest) {
    this.streak.highest = this.streak.current;
  }

  // Save the updated user document
  return this.save();
};

module.exports = mongoose.model("User", userSchema);

// usage:
// user.updateStreak().then(updatedUser => {
//   console.log('Streak updated:', updatedUser);
// }).catch(err => {
//   console.error('Error updating streak:', err);
// });