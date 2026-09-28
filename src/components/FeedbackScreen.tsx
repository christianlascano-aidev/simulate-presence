import React, { useMemo } from 'react';
import { FeedbackData, SimulationSettings, CommunicationFeedbackDetail } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  feedback: FeedbackData;
  settings: SimulationSettings;
  duration: string;
  onNewSession: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  greeting_and_opening: 'Greeting & Opening',
  active_listening_and_understanding: 'Active Listening',
  empathy_and_tone: 'Empathy & Tone',
  problem_solving_and_resolution: 'Problem Solving',
  communication_clarity: 'Communication Clarity',
  compliance_and_accuracy: 'Compliance & Accuracy',
  documentation_and_note_taking: 'Documentation & Notes',
  closing: 'Closing',
};

const PROFILE_ICONS: Record<string, string> = { airline: '✈️', bank: '🏦', generic: '🏢' };

const scoreClass = (score: number, max: number) => {
  const pct = (score / max) * 100;
  if (pct >= 75) return 'good';
  if (pct >= 50) return 'avg';
  return 'poor';
};

export const FeedbackScreen: React.FC<Props> = ({ feedback, settings, duration, onNewSession }) => {
  const { presence_summary, overall_score, overall_communication_score, overall_communication_summary, communication, customer_name_detected } = feedback;

  const chartData = useMemo(() =>
    presence_summary.snapshots.map((s, i) => ({
      time: `${Math.round(i * 5)}s`,
      posture: s.postureScore,
      facial: s.facialScore,
      grooming: s.groomingScore,
    })), [presence_summary.snapshots]);

  const handleDownload = () => {
    const text = [
      `SIMULATE PRESENCE — SESSION REPORT`,
      `=`.repeat(60),
      `Agent: ${settings.agentName}`,
      `Profile: ${settings.profile}`,
      `Scenario: ${settings.scenarioType}`,
      `Customer: ${customer_name_detected || 'N/A'}  |  Persona: ${settings.customerPersona}`,
      `Duration: ${duration}  |  Language: ${settings.language}`,
      ``,
      `OVERALL SCORE: ${overall_score}/100`,
      `  Communication (60%): ${overall_communication_score}/100`,
      `  Presence (40%): ${presence_summary.presenceScore}/100`,
      `    Posture: ${presence_summary.postureAvg}/100`,
      `    Facial: ${presence_summary.facialAvg}/100`,
      `    Grooming: ${presence_summary.groomingAvg}/100`,
      ``,
      `COMMUNICATION SUMMARY:`,
      overall_communication_summary,
      ``,
      `COMMUNICATION CATEGORIES:`,
      ...(Object.entries(communication) as [string, CommunicationFeedbackDetail][])
        .filter(([, v]) => !v.not_applicable)
        .map(([k, v]) => [
          ``,
          `${CATEGORY_LABELS[k] || k} — ${v.score}/${v.max_score}`,
          v.explanation,
          v.positive.length ? `  ✅ ${v.positive.join('\n  ✅ ')}` : '',
          v.improvement.length ? `  ⚠️ ${v.improvement.join('\n  ⚠️ ')}` : '',
          v.recommended_scripts.length ? `  💬 ${v.recommended_scripts.join('\n  💬 ')}` : '',
        ].join('\n')),
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-report-${settings.agentName.replace(/\s+/g, '-')}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const overallColor = overall_score >= 75 ? 'var(--emerald)' : overall_score >= 50 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="feedback-screen">
      {/* Hero */}
      <div className="feedback-hero slide-up">
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Session Complete
        </div>
        <div className="feedback-overall-score" style={{ background: `linear-gradient(135deg, ${overallColor}, ${overallColor}88)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {overall_score}
        </div>
        <div className="feedback-score-label">OVERALL SCORE / 100</div>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Outfit', color: 'var(--sky)' }}>{overall_communication_score}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Communication (60%)</div>
          </div>
          <div style={{ width: 1, background: 'var(--border)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Outfit', color: 'var(--gold)' }}>{presence_summary.presenceScore}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Presence (40%)</div>
          </div>
        </div>
        <p className="feedback-summary">{overall_communication_summary}</p>
      </div>

      {/* Meta bar */}
      <div className="feedback-meta-bar">
        {[
          { label: 'Profile', value: `${PROFILE_ICONS[settings.profile]} ${settings.profile}` },
          { label: 'Scenario', value: settings.scenarioType.substring(0, 28) },
          { label: 'Duration', value: duration },
          { label: 'Language', value: settings.language },
          { label: 'Persona', value: settings.customerPersona },
          ...(customer_name_detected ? [{ label: 'Customer', value: customer_name_detected }] : []),
        ].map(t => (
          <div key={t.label} className="feedback-meta-tile">
            <div className="feedback-meta-tile-label">{t.label}</div>
            <div className="feedback-meta-tile-value">{t.value}</div>
          </div>
        ))}
      </div>

      {/* Communication section */}
      <div className="feedback-section-title">💬 Communication Assessment</div>
      <div className="comm-categories">
        {(Object.entries(communication) as [string, CommunicationFeedbackDetail][])
          .filter(([, v]) => !v.not_applicable)
          .map(([key, detail]) => (
            <div key={key} className="category-card">
              <div className="category-header">
                <span className="category-name">{CATEGORY_LABELS[key] || key.replace(/_/g, ' ')}</span>
                <span className={`category-score-pill ${scoreClass(detail.score, detail.max_score)}`}>
                  {detail.score}/{detail.max_score}
                </span>
              </div>
              {detail.explanation && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>{detail.explanation}</p>
              )}
              <ul className="category-points">
                {detail.positive.map((p, i) => (
                  <li key={`p${i}`}><span className="icon" style={{ color: 'var(--emerald)' }}>✅</span>{p}</li>
                ))}
                {detail.improvement.map((p, i) => (
                  <li key={`i${i}`}><span className="icon" style={{ color: 'var(--amber)' }}>⚠️</span>{p}</li>
                ))}
              </ul>
              {detail.recommended_scripts.length > 0 && (
                <div className="script-box">
                  {detail.recommended_scripts.map((s, i) => (
                    <p key={i} style={{ marginTop: i > 0 ? 4 : 0 }}>💬 {s}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Presence section */}
      <div className="feedback-section-title">🎭 Presence Assessment</div>
      <div className="presence-pillars">
        <div className="presence-pillar">
          <div className="presence-pillar-icon">🧍</div>
          <div className="presence-pillar-score">{presence_summary.postureAvg}</div>
          <div className="presence-pillar-label">Posture & Stance</div>
          <div className="weight-label">MediaPipe tracking</div>
        </div>
        <div className="presence-pillar">
          <div className="presence-pillar-icon">😊</div>
          <div className="presence-pillar-score">{presence_summary.facialAvg}</div>
          <div className="presence-pillar-label">Facial Engagement</div>
          <div className="weight-label">Smile · Gaze · Approachability</div>
        </div>
        <div className="presence-pillar">
          <div className="presence-pillar-icon">👔</div>
          <div className="presence-pillar-score">{presence_summary.groomingAvg}</div>
          <div className="presence-pillar-label">Appearance / Grooming</div>
          <div className="weight-label">Gemini AI vision audit</div>
        </div>
      </div>

      {/* Presence chart */}
      {chartData.length > 0 && (
        <div style={{ height: 180, marginBottom: 28, width: '100%', minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gPosture" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gFacial" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f472b6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gGrooming" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#4a607f' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#4a607f' }} />
              <Tooltip contentStyle={{ background: '#111c32', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="posture" stroke="#38bdf8" fill="url(#gPosture)" strokeWidth={2} name="Posture" />
              <Area type="monotone" dataKey="facial" stroke="#f472b6" fill="url(#gFacial)" strokeWidth={2} name="Facial" />
              <Area type="monotone" dataKey="grooming" stroke="#D4AF37" fill="url(#gGrooming)" strokeWidth={2} name="Grooming" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', paddingBottom: 32 }}>
        <button className="btn btn-ghost" onClick={handleDownload}>⬇ Download Report</button>
        <button className="btn btn-gold btn-lg" onClick={onNewSession}>🔄 New Training Session</button>
      </div>
    </div>
  );
};
