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

// Get coach availability (existing endpoint, slightly modified)
router.get('/:coachId/availability', async (req, res) => {
    try {
        const { coachId } = req.params;
        const { date } = req.query; // Optional: get availability for specific date
        
        let query = supabase
            .from('coach_availability')
            .select('date, time_slots')
            .eq('coach_uuid', coachId);

        // If specific date requested, filter for it
        if (date) {
            query = query.eq('date', date);
        } else {
            // Otherwise get next 30 days
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30);
            
            query = query
                .gte('date', startDate.toISOString().split('T')[0])
                .lte('date', endDate.toISOString().split('T')[0]);
        }

        const { data: availability, error } = await query.order('date', { ascending: true });

        if (error) throw error;
        res.json(availability);
    } catch (error) {
        console.error('Error fetching coach availability:', error);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});

// Set/Update availability for a specific date
router.post('/:coachId/availability', authenticateToken, async (req, res) => {
    try {
        const { coachId } = req.params;
        const { date, time_slots } = req.body;

        // Validate coach exists and user has permission
        const { data: coach, error: coachError } = await supabase
            .from('coaches_view')
            .select('id')                // selecting the UUID from coaches table
            .eq('id', coachId)          // matching against the ID parameter
            .single();


        if (coachError || !coach) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        if (!date || !time_slots) {
            return res.status(400).json({ error: 'Date and time_slots are required' });
        }

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }

        // Validate time_slots format
        if (typeof time_slots !== 'object' || time_slots === null) {
            return res.status(400).json({ error: 'time_slots must be an object' });
        }

        for (const [time, types] of Object.entries(time_slots)) {
            // Validate time format (HH:MM)
            if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
                return res.status(400).json({ 
                    error: `Invalid time format for ${time}. Use HH:MM (24-hour format)`
                });
            }

            if (!Array.isArray(types) || !types.every(type => ['zoom', 'inperson'].includes(type))) {
                return res.status(400).json({ 
                    error: 'Invalid time_slots format. Each time slot must have an array of "zoom" and/or "inperson"'
                });
            }
        }

        // Upsert the availability
        const { data, error } = await supabase
            .from('coach_availability')
            .upsert({
                coach_uuid: coachId,
                date,
                time_slots
            })
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (error) {
        console.error('Error setting coach availability:', error);
        res.status(500).json({ error: 'Failed to set availability' });
    }
});

// Delete availability for a specific date
router.delete('/:coachId/availability/:date', authenticateToken, async (req, res) => {
    try {
        const { coachId, date } = req.params;

        // Validate coach exists
        const { data: coach, error: coachError } = await supabase
            .from('coaches_view')
            .select('id')
            .eq('id', coachId)
            .single();

        if (coachError || !coach) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }

        const { error } = await supabase
            .from('coach_availability')
            .delete()
            .eq('coach_id', coachId)
            .eq('date', date);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting coach availability:', error);
        res.status(500).json({ error: 'Failed to delete availability' });
    }
});

export default router;