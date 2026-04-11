"use client";
import { useState, useCallback } from "react";

export type NotificationType =
  | "donation_status"
  | "new_point"
  | "tip"
  | "system";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: Date;
}

// Dados iniciais mockados — substituir por fetch GET /notifications quando o endpoint existir (Milestone 5)
const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-1",
    type: "donation_status",
    title: "Doação coletada!",
    body: "Sua doação VGO-001 (Kit Inverno) foi coletada pela ONG Caminho da Luz.",
    href: "/rastreio/1",
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h atrás
  },
  {
    id: "notif-2",
    type: "new_point",
    title: "Novo ponto próximo a você",
    body: "Centro de Coleta Leste abriu a 1,2 km de você. Aceita roupas e calçados.",
    href: "/mapa",
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5h atrás
  },
  {
    id: "notif-3",
    type: "tip",
    title: "Dica de doação",
    body: "Agasalhos de inverno têm alta demanda agora. Quer registrar uma doação?",
    href: "/doar",
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 dia atrás
  },
  {
    id: "notif-4",
    type: "donation_status",
    title: "Doação entregue à ONG ✅",
    body: "Sua doação VGO-001 chegou ao destino final. Obrigado pelo impacto!",
    href: "/rastreio/1",
    read: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 dias atrás
  },
  {
    id: "notif-5",
    type: "system",
    title: "Bem-vindo ao VestGO!",
    body: "Cadastro realizado com sucesso. Comece sua primeira doação agora mesmo.",
    href: "/doar",
    read: true,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 dias atrás
  },
];

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(
    INITIAL_NOTIFICATIONS,
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const preview = notifications.slice(0, 2);

  return { notifications, unreadCount, preview, markAsRead, markAllAsRead };
}
