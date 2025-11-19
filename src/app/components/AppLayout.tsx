"use client";
import React from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Home, Users, History } from "lucide-react";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { Logo } from "@/components/icons";
import { Button } from '@/components/ui/button';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
              <SidebarMenuButton asChild isActive={pathname.startsWith('/members')} tooltip="Miembros">
                <Link href="/members">
                  <Users />
                  <span>Miembros</span>
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
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center gap-4 border-b bg-background/50 backdrop-blur-sm p-2 md:hidden">
            <SidebarTrigger/>
            <Link href="/" className="flex items-center gap-2 font-bold font-headline">
                <Logo />
                ReunionStats
            </Link>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
