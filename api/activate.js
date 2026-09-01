
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { key, hwid } = req.body;
    if (!key || !hwid) {
        return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    const { data: row, error } = await supabase
        .from('licenses')
        .select('*')
        .eq('key_string', key)
        .single();

    if (error || !row) {
        return res.json({ success: false, message: 'Invalid license key.' });
    }

    if (row.hwid && row.hwid !== hwid) {
        return res.json({ success: false, message: 'HWID mismatch! Key locked to another machine.' });
    }

    if (!row.hwid) {
        await supabase.from('licenses').update({ hwid: hwid, status: 'Active' }).eq('key_string', key);
        return res.json({ success: true, message: 'Activation successful!' });
    }

    return res.json({ success: true, message: 'Welcome back!' });
}
