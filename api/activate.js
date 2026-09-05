import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  console.log("--- NEW ACTIVATION REQUEST ---");
  console.log("Method:", req.method);
  console.log("Raw req.body:", req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false, debug: "Method not allowed" });
  }

  // Parse body if WinHTTP sent it as a raw string
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      console.log("JSON Parse Error:", e.message);
    }
  }

  const { key, hwid } = body || {};
  console.log("Extracted Key:", key);
  console.log("Extracted HWID:", hwid);

  if (!key || !hwid) {
    return res.status(200).json({ valid: false, debug: "Missing key or hwid in payload" });
  }

  // Query Supabase
  const { data: license, error: fetchError } = await supabase
    .from('Licenses')
    .select('*')
    .eq('key_string', key)
    .single();

  console.log("Supabase Fetch Result:", license);
  console.log("Supabase Fetch Error:", fetchError);

  if (fetchError || !license) {
    return res.status(200).json({ valid: false, debug: "Key not found in database", dbError: fetchError });
  }

  // Handle Unused Key
  if (license.status === 'Unused') {
    const { data: updateData, error: updateError } = await supabase
      .from('Licenses')
      .update({ status: 'Active', hwid: hwid })
      .eq('key_string', key)
      .select();

    console.log("Update Result:", updateData);
    console.log("Update Error:", updateError);

    if (updateError) {
      return res.status(200).json({ valid: false, debug: "Database update failed", updateError });
    }

    return res.status(200).json({ valid: true });
  }

  // Handle Active Key
  if (license.status === 'Active' && license.hwid === hwid) {
    return res.status(200).json({ valid: true });
  }

  return res.status(200).json({ valid: false, debug: "HWID mismatch or status invalid" });
}
