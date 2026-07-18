// Topbar version (compact)
import { Sun, Moon } from 'lucide-react'
export default function TopbarThemeToggle({ isDark, onToggle }) {
  return (
    <button
      className={`theme-capsule theme-capsule-topbar ${isDark ? 'theme-capsule-dark' : 'theme-capsule-light'}`}
      onClick={onToggle}
      title={isDark ? 'Light Mode' : 'Dark Mode'}
      aria-label="Toggle theme"
      role="switch"
      aria-checked={!isDark}
    >
      <span className="theme-capsule-track">
        <span className="theme-capsule-knob">
          {isDark ? <Moon size={10} strokeWidth={2.5} /> : <Sun size={10} strokeWidth={2.5} />}
        </span>
        <span className="theme-capsule-sun"><Sun size={9} strokeWidth={2} /></span>
        <span className="theme-capsule-moon"><Moon size={9} strokeWidth={2} /></span>
      </span>
    </button>
  )
}