import express from 'express';
import supabase from './supabaseClient.js';
import { authenticateToken } from './middleware/auth.js';

const router = express.Router();

// Add item to cart
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { product_id, quantity } = req.body;
        
        if (!product_id || !quantity) {
            return res.status(400).json({ 
                error: "Product ID and quantity are required" 
            });
        }

        const { data, error } = await supabase
            .from('cart_items')
            .insert([{ 
                product_id,
                quantity,
                user_id: req.user.id
            }])
            .select();

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Cart error:', error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('cart_items')
            .select(`
                *,
                products (
                    name,
                    price,
                    description
                )
            `)
            .eq('user_id', req.user.id);  // Only get this user's cart items

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Cart error:', error);
        res.status(400).json({ error: error.message });
    }
});

export default router;