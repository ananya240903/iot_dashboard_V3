import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import Sidebar from '../components/Sidebar/Sidebar';

export default function DashboardLayout() {
  return (
    <div className="h-screen flex flex-col transition-colors duration-300 bg-[radial-gradient(circle_at_top_left,rgba(79,129,189,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(128,100,162,0.1),transparent_22%),linear-gradient(180deg,#f9fbfe_0%,#f1f5fb_100%)]">
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
