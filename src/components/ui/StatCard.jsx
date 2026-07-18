export default function StatCard({ label, value, sub, color = 'gold' }) {
    return (
        <div className={`stat-card stat-${color}`}>
            <div className="stat-label">{label}</div>
            <div className={`stat-value val-${color}`}>{value}</div>
            {sub && <div className="stat-sub">{sub}</div>}
        </div>
    )
}