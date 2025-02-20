import express from 'express';
import supabase from './supabaseClient.js';
import { authenticateToken } from './middleware/auth.js';

const router = express.Router();

// Get all coaches
router.get('/', async (req, res) => {
    try {
        const { data: coaches, error } = await supabase
            .from('coaches_view')
            .select(`*,
                availability:coach_availability(
                    date,
                    time_slots
                )`);

        if (error) throw error;

        res.json(coaches);
    } catch (error) {
        console.error('Error fetching coaches:', error);
        res.status(500).json({ error: 'Failed to fetch coaches' });
    }
});

export default router;