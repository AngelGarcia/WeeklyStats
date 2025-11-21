"use client";
import React from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Home, Users, History, Settings, User as UserIcon, BarChart, Shuffle } from "lucide-react";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { Logo } from "@/components/icons";
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/firebase';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="shrink-0">
              <Logo />
            </Button>
            <span className="text-lg font-headline font-semibold group-data-[collapsible=icon]:hidden">ReunionStats</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="Reunión Actual">
                <Link href="/">
                  <Home />
                  <span>Reunión Actual</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/stats')} tooltip="Estadísticas">
                <Link href="/stats">
                  <BarChart />
                  <span>Estadísticas</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/history')} tooltip="Historial">
                <Link href="/history">
                  <History />
                  <span>Historial</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/members')} tooltip="Miembros">
                <Link href="/members">
                  <Users />
                  <span>Miembros</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/settings')} tooltip="Configuración">
                <Link href="/settings">
                  <Settings />
                  <span>Configuración</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between gap-4 border-b bg-background/50 backdrop-blur-sm p-2">
            <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden"/>
                <Link href="/" className="hidden md:flex items-center gap-2 font-bold font-headline">
                    <Logo />
                    ReunionStats
                </Link>
            </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
