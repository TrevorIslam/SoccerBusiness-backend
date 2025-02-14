import express from 'express';
import cors from 'cors';
import authRoutes from './authRoutes.js';
import cartRoutes from './cartRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import coachRoutes from './coachRoutes.js';
import playerRoutes from './playerRoutes.js';
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend access
app.use(cors({
    origin: 'http://localhost:5173', // Your frontend URL
    // credentials: true // Allow cookies
}));

app.use(express.json()); // Allow JSON data

// Routes
app.use('/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/players', playerRoutes);
app.get('/', (req, res) => {
    res.send('Backend is running!');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
