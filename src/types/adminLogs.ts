export type AdminLogAction =
  | "cambiar_rol"
  | "cambiar_password"
  | "eliminar_usuario"
  | "actualizar_nombre";

export interface AdminLogEntry {
  id: string;
  action: AdminLogAction;
  adminUid: string;
  adminEmail: string;
  targetUid: string;
  targetEmail: string;
  details: string;
  timestamp: string;
}

export interface AdminLogRaw {
  action: AdminLogAction;
  adminUid: string;
  adminEmail: string;
  targetUid: string;
  targetEmail: string;
  details: string;
  timestamp: string;
}
