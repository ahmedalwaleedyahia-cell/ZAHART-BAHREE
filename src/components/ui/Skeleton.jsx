export default function Skeleton({ rows = 4 }) {
    return (
        <div className="skeleton-wrap">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="skeleton-line" style={{ width: `${65 + (i * 7 % 30)}%` }} />
            ))}
        </div>
    )
}