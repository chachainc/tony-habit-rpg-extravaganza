import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, HeartPulse } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { HealthOverview } from './HealthOverview';
import { WorkoutTrends } from './WorkoutTrends';
import { SleepReadinessTrends } from './SleepReadinessTrends';
import { ProgressPhotosSection } from './ProgressPhotosSection';
import { MealPhotosSection } from './MealPhotosSection';

import './HealthTracker.css';

export const HealthTracker = () => {
    const navigate = useNavigate();

    return (
        <div className="health-tracker" style={{ paddingBottom: '120px' }}>
            <div className="health-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-dark)', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button className="health-back-btn" onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                    <ArrowLeft size={20} />
                </button>
                <div className="health-header__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <HeartPulse size={24} color="#ef4444" />
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Health Dashboard</h2>
                </div>
            </div>

            <div className="health-dashboard-scroll" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <HealthOverview />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <WorkoutTrends />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <SleepReadinessTrends />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <MealPhotosSection />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <ProgressPhotosSection />
                </motion.div>
            </div>
        </div>
    );
};
