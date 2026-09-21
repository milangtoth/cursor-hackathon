"use client";

import { useEffect } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AskTrigger() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Button
      type="button"
      variant="outline"
      className="text-muted-foreground w-full max-w-sm justify-start"
    >
      <Search data-icon="inline-start" />
      Ask your materials
      <kbd className="bg-muted text-muted-foreground pointer-events-none ml-auto rounded-md border px-1.5 font-mono text-[10px] font-medium">
        ⌘K
      </kbd>
    </Button>
  );
}
