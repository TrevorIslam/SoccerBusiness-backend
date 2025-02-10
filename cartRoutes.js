import express from 'express';
import supabase from './supabaseClient.js';
import { authenticateToken } from './middleware/auth.js';

const router = express.Router();

// Add item to cart
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { session_type_id, coach_id, session_date, session_time, quantity, notes } = req.body;
        
        if (!session_type_id || !coach_id || !session_date || !session_time) {
            return res.status(400).json({ 
                error: "Session type, coach, date and time are required" 
            });
        }

        const { data, error } = await supabase
            .from('cart_items')
            .insert([{ 
                session_type_id,
                coach_id,
                session_date,
                session_time,
                quantity: quantity || 1,
                notes,
                user_id: req.user.id
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

export default router;