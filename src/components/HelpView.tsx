import React, { useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const HELP_ITEMS = [
  { emoji: '📋', title: 'Programme Information', sub: 'Learnership details, SETA, NQF levels' },
  { emoji: '💸', title: 'Stipend & Payments', sub: 'Payment dates, queries, banking details' },
  { emoji: '📝', title: 'Assessment & Portfolio', sub: 'Evidence submission, deadlines' },
  { emoji: '📅', title: 'Attendance Policy', sub: 'Rules, late arrivals, absences' },
  { emoji: '🔧', title: 'Technical Support', sub: 'App issues, password resets, access' },
  { emoji: '⚖️', title: 'Grievance & Appeals', sub: 'Raise concerns, formal process' },
  { emoji: '🏥', title: 'Health & Wellness', sub: 'EAP services, mental health support' },
  { emoji: '📞', title: 'Contact Admin', sub: 'Reach your programme coordinator' },
];

const FAQ_ITEMS = [
  { q: 'When is my stipend paid?', a: 'Stipends are paid on the 25th of each month. If the 25th falls on a weekend or public holiday, payment is made on the preceding business day.' },
  { q: 'How do I submit portfolio evidence?', a: 'Log into the Learning Portal and navigate to your current module. Upload your evidence files under the "Portfolio" section before the deadline.' },
  { q: 'What is the minimum attendance required?', a: 'You must maintain at least 80% attendance to remain in good standing on the programme. Falling below this may affect your stipend.' },
];

const HelpView: React.FC<Props> = ({ onBack }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--surface-2)', zIndex: 200, overflowY: 'auto' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex' }}>
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 700 }}>Help & Support</h2>
      </div>

      {/* Search */}
      <div className="search-bar">
        🔍
        <input placeholder="Search help topics..." />
      </div>

      {/* Categories */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="section-header"><span className="section-title">Topics</span></div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {HELP_ITEMS.map((item, i) => (
            <div key={i} className="help-item">
              <div className="help-icon">{item.emoji}</div>
              <div style={{ flex: 1 }}>
                <div className="help-title">{item.title}</div>
                <div className="help-sub">{item.sub}</div>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </div>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div style={{ padding: '0 16px 32px' }}>
        <div className="section-header"><span className="section-title">Frequently asked</span></div>
        {FAQ_ITEMS.map((faq, i) => (
          <div
            key={i}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, marginBottom: 8, overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', padding: '14px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{faq.q}</span>
              <span style={{ fontSize: 18, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                {openFaq === i ? '−' : '+'}
              </span>
            </button>
            {openFaq === i && (
              <div style={{
                padding: '0 16px 14px',
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                borderTop: '1px solid var(--border)',
                paddingTop: 12,
              }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HelpView;
