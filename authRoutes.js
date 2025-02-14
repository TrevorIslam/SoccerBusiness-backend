import express from 'express';
import supabase from './supabaseClient.js';

const router = express.Router();

// **Sign Up (Register New User)**
router.post('/signup', async (req, res) => {
    const { first_name, last_name, email, password } = req.body;

    console.log("Received request body:", req.body);

    if (!first_name || !last_name || !email || !password) {
        return res.status(400).json({ 
            error: "First name, last name, email, and password are required" 
        });
    }

    // Sign up user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email, 
        password 
    });

    if (authError) return res.status(400).json({ error: authError.message });

    // Save first_name and last_name in users table
    const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{ 
            id: authData.user.id, 
            first_name, 
            last_name, 
            email 
        }]);

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

        // Fetch user profile data from users table
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', data.user.id)
            .single();

        if (userError) {
            console.error('Error fetching user data:', userError);
            return res.status(500).json({ 
                message: 'Error fetching user profile' 
            });
        }

        res.json({
            access_token: session.access_token,
            expires_at: session.expires_at,
            refresh_token: session.refresh_token,
            user: {
                id: data.user.id,
                email: data.user.email,
                first_name: userData.first_name,
                last_name: userData.last_name
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