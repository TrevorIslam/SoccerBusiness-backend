import supabase from '../supabaseClient.js';

export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ 
                message: 'Access denied. No token provided.' 
            });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error) {
            return res.status(401).json({ 
                message: 'Invalid or expired token' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ 
            message: 'Invalid token' 
        });
    }
};