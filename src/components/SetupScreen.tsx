import React, { useState } from 'react';
import { SimulationSettings, IndustryProfile, ReferencePhoto, InteractionFlow } from '../types';

interface Props {
  photos: ReferencePhoto[];
  flows: InteractionFlow[];
  onStart: (settings: SimulationSettings) => void;
  onNavigateToHub: () => void;
  onNavigateToHistory: () => void;
}

const SCENARIOS: Record<IndustryProfile, string[]> = {
  airline: [
    'Flight Delay / Cancellation Rebooking',
    'Baggage Loss, Damage, or Delay',
    'Check-In Assistance (overweight, seat, extras)',
    'Boarding Dispute / Denied Boarding',
    'Seat Upgrade Request',
    'Special Assistance (wheelchair, minor, medical)',
    'Lost Item at Gate / On Board',
    'Visa or Travel Document Issue',
  ],
  bank: [
    'Account Dispute / Unauthorized Transaction',
    'Loan Inquiry or Application',
    'Card Block / Loss / Replacement',
    'Account Opening Assistance',
    'Mortgage or Investment Inquiry',
    'ATM / Online Banking Issue',
    'Fixed Deposit Inquiry',
    'Customer Complaint / Escalation',
  ],
  generic: [
    'General Complaint Resolution',
    'Service Request / Registration',
    'Product / Service Information Inquiry',
    'Return / Exchange / Refund Request',
    'Billing Dispute',
    'Technical Support Request',
    'Appointment / Scheduling Request',
    'Feedback / Escalation Handling',
  ],
};

const PROFILE_ICONS: Record<IndustryProfile, string> = { airline: '✈️', bank: '🏦', generic: '🏢' };
const PROFILE_LABELS: Record<IndustryProfile, string> = { airline: 'Airline', bank: 'Bank', generic: 'Generic' };

export const SetupScreen: React.FC<Props> = ({ photos, flows, onStart, onNavigateToHub, onNavigateToHistory }) => {
  const [settings, setSettings] = useState<SimulationSettings>({
    agentName: '',
    profile: 'airline',
    scenarioType: SCENARIOS.airline[0],
    customerPersona: 'Average',
    voiceGender: 'Random',
    language: 'English',
    agentNotes: '',
    selectedReferenceId: '',
    selectedFlowId: '',
  });

  const set = (key: keyof SimulationSettings, val: any) =>
    setSettings(prev => ({ ...prev, [key]: val }));

  const handleProfileChange = (p: IndustryProfile) => {
    setSettings(prev => ({ ...prev, profile: p, scenarioType: SCENARIOS[p][0], selectedReferenceId: '', selectedFlowId: '' }));
  };

  const handleFlowChange = (flowId: string) => {
    if (!flowId) {
      setSettings(prev => ({ ...prev, selectedFlowId: '', scenarioType: SCENARIOS[prev.profile][0] }));
      return;
    }
    const flow = flows.find(f => f.id === flowId);
    if (flow) {
      setSettings(prev => ({
        ...prev,
        selectedFlowId: flowId,
        scenarioType: flow.name,
      }));
    }
  };

  const canStart = settings.agentName.trim().length > 0 && settings.scenarioType.length > 0;

  return (
    <div className="setup-screen" style={{ height: '100%', overflowY: 'auto' }}>
      <div className="setup-card glass-strong slide-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: 'var(--gold-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Simulate-Presence by Inspiro</div>
            <h1 className="setup-title">Training Setup</h1>
            <p className="setup-subtitle" style={{ marginBottom: 0 }}>Configure your face-to-face interaction simulation session</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={onNavigateToHistory} style={{ fontSize: 11 }}>
              📊 History
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onNavigateToHub} style={{ fontSize: 11 }}>
              ⚙️ Reference Hub
            </button>
          </div>
        </div>

        {/* Industry Profile */}
        <div className="form-group mb-4">
          <label className="form-label">Industry Profile</label>
          <div className="profile-selector">
            {(['airline', 'bank', 'generic'] as IndustryProfile[]).map(p => (
              <div
                key={p}
                className={`profile-card ${settings.profile === p ? `selected ${p}` : ''}`}
                onClick={() => handleProfileChange(p)}
              >
                <div className="profile-card-icon">{PROFILE_ICONS[p]}</div>
                <div className="profile-card-label" style={{ color: settings.profile === p ? undefined : 'var(--text-secondary)' }}>
                  {PROFILE_LABELS[p]}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="setup-grid">
          {/* Agent Name */}
          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input
              className="form-input"
              placeholder="Enter your name"
              value={settings.agentName}
              onChange={e => set('agentName', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Scenario / Flow</label>
            <select
              className="form-select"
              value={settings.selectedFlowId || settings.scenarioType}
              onChange={e => {
                const val = e.target.value;
                if (flows.find(f => f.id === val)) {
                  handleFlowChange(val);
                } else {
                  setSettings(prev => ({ ...prev, selectedFlowId: '', scenarioType: val }));
                }
              }}
            >
              <optgroup label="Standard Scenarios">
                {SCENARIOS[settings.profile].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </optgroup>
              {flows.length > 0 && (
                <optgroup label="Custom Uploaded Scenarios">
                  {flows.map(f => (
                    <option key={f.id} value={f.id}>💬 {f.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Custom Uniform Reference Selection */}
          <div className="form-group">
            <label className="form-label">Compliance Baseline Standard</label>
            <select
              className="form-select"
              value={settings.selectedReferenceId || ''}
              onChange={e => set('selectedReferenceId', e.target.value)}
            >
              <option value="">Default Industry Guidelines</option>
              {photos.map(p => (
                <option key={p.id} value={p.id}>👔 {p.name} ({p.tag})</option>
              ))}
            </select>
          </div>

          {/* Customer Persona */}
          <div className="form-group">
            <label className="form-label">Customer Persona</label>
            <select className="form-select" value={settings.customerPersona} onChange={e => set('customerPersona', e.target.value as any)}>
              <option value="Easy">😊 Easy — Cooperative & Polite</option>
              <option value="Average">😐 Average — Mildly Frustrated</option>
              <option value="Difficult">😤 Difficult — Upset & Demanding</option>
            </select>
          </div>

          {/* Language */}
          <div className="form-group">
            <label className="form-label">Language</label>
            <select className="form-select" value={settings.language} onChange={e => set('language', e.target.value as any)}>
              <option value="English">🇬🇧 English</option>
              <option value="Taglish">🇵🇭 Taglish</option>
              <option value="Bisaya">🇵🇭 Bisaya</option>
            </select>
          </div>

          {/* Voice Gender */}
          <div className="form-group">
            <label className="form-label">AI Customer Voice</label>
            <select className="form-select" value={settings.voiceGender} onChange={e => set('voiceGender', e.target.value as any)}>
              <option value="Random">🎲 Random</option>
              <option value="Female">👩 Female</option>
              <option value="Male">👨 Male</option>
            </select>
          </div>

          {/* Agent Notes */}
          <div className="form-group setup-grid-full">
            <label className="form-label">Agent Notes (optional context)</label>
            <textarea
              className="form-textarea"
              placeholder="Add any special context or notes for this session..."
              value={settings.agentNotes}
              onChange={e => set('agentNotes', e.target.value)}
            />
          </div>
        </div>

        <button
          className="btn btn-gold btn-lg w-full mt-4"
          disabled={!canStart}
          onClick={() => onStart({
            ...settings,
            // If standard scenario was chosen via flow selection
            scenarioType: settings.selectedFlowId
              ? (flows.find(f => f.id === settings.selectedFlowId)?.name || settings.scenarioType)
              : settings.scenarioType,
            voiceGender: settings.voiceGender === 'Random'
              ? (Math.random() > 0.5 ? 'Male' : 'Female')
              : settings.voiceGender,
          })}
        >
          Continue to Pre-Check →
        </button>
        {!canStart && <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Enter your name to continue</p>}
      </div>
    </div>
  );
};
