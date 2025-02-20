import express from 'express';
import multer from 'multer';
import supabase from './supabaseClient.js';
import { authenticateToken } from './middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to delete old profile picture
async function deleteOldProfilePicture(coachId) {
    try {
        const { data: coach } = await supabase
            .from('coaches')
            .select('profile_picture_url')
            .eq('auth_id', coachId)
            .single();

        if (coach?.profile_picture_url) {
            const oldFileName = coach.profile_picture_url.split('/').pop();
            await supabase.storage
                .from('coach_profile_pictures')
                .remove([oldFileName]);
        }
    } catch (error) {
        console.error('Error deleting old profile picture:', error);
    }
}

// Upload/Update profile picture
router.post('/profile-picture', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ error: 'Invalid file type. Only JPEG/JPG, PNG and GIF are allowed' });
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (req.file.size > maxSize) {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
        }

        const file = req.file;
        let fileExt = file.originalname.split('.').pop().toLowerCase();
        if (fileExt === 'jpg') fileExt = 'jpeg';
        
        const fileName = `${req.user.id}_${Date.now()}.${fileExt}`;

        await deleteOldProfilePicture(req.user.id);

        const { data: storageData, error: storageError } = await supabase.storage
            .from('coach_profile_pictures')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (storageError) {
            return res.status(500).json({ error: storageError.message });
        }

        const { data: { publicUrl } } = await supabase.storage
            .from('coach_profile_pictures')
            .getPublicUrl(fileName);

        const { data: updateData, error: updateError } = await supabase
            .from('coaches')
            .update({ profile_picture_url: publicUrl })
            .eq('auth_id', req.user.id)
            .select();

        if (updateError) {
            return res.status(500).json({ error: updateError.message });
        }

        res.json({ url: publicUrl });
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get coach profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const { data: profile, error } = await supabase
            .from('coaches')
            .select(`
                id,
                auth_id,
                email,
                first_name,
                last_name,
                phone,
                hometown,
                position,
                grad_year,
                eligibility_class,
                profile_picture_url
            `)
            .eq('auth_id', req.user.id)
            .single();

        if (error) throw error;

        res.json(profile);
    } catch (error) {
        console.error('Error fetching coach profile:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update coach profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            phone,
            hometown,
            position,
            grad_year,
            eligibility_class,
            profile_picture_url
        } = req.body;

        const { data: profile, error } = await supabase
            .from('coaches')
            .update({
                first_name,
                last_name,
                phone,
                hometown,
                position,
                grad_year,
                eligibility_class,
                profile_picture_url
            })
            .eq('auth_id', req.user.id)
            .select();

        if (error) throw error;

        res.json(profile[0]);
    } catch (error) {
        console.error('Error updating coach profile:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete profile picture
router.delete('/profile-picture', authenticateToken, async (req, res) => {
    try {
        await deleteOldProfilePicture(req.user.id);
        
        const { error } = await supabase
            .from('coaches')
            .update({ profile_picture_url: null })
            .eq('auth_id', req.user.id);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting profile picture:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router; 