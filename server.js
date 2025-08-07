const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path'); // <<<-- THIS LINE MUST BE HERE
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- TEMPORARY DEBUGGING LINES ---
console.log('__dirname:', __dirname);
console.log('Serving static from (intended):', path.join(__dirname, 'public'));
// ---------------------------------

// Your express.static line
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/skedai_db';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define User Schema and Model
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

UserSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const User = mongoose.model('User', UserSchema);

// Define Task Schema and Model
const TaskSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: String, required: true }, // Store as string for easy conversion with HTML date input
    dueTime: { type: String },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    category: { type: String },
    completed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

const Task = mongoose.model('Task', TaskSchema);

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'a_very_secret_key_for_jwt_prod_dev'; // CHANGE THIS IN .env

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication token missing.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification error:', err);
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        req.user = user; // { id: user._id, email: user.email }
        next();
    });
};

// --- AUTH ROUTES ---
// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        const newUser = new User({ name, email, password }); // Password will be hashed in pre-save hook
        await newUser.save();

        const token = jwt.sign({ id: newUser._id, email: newUser.email }, JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error during signup. Please try again later.' });
    }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login. Please try again later.' });
    }
});

// --- TASK ROUTES (PROTECTED) ---

// Get all tasks for an authenticated user
app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ message: 'Server error while fetching tasks.' });
    }
});

// Create a new task
app.post('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const { title, description, dueDate, dueTime, priority, category } = req.body;

        if (!title || !dueDate) {
            return res.status(400).json({ message: 'Title and Due Date are required.' });
        }

        const newTask = new Task({
            userId: req.user.id,
            title,
            description,
            dueDate,
            dueTime,
            priority,
            category,
            completed: false,
        });

        await newTask.save();
        res.status(201).json(newTask);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ message: 'Server error while creating task.' });
    }
});

// Update a task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const taskId = req.params.id;
        const { title, description, dueDate, dueTime, priority, category, completed } = req.body;

        const updatedTask = await Task.findOneAndUpdate(
            { _id: taskId, userId: req.user.id }, // Ensure user owns the task
            { title, description, dueDate, dueTime, priority, category, completed },
            { new: true, runValidators: true } // Return the updated document and run schema validators
        );

        if (!updatedTask) {
            return res.status(404).json({ message: 'Task not found or unauthorized.' });
        }

        res.json(updatedTask);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ message: 'Server error while updating task.' });
    }
});

// Delete a task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const taskId = req.params.id;

        const deletedTask = await Task.findOneAndDelete({ _id: taskId, userId: req.user.id }); // Ensure user owns the task

        if (!deletedTask) {
            return res.status(404).json({ message: 'Task not found or unauthorized.' });
        }

        res.json({ message: 'Task deleted successfully.' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ message: 'Server error while deleting task.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});