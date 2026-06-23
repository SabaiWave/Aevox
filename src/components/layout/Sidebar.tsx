'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { LayoutDashboard, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/configs', label: 'Configs', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Klipto</div>
      <nav>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn('nav-item', pathname === href && 'nav-item--active')}
          >
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div style={{ marginTop: 'auto', padding: '1rem' }}>
        <UserButton />
      </div>
    </aside>
  )
}
