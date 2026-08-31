import { useState } from "react";
import { Menu, X, MonitorDot, Bell, Search } from "lucide-react";
import logo from "../../assets/logo.jpg";

const HOME_URL = "https://roams.cris.org.in/roamsapp/#/iotManagement";

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-2xl border-b border-transparent shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-all duration-300 before:absolute before:inset-x-0 before:bottom-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-indigo-500/20 before:to-transparent">
            <div className="container mx-auto px-6 py-3.5">
                <div className="flex items-center justify-between">
                    {/* Logo Section */}
                    <div className="flex items-center gap-3 cursor-pointer group hover:scale-[1.02] transition-transform duration-300">
                        <img
                            src={logo}
                            alt="CRIS Logo"
                            className="h-12 w-auto group-hover:opacity-90 transition-opacity duration-300 drop-shadow-md rounded-md"
                        />
                        <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-indigo-500 hidden sm:block tracking-tight">
                            CRIS IoT Sensor Dashboard
                        </span>
                    </div>

                    <div className="hidden lg:flex items-center space-x-2">
                        <a href={HOME_URL} className="px-5 py-2.5 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50/80 transition-all hover:bg-indigo-100 shadow-sm border border-indigo-100/50 hover:-translate-y-0.5 hover:shadow-indigo-500/20">Home</a>
                    </div>
                    {/* Right Side Actions */}
                    <div className="hidden md:flex items-center space-x-4">
                        {/* Right side actions removed */}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-4">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-slate-500 hover:text-slate-800 focus:outline-none p-2 rounded-xl hover:bg-slate-100 transition-colors"
                        >
                            {isOpen ? <X size={24} strokeWidth={2} /> : <Menu size={24} strokeWidth={2} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="md:hidden mt-4 pt-4 border-t border-slate-100 pb-2 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="flex flex-col space-y-2">
                            <a href={HOME_URL} className="px-4 py-3 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50 shadow-sm border border-indigo-100/50">Home</a>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
