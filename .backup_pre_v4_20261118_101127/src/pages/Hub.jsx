export default function Hub({ title, subtitle, items, onNavigate }) {
  return (
    <div>
      <div className="page-title">{title}</div>
      {subtitle && <div className="page-subtitle">{subtitle}</div>}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
        {items.map((item) => (
          <div 
            key={item.id} 
            className="card" 
            style={{ display: 'flex', alignItems: 'center', padding: '16px', cursor: 'pointer', transition: 'transform 0.2s', borderLeft: `4px solid ${item.color || 'var(--primary)'}` }}
            onClick={() => onNavigate(item.id)}
          >
            <div style={{ fontSize: '2rem', marginRight: '16px' }}>{item.icon}</div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{item.label}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.description}</div>
            </div>
            <div style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>→</div>
          </div>
        ))}
      </div>
    </div>
  );
}
