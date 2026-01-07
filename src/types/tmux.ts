// Types matching the Rust backend structs

export type SessionHealth = 'active' | 'processing' | 'idle' | 'stuck'

export interface TmuxSession {
  name: string
  windows: number
  attached: boolean
  activity: number | null
}

export interface TmuxPane {
  session_name: string
  window_index: number
  window_name: string
  pane_index: number
  pane_id: string
  pane_active: boolean
  pane_current_command: string
  pane_pid: number
}

export interface TmuxSessionDetail {
  session: TmuxSession
  panes: TmuxPane[]
  health: SessionHealth
  connection_string: string
}

export interface CommandResult {
  stdout: string
  stderr: string
  exit_code: number
}
