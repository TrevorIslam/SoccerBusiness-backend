import express from 'express';
import multer from 'multer';
import supabase from './supabaseClient.js';
import { authenticateToken } from './middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to delete old profile picture
async function deleteOldProfilePicture(userId) {
    try {
        const { data: user } = await supabase
            .from('users')
            .select('profile_picture_url')
            .eq('id', userId)
            .single();

        if (user?.profile_picture_url) {
            const oldFileName = user.profile_picture_url.split('/').pop();
            await supabase.storage
                .from('profile_pictures')
                .remove([oldFileName]);
        }
    } catch (error) {
        console.error('Error deleting old profile picture:', error);
    }
}

router.post('/profile-picture', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }

        // Validate file type - updated to include both jpg and jpeg
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ error: 'Invalid file type. Only JPEG/JPG, PNG and GIF are allowed' });
        }

        // Validate file size (e.g., 5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (req.file.size > maxSize) {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
        }

        const user = req.user;
        const file = req.file;
        
        // Normalize jpg/jpeg extension
        let fileExt = file.originalname.split('.').pop().toLowerCase();
        if (fileExt === 'jpg') fileExt = 'jpeg';
        
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;

        // Delete old profile picture
        await deleteOldProfilePicture(user.id);

        // Upload to Supabase Storage
        const { data: storageData, error: storageError } = await supabase.storage
            .from('profile_pictures')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (storageError) {
            return res.status(500).json({ error: storageError.message });
        }

        // Get the public URL
        const { data: { publicUrl } } = await supabase.storage
            .from('profile_pictures')
            .getPublicUrl(fileName);

        // Update user profile with new image URL
        console.log('User object:', user);
        console.log('Public URL:', publicUrl);

        // Add this before the update
        const { data: existingUser, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single();

        if (userError || !existingUser) {
            console.error('User not found:', userError);
            return res.status(500).json({ error: 'User not found in database' });
        }

        const { data: updateData, error: updateError } = await supabase
            .from('users')
            .update({ profile_picture_url: publicUrl })
            .eq('id', user.id)
            .select();

        if (updateError) {
            console.error('Database update error:', updateError);
            return res.status(500).json({ error: updateError.message });
        }

        console.log('Update response:', updateData);

        res.json({ url: publicUrl });
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const { data: profile, error } = await supabase
            .from('users')
            .select('first_name, last_name, email, profile_picture_url')
            .eq('id', req.user.id)
            .single();

        if (error) throw error;

        res.json(profile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete profile picture
router.delete('/profile-picture', authenticateToken, async (req, res) => {
    try {
        await deleteOldProfilePicture(req.user.id);
        
        const { error } = await supabase
            .from('users')
            .update({ profile_picture_url: null })
            .eq('id', req.user.id);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting profile picture:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router; 