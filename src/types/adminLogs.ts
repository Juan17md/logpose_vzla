export type AdminLogAction =
  | "aprobar_usuario"
  | "cambiar_rol"
  | "cambiar_password"
  | "eliminar_usuario"
  | "actualizar_expiracion";

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
