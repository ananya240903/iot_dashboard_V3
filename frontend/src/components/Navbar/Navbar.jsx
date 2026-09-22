import { useState } from "react";
import { Menu, X } from "lucide-react";
import logo from "../../assets/logo.jpg";

const HOME_URL = "https://roams.cris.org.in/roamsapp/#/iotManagement";

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-2xl border-b border-[rgba(121,151,188,0.16)] shadow-[0_6px_24px_rgba(56,93,138,0.08)] transition-all duration-300 before:absolute before:inset-x-0 before:bottom-0 before:h-[2px] before:bg-linear-to-r before:from-transparent before:via-[rgba(79,129,189,0.35)] before:to-transparent">
            <div className="container mx-auto px-6 py-3.5">
                <div className="flex items-center justify-between">
                    {/* Logo Section */}
                    <div className="flex items-center gap-3 cursor-pointer group hover:scale-[1.02] transition-transform duration-300">
                        <img
                            src={logo}
                            alt="CRIS Logo"
                            className="h-12 w-auto group-hover:opacity-90 transition-opacity duration-300 drop-shadow-md rounded-md"
                        />
                        <span className="text-xl font-black bg-clip-text text-transparent bg-linear-to-r from-[var(--color-office-blue-dark)] via-[var(--color-office-blue)] to-[var(--color-office-purple)] hidden sm:block tracking-tight">
                            CRIS IoT Sensor Dashboard
                        </span>
                    </div>

                    <div className="hidden lg:flex items-center space-x-2">
                        <a href={HOME_URL} className="px-5 py-2.5 rounded-xl text-sm font-bold text-[var(--color-office-blue-dark)] bg-[rgba(220,230,242,0.78)] transition-all hover:bg-[rgba(220,230,242,0.96)] shadow-sm border border-[rgba(79,129,189,0.18)] hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(79,129,189,0.16)]">Home</a>
                    </div>
                    {/* Right Side Actions */}
                    <div className="hidden md:flex items-center space-x-4">
                        {/* Right side actions removed */}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-4">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-slate-500 hover:text-[var(--color-office-blue-dark)] focus:outline-none p-2 rounded-xl hover:bg-[rgba(220,230,242,0.7)] transition-colors"
                        >
                            {isOpen ? <X size={24} strokeWidth={2} /> : <Menu size={24} strokeWidth={2} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="md:hidden mt-4 pt-4 border-t border-[rgba(121,151,188,0.14)] pb-2 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="flex flex-col space-y-2">
                            <a href={HOME_URL} className="px-4 py-3 rounded-xl text-sm font-bold text-[var(--color-office-blue-dark)] bg-[rgba(220,230,242,0.82)] shadow-sm border border-[rgba(79,129,189,0.18)]">Home</a>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
