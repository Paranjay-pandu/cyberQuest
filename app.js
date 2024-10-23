const express = require("express");
const path = require("path");
const { initializeApp } = require("firebase/app");
const userRoutes = require("./routes/userRoutes")
const {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} = require("firebase/auth");
const mongoose = require("mongoose");
const session = require("express-session");
const User = require("./models/user");
const Course = require("./models/course");
const Leaderboard = require("./models/leaderboard");
const Comment = require("./models/comment");
const { getFirestore, query, where, limit, collection, getDocs } = require("firebase/firestore");
const admin = require("firebase-admin");

const app = express();

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD43GgWneAiYeg165rG1LhKh8doaoR5a5o",
  authDomain: "cyberquest-e8888.firebaseapp.com",
  projectId: "cyberquest-e8888",
  storageBucket: "cyberquest-e8888.appspot.com",
  messagingSenderId: "90871092648",
  appId: "1:90871092648:web:c8922165b9612daf8c799d",
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "cyberquest-e8888",
});

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/cyberquest")
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// Middleware
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict'
    }
  })
);

// Add this middleware after your session middleware
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (token) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
    } catch (error) {
      console.error("Token verification failed:", error);
    }
  }
  next();
});

// Update the isAuthenticated middleware
const isAuthenticated = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1] || req.session.token;
  if (token) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error("Token verification failed:", error);
      res.status(401).json({ error: "Unauthorized" });
    }
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};
app.get('/api/user', async (req, res) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
  
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const uid = decodedToken.uid;
      
      // Fetch user data from your database using the uid
      const user = await User.findOne({ firebaseUid: uid });
      
      if (!user) {
        // User is authenticated but not in your database
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Return user data
      res.json({
        username: user.username,
        email: user.email,
        level: user.level,
        xp: user.xp,
        streak: user.streak,
        // Add other fields as needed
      });
    } catch (error) {
      console.error('Error verifying token or fetching user:', error);
      res.status(401).json({ error: 'Unauthorized' });
    }
  });
  app.get('/complete-registration', (req, res) => {
      // Render a page for completing registration
      res.render('completeRegistration');
    });
    
    app.post('/complete-registration', async (req, res) => {
      const { username, email } = req.body;
      const token = req.headers.authorization?.split('Bearer ')[1];
    
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }
    
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;
    
        // Create a new user in your database
        const newUser = new User({
          username,
          email,
          firebaseUid: uid,
          level: 1,
          xp: 0,
          streak: { current: 0, highest: 0 }
        });
    
        await newUser.save();
    
        res.json({ success: true, message: 'Registration completed' });
      } catch (error) {
        console.error('Error completing registration:', error);
        res.status(400).json({ error: 'Failed to complete registration' });
      }
    });
// Routes
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

// Update the ensureLeaderboardEntry function with more error logging
async function ensureLeaderboardEntry(user) {
  try {
    console.log("Ensuring leaderboard entry for user:", user._id);
    let leaderboardEntry = await Leaderboard.findOne({ user: user._id });
    if (!leaderboardEntry) {
      console.log("No leaderboard entry found, creating new entry");
      leaderboardEntry = new Leaderboard({
        user: user._id,
        points: 0,
        streak: {
          current: user.streak.current,
          highest: user.streak.highest,
        },
        level: user.level,
        region: user.region || 'Global'
      });
      await leaderboardEntry.save();
      console.log("New leaderboard entry created:", leaderboardEntry);
    } else {
      console.log("Existing leaderboard entry found:", leaderboardEntry);
    }
    return leaderboardEntry;
  } catch (error) {
    console.error("Error in ensureLeaderboardEntry:", error);
    throw error;
  }
}

// Update the login route with more error handling
app.post("/login", async (req, res) => {
  const { idToken } = req.body;
  try {
    console.log("Login attempt with idToken:", idToken);
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email } = decodedToken;
    console.log("Decoded token:", { uid, email });
    
    let dbUser = await User.findOne({ email });
    if (!dbUser) {
      console.log("User not found, creating new user");
      dbUser = new User({
        email,
        firebaseUid: uid,
        username: email.split('@')[0],
        level: 1,
        xp: 0,
        streak: { current: 0, highest: 0 }
      });
      await dbUser.save();
      console.log("New user created:", dbUser);
    } else {
      console.log("Existing user found:", dbUser);
    }

    // Ensure leaderboard entry exists
    await ensureLeaderboardEntry(dbUser);

    req.session.token = idToken;
    res.json({ success: true, user: { uid, email, username: dbUser.username } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: `Login failed: ${error.message}` });
  }
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

// Update the signup route
app.post("/signup", async (req, res) => {
  const { idToken, username } = req.body;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email } = decodedToken;
    
    let dbUser = await User.findOne({ email });
    if (!dbUser) {
      dbUser = new User({
        email,
        firebaseUid: uid,
        username,
        level: 1,
        xp: 0,
        streak: { current: 0, highest: 0 }
      });
      await dbUser.save();
    }

    // Ensure leaderboard entry exists
    await ensureLeaderboardEntry(dbUser);

    req.session.token = idToken;
    res.json({ success: true, user: { uid, email, username: dbUser.username } });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(400).json({ success: false, error: `Signup failed: ${error.message}` });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    res.redirect("/");
  });
});

// Update the userProfile route
app.get("/userProfile", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).send("User not found");
    }
    
    // Calculate the progress for the progress bars
    const levelProgress = (user.xp % 1000) / 10; // Assuming 1000 XP per level
    const activityProgress = (user.dailyGoalsCompleted / 5) * 100; // Assuming 5 daily goals
    const courseProgress = (user.courseProgress / 100) * 100; // Assuming courseProgress is stored as a percentage

    res.render("userProfile", { 
      user: {
        username: user.username,
        level: user.level,
        xp: user.xp,
        streak: user.streak,
        tags: user.tags || [],
        avatarUrl: user.avatarUrl,
        achievements: user.achievements || [],
        dailyGoalsCompleted: user.dailyGoalsCompleted || 0,
        currentCourse: user.currentCourse || 'No active course',
        courseProgress: user.courseProgress || 0
      },
      levelProgress,
      activityProgress,
      courseProgress
    });
  } catch (error) {
    console.error("User profile error:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/leaderboard", async (req, res) => {
  try {
    const leaderboard = await Leaderboard.find()
      .populate("user")
      .sort("-points")
      .limit(10);
    res.render("leaderboard", { leaderboard });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/submit-contact", isAuthenticated, async (req, res) => {
  const { type, message } = req.body;
  try {
    const newComment = new Comment({
      user_id: req.user.uid,
      comment: message,
      type,
    });
    await newComment.save();
    res.redirect("/");
  } catch (error) {
    console.error("Submit contact error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// API routes
app.get("/api/user", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("API user error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/courses", isAuthenticated, async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (error) {
    console.error("API courses error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    const { sort = 'points', order = 'desc', region, limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (region && region !== 'All') {
      query.region = region;
    }

    const sortOption = {};
    sortOption[sort] = order === 'asc' ? 1 : -1;

    // Add a secondary sort by username to ensure consistent ordering
    sortOption['user.username'] = 1;

    const leaderboard = await Leaderboard.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'username email tags');

    const total = await Leaderboard.countDocuments(query);

    res.json({
      leaderboard,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    res.status(500).json({ error: 'Error fetching leaderboard data' });
  }
});

// Update the Google authentication route
app.post("/auth/google", async (req, res) => {
  const { idToken } = req.body;
  try {
    if (!idToken) {
      return res.status(400).json({ success: false, error: "Missing idToken" });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    let dbUser = await User.findOne({ email });
    if (!dbUser) {
      dbUser = new User({
        email,
        firebaseUid: uid,
        username: name || email.split('@')[0],
        level: 1,
        xp: 0,
        streak: { current: 0, highest: 0 }
      });
      await dbUser.save();
    }

    // Ensure leaderboard entry exists
    await ensureLeaderboardEntry(dbUser);

    req.session.token = idToken;
    res.json({ success: true, user: { uid, email, username: dbUser.username } });
  } catch (error) {
    console.error("Google Auth error:", error);
    res.status(400).json({ success: false, error: `Google Auth failed: ${error.message}` });
  }
});

app.get("/sample", (req, res) => {
  res.render("examSection");
});

// Fetch unique regions
app.get('/api/regions', async (req, res) => {
  try {
    const regions = await Leaderboard.distinct('region');
    res.json(regions);
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({ error: 'Error fetching regions' });
  }
});

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, region } = req.body;

    // Create user in Firebase
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
    });

    // Create user in MongoDB
    const newUser = new User({
      firebaseUid: userRecord.uid,
      username: username,
      email: email,
      region: region,
    });

    await newUser.save();

    // Create a corresponding leaderboard entry
    const leaderboardEntry = new Leaderboard({
      user: newUser._id,
      points: 0,
      streak: {
        current: 0,
        highest: 0,
      },
      level: 1,
      region: region,
    });

    await leaderboardEntry.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// Add a new function to update the leaderboard
async function updateLeaderboard(userId, points, streak, level) {
  try {
    await Leaderboard.findOneAndUpdate(
      { user: userId },
      {
        $inc: { points: points },
        $set: {
          'streak.current': streak.current,
          'streak.highest': Math.max(streak.current, streak.highest),
          level: level
        }
      },
      { new: true, upsert: true }
    );
  } catch (error) {
    console.error("Error updating leaderboard:", error);
  }
}

// Add these functions at the top of your file or in a separate utility file
function calculateTotalXpForLevel(level) {
  if (level === 1) return 1000;
  return 1000 + 1200 * (level - 1) * (level - 1);
}

function calculateLevelFromXp(totalXp) {
  let level = 1;
  while (calculateTotalXpForLevel(level + 1) <= totalXp) {
    level++;
  }
  return level;
}

function updateUserLevel(user, xpGained) {
  user.totalXp += xpGained;
  const newLevel = calculateLevelFromXp(user.totalXp);
  if (newLevel > user.level) {
    user.level = newLevel;
  }
  user.xp = user.totalXp - calculateTotalXpForLevel(user.level);
}

// Update the complete-lesson route
app.post("/api/complete-lesson", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get XP gained from the request body, or use a default value
    const xpGained = req.body.xpGained || 10;

    // Update user data
    updateUserLevel(user, xpGained);
    user.streak.current += 1;
    user.streak.highest = Math.max(user.streak.current, user.streak.highest);
    await user.save();

    // Update leaderboard
    await updateLeaderboard(user._id, xpGained, user.streak, user.level);

    res.json({ 
      success: true, 
      user: {
        ...user.toObject(),
        nextLevelXp: calculateTotalXpForLevel(user.level + 1) - user.totalXp
      }
    });
  } catch (error) {
    console.error("Complete lesson error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
  .on('error', (error) => {
    console.error('Error starting server:', error);
    process.exit(1);
  });

