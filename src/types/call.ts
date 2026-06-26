export type CallType = "voice" | "video";

export type CallStatus =
  | "idle"
  | "calling"
  | "ringing"
  | "connecting"
  | "connected"
  | "ended"
  | "failed"
  | "busy"
  | "declined"
  | "missed";

export interface CallParticipant {
  id: number;
  name: string;
  avatar?: string;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
  isSpeaking?: boolean;
}

export interface Call {
  id: string;
  channelName: string;
  type: CallType;
  status: CallStatus;
  caller: CallParticipant;
  callee: CallParticipant;
  conversationId: number;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
}

export interface CallState {
  currentCall: Call | null;
  incomingCall: Call | null;
  isInCall: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isVideoEnabled: boolean;
  isFrontCamera: boolean;
  remoteUsers: number[];
}

export interface AgoraConfig {
  appId: string;
  token: string;
  channelName: string;
  uid: number;
}
