export interface Stream {
  id: string;
  youtube_url: string | null;
  video_id: string | null;
  title: string | null;
  status: 'active' | 'paused' | 'closed';
  max_pilots_display: number;
  last_message_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pilot {
  id: number;
  stream_id: string;
  car_number: string;
  driver_name: string | null;
  color: string;
}

export interface VoteResult {
  car_number: string;
  driver_name: string | null;
  color: string;
  count: number;
}

export interface VoteStats {
  totalVotes: number;
  totalVoters: number;
}

export interface VoteResponse {
  results: VoteResult[];
  stats: VoteStats;
}

export interface ChatMessage {
  streamId: string;
  userName: string;
  message: string;
  isVote: boolean;
  carNumber: string | null;
}
