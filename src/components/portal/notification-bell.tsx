"use client";

import { Bell, CheckCheck } from "lucide-react";
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
        onClick={() => setOpen((current) => !current)}
        aria-label="Abrir avisos"
        aria-expanded={open}
        className="focus-ring relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-forest/12 bg-white text-forest/58 transition hover:border-forest/25 hover:text-forest"
      >
        <Bell size={16} aria-hidden="true" />
        {notifications.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-forest-dark">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="surface-panel absolute right-0 z-50 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden bg-white shadow-[0_16px_45px_rgba(23,41,35,0.14)]">
          <div className="flex items-center justify-between border-b border-forest/10 px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-forest">Avisos</p>
              <p className="mt-0.5 text-[10px] text-forest/42">{notifications.length} não lidos</p>
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => markAllNotificationsReadPortal())}
                className="focus-ring inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-semibold text-forest/58 hover:bg-forest/5 hover:text-forest"
              >
                <CheckCheck size={13} aria-hidden="true" />
                Marcar todos
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-10 text-center text-xs text-forest/45">Nenhum aviso novo.</li>
            ) : (
              notifications.map((notification) => (
                <li key={notification.id} className="border-b border-forest/[0.075] px-4 py-3 last:border-b-0">
                  <p className="text-xs leading-5 text-ink/82">{notification.message}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[10px] text-forest/38">
                      {new Date(notification.created_at).toLocaleString("pt-BR")}
                    </span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => startTransition(() => markNotificationReadPortal(notification.id))}
                      className="focus-ring rounded text-[10px] font-semibold text-forest/55 hover:text-forest"
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
