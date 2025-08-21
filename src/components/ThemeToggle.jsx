import { useState, useEffect } from 'react'

const ThemeToggle = () => {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    // Obtener el tema actual del localStorage o usar 'light' por defecto
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {theme === 'light' ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          )}
        </svg>
      </div>
      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
        <li><button onClick={() => setTheme('light')}>☀️ Claro</button></li>
        <li><button onClick={() => setTheme('dark')}>🌙 Oscuro</button></li>
        <li><button onClick={() => setTheme('cupcake')}>🧁 Cupcake</button></li>
        <li><button onClick={() => setTheme('cyberpunk')}>🤖 Cyberpunk</button></li>
        <li><button onClick={() => setTheme('synthwave')}>🌊 Synthwave</button></li>
      </ul>
    </div>
  )
}

export default ThemeToggle
