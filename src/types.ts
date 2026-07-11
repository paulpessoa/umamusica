export type MusicStatus = 'chatting' | 'pending_payment' | 'paid' | 'processing' | 'completed' | 'failed';

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface SongMetadata {
  title: string;
  lyrics: string;
  style: string;
  tempo: string;
  vibe: string;
  artistName: string;
  keyMemories: string[];
  dedicatedTo: string;
}

export interface Order {
  id: string;
  email: string;
  chat_transcript: ChatMessage[];
  structured_prompt: string | null;
  song_metadata: SongMetadata | null;
  payment_id: string;
  payment_qr: string; // Base64 or copyable payload
  payment_copia_e_cola: string;
  status: MusicStatus;
  audio_url: string | null;
  upsell_paid: boolean;
  video_url: string | null;
  created_at: string;
  updated_at: string;
}
