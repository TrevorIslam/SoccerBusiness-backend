import express from 'express';
import supabase from './supabaseClient.js';
import { authenticateToken } from './middleware/auth.js';

const router = express.Router();

// **Sign Up (Register New User)**
router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    console.log("Received request body:", req.body);

    if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
    }

    // Sign up user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) return res.status(400).json({ error: authError.message });

    // Save name in users table
    const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{ id: authData.user.id, name, email }]);

    if (userError) return res.status(400).json({ error: userError.message });

    res.json({ user: authData.user, profile: userData });
});


// **Sign In (Login Existing User)**
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return res.status(401).json({ 
                message: 'Invalid email or password' 
            });
        }

        // Extract the session data
        const { session } = data;
        
        // Send back just the token and basic user info
        res.json({
            token: session.access_token,
            user: {
                id: data.user.id,
                email: data.user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'An error occurred during login' 
        });
    }
});

// **Sign Out**
router.post('/signout', async (req, res) => {
    const { error } = await supabase.auth.signOut();
    
    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: "Signed out successfully" });
});

export default router;