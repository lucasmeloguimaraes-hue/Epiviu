import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Dashboard />
    </div>
  );
}
