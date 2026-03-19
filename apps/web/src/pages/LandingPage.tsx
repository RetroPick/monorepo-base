import React from 'react';
import Navbar from '@/landing_components/Navbar';
import Hero from '@/landing_components/Hero';
import About from '@/landing_components/About';
import Footer from '@/landing_components/Footer';

const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white overflow-x-hidden selection:bg-blue-200/50 font-sans">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] mix-blend-multiply"></div>
            </div>

            <div className="relative z-10 flex flex-col">
                <Navbar />
                <main className="flex-grow">
                    <section id="home">
                        <Hero />
                    </section>
                    <section id="about">
                        <About />
                    </section>
                </main>
                <Footer />
            </div>
        </div>
    );
};

export default LandingPage;
