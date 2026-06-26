import React, { useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { TopTab } from '../types';
import AcademyView from './AcademyView';
import OpportunitiesTab from './OpportunitiesTab';
import HelpView from './HelpView';

const TOP_TABS: { key: TopTab; label: string }[] = [
  { key: 'opportunities', label: 'Opportunities' },
  { key: 'help', label: 'Help' },
  { key: 'academy', label: 'Academy' },
];

const TopNav: React.FC = () => {
  const [activeTopTab, setActiveTopTab] = useState<TopTab | null>(null);

  if (activeTopTab === 'academy') {
    return <AcademyView onBack={() => setActiveTopTab(null)} />;
  }

  if (activeTopTab === 'opportunities') {
    return <OpportunitiesTab fullscreen onBack={() => setActiveTopTab(null)} />;
  }

  if (activeTopTab === 'help') {
    return <HelpView onBack={() => setActiveTopTab(null)} />;
  }

  return (
    <nav className="top-nav">
      <div className="top-nav-logo">
        <div className="panda-icon">🐼</div>
        {/* <span>Panda<em>Bot</em></span> */}
      </div>

      <div className="top-nav-tabs">
        {TOP_TABS.map(tab => (
          <button
            key={tab.key}
            className={`top-nav-tab ${activeTopTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTopTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="top-nav-actions">
        <button className="icon-btn">
          <Search size={18} />
        </button>
        <button className="icon-btn notification-dot">
          <Bell size={18} />
        </button>
      </div>
    </nav>
  );
};

export default TopNav;
