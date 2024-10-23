const mongoose = require("mongoose");

const examSchema = new mongoose.Schema({
  course_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Course", 
    required: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  duration: { 
    type: Number, // in minutes
    required: true 
  },
  questions: [{
    question_text: { 
      type: String, 
      required: true 
    },
    options: [{ 
      type: String, 
      required: true 
    }],
    correct_option: { 
      type: Number, 
      required: true 
    },
    points: { 
      type: Number, 
      default: 1 
    }
  }],
  passing_score: { 
    type: Number, 
    required: true 
  },
  badge: { 
    type: String 
  },
  e_certificate: { 
    type: String 
  },
  total_points: { 
    type: Number, 
    required: true 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Virtual for total number of questions
examSchema.virtual('question_count').get(function() {
  return this.questions.length;
});

// Method to check if a user has passed the exam
examSchema.methods.hasPassed = function(score) {
  return score >= this.passing_score;
};

module.exports = mongoose.model("Exam", examSchema);
