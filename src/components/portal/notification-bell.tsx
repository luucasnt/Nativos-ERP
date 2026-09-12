"use client";

import { useState, useTransition } from "react";
import { markAllNotificationsReadPortal, markNotificationReadPortal } from "@/app/portal/actions";

type Notification = {
  id: string;
  message: string;
  created_at: string | Date;
};

export function NotificationBell({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-sm border border-gold/40 px-3 py-1 text-sm text-gold transition hover:bg-gold hover:text-forest"
      >
        Avisos
        {notifications.length > 0 && (
          <span className="ml-1 rounded-full bg-gold px-1.5 text-xs text-forest">
            {notifications.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-sm border border-forest/10 bg-white text-ink shadow-lg">
          <div className="flex items-center justify-between border-b border-forest/10 px-3 py-2">
            <span className="text-sm font-medium text-forest">Avisos</span>
            {notifications.length > 0 && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => markAllNotificationsReadPortal())}
                className="text-xs text-forest/60 underline hover:text-forest"
              >
                Marcar todos como lidos
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-3 py-4 text-sm text-forest/60">Nenhum aviso novo.</li>
            ) : (
              notifications.map((n) => (
                <li key={n.id} className="border-b border-forest/5 px-3 py-2 text-sm last:border-b-0">
                  <p className="text-ink">{n.message}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-forest/50">
                      {new Date(n.created_at).toLocaleString("pt-BR")}
                    </span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => startTransition(() => markNotificationReadPortal(n.id))}
                      className="text-xs text-forest/60 underline hover:text-forest"
                    >
                      Marcar como lido
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
