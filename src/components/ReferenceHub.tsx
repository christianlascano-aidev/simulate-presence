import React, { useState } from 'react';
import { ReferencePhoto, InteractionFlow, IndustryProfile } from '../types';
import { Upload, Trash2, ArrowLeft, Plus, FileText, CheckCircle, Brain, User } from 'lucide-react';

interface Props {
  profile: IndustryProfile;
  photos: ReferencePhoto[];
  flows: InteractionFlow[];
  onAddPhoto: (photo: ReferencePhoto) => void;
  onDeletePhoto: (id: string) => void;
  onAddFlow: (flow: InteractionFlow) => void;
  onDeleteFlow: (id: string) => void;
  onBack: () => void;
}

export const ReferenceHub: React.FC<Props> = ({
  profile, photos, flows, onAddPhoto, onDeletePhoto, onAddFlow, onDeleteFlow, onBack,
}) => {
  // Photo states
  const [photoName, setPhotoName] = useState('');
  const [category, setCategory] = useState<'appearance' | 'posture' | 'hands' | 'face'>('appearance');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ tag: string; analysis: string } | null>(null);

  // Flow states
  const [flowName, setFlowName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [mainIssue, setMainIssue] = useState('');
  const [transactionDetails, setTransactionDetails] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');

  // Handle Image Selection & Conversion
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageSrc(reader.result as string);
      setAnalysisResult(null);
    };
    reader.readAsDataURL(file);
  };

  // Trigger Gemini Analysis on Reference Photo
  const handleAnalyzePhoto = async () => {
    if (!imageSrc) return;
    setAnalyzing(true);
    try {
      const resp = await fetch('/api/analyze-reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageSrc, category, profile }),
      });
      const data = await resp.json();
      setAnalysisResult({
        tag: data.tag || `${category.toUpperCase()}-Standard-Ref`,
        analysis: data.analysis || 'Neat visual alignment baseline.',
      });
    } catch (err) {
      console.error('Error analyzing reference:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Save the Reference Standard
  const handleSavePhoto = () => {
    if (!imageSrc || !analysisResult) return;
    const newPhoto: ReferencePhoto = {
      id: Date.now().toString(),
      name: photoName || analysisResult.tag,
      category,
      tag: analysisResult.tag,
      imageSrc,
      analysis: analysisResult.analysis,
      createdAt: new Date().toLocaleDateString(),
    };
    onAddPhoto(newPhoto);
    // Reset photo states
    setPhotoName('');
    setImageSrc(null);
    setAnalysisResult(null);
  };

  // Save Custom Interaction Flow
  const handleSaveFlow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flowName || !mainIssue) return;
    const newFlow: InteractionFlow = {
      id: Date.now().toString(),
      name: flowName,
      customerName,
      mainIssue,
      transactionDetails,
      customInstructions,
      createdAt: new Date().toLocaleDateString(),
    };
    onAddFlow(newFlow);
    // Reset flow states
    setFlowName('');
    setCustomerName('');
    setMainIssue('');
    setTransactionDetails('');
    setCustomInstructions('');
  };

  // Filter photos by current industry profile
  const currentProfilePhotos = photos;

  return (
    <div className="feedback-screen slide-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={14} /> Back to Setup
        </button>
        <div>
          <h2 className="setup-title" style={{ margin: 0, fontSize: 24 }}>⚙️ Company Reference & Scenario Hub</h2>
          <p className="setup-subtitle" style={{ margin: 0, fontSize: 12 }}>Configure visual compliance benchmarks and custom interaction flows</p>
        </div>
      </div>

      <div className="setup-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left Column: Visual Compliance Standards (Photos) */}
        <div className="glass-strong" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 className="feedback-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>👔</span> Visual Compliance Standards
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Upload ideal reference photos. Gemini will extract compliance markers (dress code, posture, smiles) to compare against during training audits.
          </p>

          {/* Form */}
          <div className="form-group">
            <label className="form-label">Reference Standard Name</label>
            <input
              type="text"
              placeholder="e.g. Airline Class A Winter Uniform"
              className="form-input"
              value={photoName}
              onChange={(e) => setPhotoName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Analysis Target Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
            >
              <option value="appearance">Uniform Attire & Dress Code</option>
              <option value="posture">Posture & Spine Stance</option>
              <option value="hands">Hand Placement & Gesturing</option>
              <option value="face">Facial Expression & Smile</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Upload Photo</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label className="btn btn-ghost" style={{ cursor: 'pointer', flex: 1 }}>
                <Upload size={16} /> Choose Image File
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </label>
              {imageSrc && (
                <div style={{ width: 60, height: 60, borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <img src={imageSrc} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>
          </div>

          {imageSrc && !analysisResult && (
            <button
              className="btn btn-gold w-full"
              onClick={handleAnalyzePhoto}
              disabled={analyzing}
            >
              {analyzing ? '🧠 Analyzing visual markers...' : '🔍 Analyze with Gemini'}
            </button>
          )}

          {analysisResult && (
            <div className="glass" style={{ padding: 14, background: 'rgba(212,175,55,0.04)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Brain size={14} className="text-gold" />
                <strong style={{ fontSize: 12, color: 'var(--gold-light)' }}>Proposed ID Tag: {analysisResult.tag}</strong>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {analysisResult.analysis}
              </p>
              <button className="btn btn-emerald w-full mt-2" onClick={handleSavePhoto}>
                <CheckCircle size={14} /> Save to Training Standards
              </button>
            </div>
          )}

          {/* List of Photos */}
          <div style={{ marginTop: 12 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Saved Standards</h4>
            {currentProfilePhotos.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 16, border: '1px dashed var(--border)', borderRadius: 8 }}>
                No custom baseline standards uploaded yet. Defaults will be used.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                {currentProfilePhotos.map(p => (
                  <div key={p.id} className="glass" style={{ padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                      <img src={p.imageSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }} className="truncate">{p.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tag: {p.tag} · {p.category.toUpperCase()}</div>
                    </div>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDeletePhoto(p.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interaction Flows */}
        <div className="glass-strong" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 className="feedback-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>💬</span> Custom Interaction Flows
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Design custom training scenarios. Provide key details so the AI customer roleplays booking changes, service disputes, or customer cases exactly as desired.
          </p>

          <form onSubmit={handleSaveFlow} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Flow / Scenario Name</label>
              <input
                type="text"
                placeholder="e.g. VIP Booking Upgrade Dispute"
                className="form-input"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="e.g. Passenger Smith"
                    className="form-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{ paddingLeft: 30 }}
                  />
                  <User size={12} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Transaction / Booking Details</label>
                <input
                  type="text"
                  placeholder="e.g. Flight QR987 / Booking Ref XYZ123"
                  className="form-input"
                  value={transactionDetails}
                  onChange={(e) => setTransactionDetails(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Main Concern / Issue Description</label>
              <textarea
                placeholder="Describe the passenger's core issue (e.g. Flight is cancelled due to weather, but passenger is traveling for an urgent wedding and demands rebooking on a competitor airline)."
                className="form-textarea"
                value={mainIssue}
                onChange={(e) => setMainIssue(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Special AI Customer Instructions (Optional)</label>
              <textarea
                placeholder="e.g. Be very stubborn, do not accept airline vouchers immediately. Require the agent to call their supervisor first."
                className="form-textarea"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={2}
              />
            </div>

            <button type="submit" className="btn btn-gold w-full mt-2">
              <Plus size={14} /> Add Scenario Flow
            </button>
          </form>

          {/* List of Flows */}
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Configured Scenarios</h4>
            {flows.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 16, border: '1px dashed var(--border)', borderRadius: 8 }}>
                No custom interaction scenarios configured. Simulator will default to standard cases.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                {flows.map(f => (
                  <div key={f.id} className="glass" style={{ padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div className="btn-icon bg-airline-gold/10" style={{ pointerEvents: 'none' }}>
                      <FileText size={14} className="text-gold" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }} className="truncate">{f.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }} className="truncate">Customer: {f.customerName || 'N/A'} · Issue: {f.mainIssue}</div>
                    </div>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDeleteFlow(f.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
