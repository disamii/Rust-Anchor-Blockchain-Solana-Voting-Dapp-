import { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

export function CustomDropdown({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select Option" 
}: { 
  options: string[], 
  value: string, 
  onChange: (val: string) => void,
  placeholder?: string 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
      >
        <span className={value ? "text-slate-900 dark:text-white" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

    {isOpen && (
  <div className="absolute bottom-full mb-2 z-50 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
    {options.map((option) => (
      <button
        key={option}
        onClick={() => {
          onChange(option)
          setIsOpen(false)
        }}
        className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300"
      >
        {option}
      </button>
    ))}
  </div>
)}
    </div>
  )
}