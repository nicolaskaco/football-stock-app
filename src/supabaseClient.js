import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://czboublvkbkvtbkmkqmx.supabase.co'; // Replace with your URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6Ym91Ymx2a2JrdnRia21rcW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NTA4MjcsImV4cCI6MjA4MjUyNjgyN30.nLFsGP7K7hNrxUxtuHDtwFmNAoaZ80BcjrbGkZ0ogUM'; // Replace with your anon key

export const supabase = createClient(supabaseUrl, supabaseKey);