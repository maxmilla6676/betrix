import { createClient } from "@supabase/supabase-js";

const env = import.meta.env as Record<string, string | undefined>;
const supabaseUrl = env["VITE_SUPABASE_URL"] || "https://hkhjjygpozrsittxqbsj.supabase.co";
const supabaseAnonKey =
  env["VITE_SUPABASE_ANON_KEY"] ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhraGpqeWdwb3pyc2l0dHhxYnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MTEyMDIsImV4cCI6MjEwNjI4NzIwMn0.5qYxEW_Q1JMzgWxYMg9Yzd0b2tF133d9_H1VBV_hBrM";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
