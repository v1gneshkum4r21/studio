
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, FileSpreadsheet, Settings, BotMessageSquare, History, Package, Network } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Processing', icon: FileSpreadsheet },
  { href: '/accuracy', label: 'AI Accuracy', icon: BotMessageSquare },
  { href: '/history', label: 'Run History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/api-docs', label: 'API Docs', icon: Network },
];

export default function Header() {
  const pathname = usePathname();

  const NavLinks = ({ inSheet = false }: { inSheet?: boolean }) => (
    <nav
      className={cn(
        'flex items-center gap-4 lg:gap-6',
        inSheet ? 'flex-col space-y-2 items-start' : 'hidden md:flex'
      )}
    >
      {navItems.map((item) => (
        <Button
          key={item.href}
          variant={pathname === item.href ? 'secondary' : 'ghost'}
          asChild
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            pathname === item.href ? 'text-primary' : 'text-muted-foreground',
            inSheet && 'w-full justify-start'
          )}
        >
          <Link href={item.href}>
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
          </Link>
        </Button>
      ))}
    </nav>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Package className="h-7 w-7 text-primary" />
          <span className="font-headline text-2xl font-bold text-primary">ExcelFlow</span>
        </Link>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <div className="grid gap-4 py-6">
                <Link href="/" className="flex items-center gap-2 mb-4">
                  <Package className="h-7 w-7 text-primary" />
                  <span className="font-headline text-2xl font-bold text-primary">ExcelFlow</span>
                </Link>
                <NavLinks inSheet={true} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <NavLinks />
      </div>
    </header>
  );
}
