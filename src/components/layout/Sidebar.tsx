'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { LayoutDashboard, Settings, Zap, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upgrade', label: 'Upgrade', icon: Zap },
  { href: '/configs', label: 'Channels', icon: Settings },
]

interface SidebarProps {
  showAdmin?: boolean
}

export default function Sidebar({ showAdmin = false }: SidebarProps) {
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
        {showAdmin && (
          <Link
            href="/admin"
            className={cn('nav-item', pathname === '/admin' && 'nav-item--active')}
          >
            <ShieldCheck size={16} />
            <span>Admin</span>
          </Link>
        )}
      </nav>
      <div style={{ marginTop: 'auto', padding: '1rem' }}>
        <UserButton />
      </div>
    </aside>
  )
}
