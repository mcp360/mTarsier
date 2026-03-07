export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  client_id: string | null;
  client_name: string | null;
  detail: string;
  config_path: string | null;
}

export type AuditAction =
  | "config_write"
  | "config_write_raw"
  | "config_create"
  | "backup_create"
  | "backup_restore"
  | "backup_delete"
  | "server_add"
  | "server_remove";
