import { useState } from 'react';

const stages = ['Group Stage', 'Round of 32', 'Quarter Final', 'World Cup Winner'];

export default function StageTabs() {
  const [activeStage, setActiveStage] = useState(0);

  return (
    <section className="bg-[#F5F5F5] px-4 lg:px-6 pb-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-full p-1 border border-[#E0E0E0]">
          {stages.map((stage, idx) => (
            <button
              key={stage}
              onClick={() => setActiveStage(idx)}
              className={`px-4 py-2 text-[13px] font-semibold rounded-full transition-all ${
                idx === activeStage
                  ? 'bg-[#33691E] text-white'
                  : 'text-[#666] hover:text-[#1A1A1A]'
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {stage}
            </button>
          ))}
        </div>

        {/* Badge */}
        <div className="flex items-center gap-2 text-[12px] text-[#666]" style={{ fontFamily: 'Inter, sans-serif' }}>
          <span>World Cup Prediction on</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-[#1A1A1A] rounded-sm flex items-center justify-center">
              <div className="w-2 h-2 border-2 border-white rounded-full" />
            </div>
            <span className="font-bold text-[#1A1A1A]">OPINION</span>
          </div>
        </div>
      </div>
    </section>
  );
}
