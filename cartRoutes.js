import express from 'express';
import supabase from './supabaseClient.js';
import { authenticateToken } from './middleware/auth.js';

const router = express.Router();

// Add item to cart
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { session_type, coach_id, session_date, session_time, quantity, notes, player_id } = req.body;
        
        if (!session_type || !coach_id || !session_date || !session_time) {
            return res.status(400).json({ 
                error: "Session type, coach, date and time are required" 
            });
        }

        // Verify player belongs to user if player_id is provided
        if (player_id) {
            const { data: player, error: playerError } = await supabase
                .from('players')
                .select('id')
                .eq('id', player_id)
                .eq('user_id', req.user.id)
                .single();

            if (playerError || !player) {
                return res.status(400).json({ error: 'Invalid player_id' });
            }
        }

        const { data, error } = await supabase
            .from('cart_items')
            .insert([{ 
                session_type,
                coach_id,
                session_date,
                session_time,
                quantity: quantity || 1,
                notes,
                user_id: req.user.id,
                player_id
            }])
            .select('*');

        if (error) throw error;

        res.json(data[0]);
    } catch (error) {
        console.error('Cart error:', error);
        res.status(400).json({ error: error.message });
    }
});
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('cart_items_view')  // Use our new view
            .select('*')
            .eq('user_id', req.user.id);

        if (error) throw error;

        // Return in the format frontend expects
        res.json({
            items: data || []
        });
    } catch (error) {
        console.error('Cart error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);  // Ensure user can only delete their own items

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Delete cart item error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.post('/merge', authenticateToken, async (req, res) => {
    try {
        const guestCartItems = req.body;
        if (!Array.isArray(guestCartItems)) {
            return res.status(400).json({ error: "Expected an array of cart items" });
        }

        // Format items for insertion, adding user_id to each
        const itemsToInsert = guestCartItems.map(item => ({
            session_type: item.session_type,
            coach_id: item.coach_id,
            session_date: item.session_date,
            session_time: item.session_time,
            quantity: item.quantity || 1,
            notes: item.notes || '',
            user_id: req.user.id,
            player_id: item.player_id
        }));

        // Insert all items
        const { data, error } = await supabase
            .from('cart_items')
            .insert(itemsToInsert)
            .select();

        if (error) throw error;

        res.json({ 
            success: true,
            mergedItems: data 
        });

    } catch (error) {
        console.error('Cart merge error:', error);
        res.status(400).json({ error: error.message });
    }
});

export default router;