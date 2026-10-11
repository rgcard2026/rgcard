export default function LoadingDashboard() {
  return (
    <div className="ui-root" style={{ padding: 'clamp(16px, 3vw, 36px)' }}>
      <div className="ui-dash">
        <div className="ui-skeleton" style={{ aspectRatio: 'auto', height: 150 }} />
        <div className="ui-dash-kpis">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="ui-skeleton" style={{ aspectRatio: 'auto', height: 132 }} />)}
        </div>
        <div className="ui-dash-grid">
          <div className="ui-skeleton" style={{ aspectRatio: 'auto', height: 320 }} />
          <div className="ui-skeleton" style={{ aspectRatio: 'auto', height: 320 }} />
        </div>
      </div>
    </div>
  );
}
