const express = require("express");
const path = require("path");
const { initializeApp } = require("firebase/app");
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
mongoose.connect("mongodb://localhost:27017/cyberquest");

// Middleware
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "your_session_secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
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
const isAuthenticated = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

// Routes
app.get("/", (req, res) => {
  res.render("sample");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { idToken } = req.body;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email } = decodedToken;
    
    let dbUser = await User.findOne({ email });
    if (!dbUser) {
      dbUser = new User({
        email,
        firebaseUid: uid,
        username: email.split('@')[0]
      });
      await dbUser.save();
    }

    res.json({ success: true, user: { uid, email, username: dbUser.username } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(400).json({ success: false, error: `Login failed: ${error.message}` });
  }
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

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
        username
      });
      await dbUser.save();
    }

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

app.get("/userProfile", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.render("userProfile", { user });
  } catch (error) {
    console.error("User profile error:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/leaderboard", async (req, res) => {
  try {
    const leaderboard = await Leaderboard.find()
      .populate("userId")
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
    const leaderboard = await Leaderboard.find()
      .populate("userId")
      .sort("-points")
      .limit(10);
    res.json(leaderboard);
  } catch (error) {
    console.error("API leaderboard error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/auth/google", async (req, res) => {
  const { idToken } = req.body;
  try {
    if (!idToken) {
      return res.status(400).json({ success: false, error: "Missing idToken" });
    }

    // Verify the ID token using the Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const name = decodedToken.name || email.split('@')[0];

    console.log("Authenticated user:", { uid, email, name });

    let dbUser = await User.findOne({ email });
    if (!dbUser) {
      dbUser = new User({
        email,
        firebaseUid: uid,
        username: name
      });
      await dbUser.save();
    }

    req.session.user = dbUser;
    res.json({ success: true });
  } catch (error) {
    console.error("Google Auth error:", error);
    res.status(400).json({ success: false, error: `Google Auth failed: ${error.message}` });
  }
});

app.get("/sample", (req, res) => {
  res.render("examSection");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
