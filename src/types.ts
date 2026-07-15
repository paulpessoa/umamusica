export type MusicStatus =
  | "chatting"
  | "pending_payment"
  | "paid"
  | "lyrics_review"
  | "processing"
  | "completed"
  | "failed"
  | "failed_safety"

export interface ChatMessage {
  sender: "user" | "ai"
  text: string
  timestamp: string
  options?: string[] // quick-reply buttons shown below AI message
}

export interface SongMetadata {
  title: string
  lyrics: string
  style: string
  tempo: string
  vibe: string
  artistName: string
  keyMemories: string[]
  dedicatedTo: string
  // Consistency guardrail: preserved across lyric edits so the audio keeps
  // the same musical identity (seed + style tags + instrumental metadata).
  seed?: number
  style_tags?: string[]
  instrumental_metadata?: {
    style: string
    tempo: string
    vibe: string
  }
}

export interface Order {
  id: string
  email: string
  user_id?: string | null
  chat_transcript: ChatMessage[]
  structured_prompt: string | null
  song_metadata: SongMetadata | null
  payment_id: string
  payment_qr: string
  payment_copia_e_cola: string
  status: MusicStatus
  audio_storage_path: string | null // Supabase storage path (never exposed to user)
  hasAudio?: boolean // true when audio_storage_path exists
  upsell_paid: boolean
  video_url: string | null
  created_at: string
  updated_at: string
}
