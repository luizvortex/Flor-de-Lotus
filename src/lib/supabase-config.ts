// Project selected by the user. This publishable key grants no privileged access.
// Authorization is enforced by Postgres; no service-role key is used by the app.
export const supabaseUrl = process.env.SUPABASE_URL || 'https://asojfispuomhbfapqdmi.supabase.co';
export const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fbiDkatSANwHdNqq0xY_cg_HLr2R_Ec';
