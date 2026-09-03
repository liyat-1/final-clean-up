import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  MessageSquare,
  Megaphone,
  Mail,
  Bot,
  Send,
  Star,
  ThumbsUp,
  Wallet,
  Users,
  ShieldCheck,
  Building2,
  Upload,
  Activity,
  BedDouble,
  LineChart,
  FileText,
  Hotel,
  MapPin,
  UserCog,
  Bell,
  ClipboardCheck,
  Droplets,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type Item = { title: string; icon: React.ComponentType<{ className?: string }>; active?: boolean };

const GROUPS: { label?: string; items: Item[] }[] = [
  {
    items: [
      { title: "Analytics", icon: BarChart3 },
      { title: "Bookings", icon: CalendarDays },
      { title: "GDS bookings", icon: CalendarDays },
    ],
  },
  {
    label: "Marketing",
    items: [
      { title: "Automated invites", icon: MessageSquare },
      { title: "Automated transactional", icon: BedDouble },
      { title: "Drip campaign", icon: Droplets },
      { title: "Guest responses", icon: ThumbsUp },
      { title: "Before stay", icon: Send },
      { title: "Site abandonment", icon: ClipboardCheck },
      { title: "OTA Buster", icon: Sparkles, active: true },
    ],
  },
  {
    label: "Marketing assets",
    items: [{ title: "Email Templates", icon: Mail }],
  },
  {
    label: "In property",
    items: [
      { title: "Arrivals & In-house", icon: Bell },
      { title: "Messaging", icon: MessageSquare },
      { title: "Announcements", icon: Megaphone },
      { title: "Chatbot", icon: Bot },
      { title: "Direct messages", icon: Send },
    ],
  },
  {
    label: "Guest reviews",
    items: [
      { title: "Review ratings", icon: Star },
      { title: "Guest responses", icon: ThumbsUp },
    ],
  },
  {
    label: "Reports",
    items: [{ title: "Return on investment", icon: Wallet }],
  },
  {
    label: "Account",
    items: [
      { title: "Billing and payments", icon: FileText },
      { title: "User Management", icon: Users },
      { title: "Compliance", icon: ShieldCheck },
      { title: "Hotel details", icon: Building2 },
      { title: "Configure notifications", icon: Bell },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Add guest data", icon: Upload },
      { title: "Usage stats", icon: Activity },
      { title: "Occupancy", icon: CalendarDays },
      { title: "Monthly revenue", icon: LineChart },
      { title: "Monthly OTA conversions", icon: LineChart },
      { title: "Contracts", icon: FileText },
      { title: "Hotels", icon: Hotel },
      { title: "Manage CSM's", icon: UserCog },
      { title: "Hotels by location", icon: MapPin },
      { title: "Dashboard Users", icon: Users },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-1 py-2">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Wyndham Grand
            </p>
            {!collapsed && (
              <p className="truncate text-sm font-semibold">
                <span className="text-primary">223</span> Istanbul Levent
              </p>
            )}
          </div>
          {!collapsed && <ChevronDown className="size-4 shrink-0 text-muted-foreground" />}
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {GROUPS.map((group, gi) => (
          <SidebarGroup key={group.label ?? `g${gi}`}>
            {group.label && !collapsed && (
              <SidebarGroupLabel className="text-[10px] tracking-[0.14em] uppercase">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={`${group.label}-${item.title}`}>
                    <SidebarMenuButton asChild isActive={item.active === true} tooltip={item.title}>
                      <Link to="/" className="flex items-center gap-2">
                        <item.icon className="size-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                    {item.active && !collapsed && (
                      <div className="mt-1 ml-6 space-y-1 border-l border-sidebar-border pl-3">
                        <Link
                          to="/"
                          activeOptions={{ exact: true }}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                          activeProps={{ className: "font-medium text-primary" }}
                        >
                          <i className="size-1.5 rounded-full bg-current" /> Analytics
                        </Link>
                        <Link
                          to="/level-1"
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                          activeProps={{ className: "font-medium text-primary" }}
                        >
                          <i className="size-1.5 rounded-full bg-current" /> Level 1 view
                        </Link>
                        <span className="flex items-center gap-2 text-sm text-muted-foreground">
                          <RouteIcon className="size-3.5" /> Guest Journey
                        </span>
                      </div>
                    )}

                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
