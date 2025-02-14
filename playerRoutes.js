import express from 'express';
import supabase from './supabaseClient.js';
import { authenticateToken } from './middleware/auth.js';

const router = express.Router();

// Get all players for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { data: players, error } = await supabase
            .from('players')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(players);
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ error: 'Failed to fetch players' });
    }
});

// Get a specific player
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { data: player, error } = await supabase
            .from('players')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (error) throw error;
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        res.json(player);
    } catch (error) {
        console.error('Error fetching player:', error);
        res.status(500).json({ error: 'Failed to fetch player' });
    }
});

// Create a new player
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { 
            first_name, 
            last_name, 
            date_of_birth,
            primary_position,
            secondary_position,
            preferred_foot,
            current_team,
            team_level,
            graduation_year
        } = req.body;

        if (!first_name || !last_name || !date_of_birth) {
            return res.status(400).json({ 
                error: 'First name, last name, and date of birth are required' 
            });
        }

        if (date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
            return res.status(400).json({ error: 'Invalid date format for date_of_birth. Use YYYY-MM-DD' });
        }

        const { data: player, error } = await supabase
            .from('players')
            .insert([{ 
                user_id: req.user.id,
                first_name,
                last_name,
                date_of_birth,
                primary_position,
                secondary_position,
                preferred_foot,
                current_team,
                team_level,
                graduation_year
            }])
            .select();

        if (error) throw error;

        res.status(201).json(player[0]);
    } catch (error) {
        console.error('Error creating player:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update a player
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { 
            first_name, 
            last_name, 
            date_of_birth,
            primary_position,
            secondary_position,
            preferred_foot,
            current_team,
            team_level,
            graduation_year
        } = req.body;

        // Check if player exists and belongs to user
        const { data: existingPlayer, error: checkError } = await supabase
            .from('players')
            .select('id')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (checkError || !existingPlayer) {
            return res.status(404).json({ error: 'Player not found' });
        }

        if (date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
            return res.status(400).json({ error: 'Invalid date format for date_of_birth. Use YYYY-MM-DD' });
        }

        const { data: player, error } = await supabase
            .from('players')
            .update({ 
                first_name, 
                last_name, 
                date_of_birth,
                primary_position,
                secondary_position,
                preferred_foot,
                current_team,
                team_level,
                graduation_year
            })
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .select();

        if (error) throw error;

        res.json(player[0]);
    } catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete a player
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        // Check if player exists and belongs to user
        const { data: existingPlayer, error: checkError } = await supabase
            .from('players')
            .select('id')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (checkError || !existingPlayer) {
            return res.status(404).json({ error: 'Player not found' });
        }

        const { error } = await supabase
            .from('players')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting player:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;