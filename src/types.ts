export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
}

export interface StandingEntry {
  teamId: string;
  teamName: string;
  points: number;
  played: number;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
  time: string;
  status: 'scheduled' | 'finished' | 'live';
  mvpVotes: number;
  matchday?: number;
}

export interface Group {
  id: string;
  name: string;
}

export type ViewType = 'home' | 'standings' | 'results' | 'admin';
