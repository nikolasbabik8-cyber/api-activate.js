const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        // Initialize Supabase inside the handler to prevent cold-start crashes
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ success: false, message: 'Missing environment variables on server.' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Parse request body safely
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { key, hwid } = body || {};

        if (!key || !hwid) {
            return res.status(400).json({ success: false, message: 'Missing key or hwid parameter' });
        }

        // Query database for the key
        const { data: row, error } = await supabase
            .from('licenses')
            .select('*')
            .eq('key_string', key)
            .single();

        if (error || !row) {
            return res.json({ success: false, message: 'Invalid license key.' });
        }

        // Check HWID binding
        if (row.hwid && row.hwid !== hwid) {
            return res.json({ success: false, message: 'HWID mismatch! Key locked to another machine.' });
        }

        // Bind HWID on first use
        if (!row.hwid) {
            await supabase
                .from('licenses')
                .update({ hwid: hwid, status: 'Active' })
                .eq('key_string', key);

            return res.json({ success: true, message: 'Activation successful!' });
        }

        return res.json({ success: true, message: 'Welcome back!' });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
