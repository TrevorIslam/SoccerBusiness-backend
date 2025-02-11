import express from 'express';
import supabase from './supabaseClient.js';

const router = express.Router();

// Get all coaches
router.get('/', async (req, res) => {
    try {
        const { data: coaches, error } = await supabase
            .from('coaches_view')
            .select('*');

        if (error) throw error;

        res.json(coaches);
    } catch (error) {
        console.error('Error fetching coaches:', error);
        res.status(500).json({ error: 'Failed to fetch coaches' });
    }
});

// Get coach availability (public route)
router.get('/:coachId/availability', async (req, res) => {
    try {
        const { coachId } = req.params;
        
        // Get availability for next 30 days
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        const { data: availability, error } = await supabase
            .from('coach_availability')
            .select('date, time_slots')
            .eq('coach_id', coachId)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0])
            .order('date', { ascending: true });

        if (error) throw error;

        res.json(availability);
    } catch (error) {
        console.error('Error fetching coach availability:', error);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});

export default router;