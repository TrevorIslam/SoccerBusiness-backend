import express from 'express';
import supabase from './supabaseClient.js';

const router = express.Router();

// **Sign Up (Register New Coach)**
router.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ 
            error: "Email and password are required" 
        });
    }

    try {
        // Sign up coach in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    role: 'coach'  // Add role to auth metadata
                }
            }
        });

        if (authError) throw authError;

        const { error: coachError } = await supabase
            .from('coaches')
            .insert([{ 
                auth_id: authData.user.id,
                email,
                status: 'pending',
            }]);

        if (coachError) throw coachError;

        res.json({ 
            message: 'Coach account created successfully, pending approval',
            user: authData.user
        });

    } catch (error) {
        console.error('Coach signup error:', error);
        res.status(400).json({ 
            error: error.message 
        });
    }
});


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

        // Fetch coach data
        const { data: coachData, error: coachError } = await supabase
            .from('coaches')
            .select('*')  // Or specify exact fields you need
            .eq('auth_id', data.user.id)
            .single();

        if (coachError) {
            console.error('Error fetching coach data:', coachError);
            return res.status(401).json({ 
                message: 'Not authorized as a coach' 
            });
        }

        // Check coach status
        if (coachData.status === 'pending') {
            return res.status(403).json({
                message: 'Your coach account is pending approval'
            });
        }

        if (coachData.status === 'suspended') {
            return res.status(403).json({
                message: 'Your coach account has been suspended'
            });
        }

        res.json({
            access_token: session.access_token,
            expires_at: session.expires_at,
            refresh_token: session.refresh_token,
            coach: {
                id: coachData.id,
                auth_id: data.user.id,
                email: data.user.email,
                status: coachData.status,
            }
        });

    } catch (error) {
        console.error('Coach login error:', error);
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