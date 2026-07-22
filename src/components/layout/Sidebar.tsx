'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Settings, Zap, ShieldCheck, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarAccount } from './SidebarAccount'

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
      <Link href="/" className="sidebar-brand">KLIPTO</Link>
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
          <>
            <Link
              href="/admin"
              className={cn('nav-item', pathname === '/admin' && 'nav-item--active')}
            >
              <ShieldCheck size={16} />
              <span>Admin</span>
            </Link>
            <Link
              href="/admin/dev"
              className={cn('nav-item', pathname === '/admin/dev' && 'nav-item--active')}
              style={{ fontSize: '0.8125rem' }}
            >
              <Terminal size={16} />
              <span>Dev Console</span>
            </Link>
          </>
        )}
      </nav>
      <div style={{ marginTop: 'auto' }}>
        <SidebarAccount />
      </div>
    </aside>
  )
}
