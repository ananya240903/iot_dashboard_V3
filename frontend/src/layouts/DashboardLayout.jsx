import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import Sidebar from '../components/Sidebar/Sidebar';

export default function DashboardLayout() {
  return (
    <div className="h-screen bg-slate-100/50 flex flex-col transition-colors duration-300">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Content Area — active route renders here */}
        <main className="flex-1 overflow-hidden p-8 relative flex flex-col">
          <div className="max-w-[1600px] mx-auto w-full h-full flex flex-col overflow-y-auto custom-scrollbar">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
