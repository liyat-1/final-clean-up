import { Bell, Globe, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function TopBar() {
  const [demo, setDemo] = useState(true);
  const [asClient, setAsClient] = useState(false);
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface-2/80 backdrop-blur-md">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="shrink-0" />
          <span className="truncate text-base font-semibold">OTA Buster</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden items-center gap-2 md:flex">
            <Switch id="demo" checked={demo} onCheckedChange={setDemo} />
            <Label htmlFor="demo" className="text-sm text-muted-foreground">
              Demo mode
            </Label>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <Switch id="asClient" checked={asClient} onCheckedChange={setAsClient} />
            <Label htmlFor="asClient" className="text-sm text-muted-foreground">
              View as client
            </Label>
          </div>
          <span className="num hidden text-sm text-muted-foreground sm:block">{time}</span>
          <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-primary">
            <Globe className="size-4" />
          </span>
          <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-ceiling">
            <UserRound className="size-4" />
          </span>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Bell className="size-4" />
          </span>
        </div>
      </div>
    </header>
  );
}
