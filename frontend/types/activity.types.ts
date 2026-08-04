export interface ActivityScopeCount {
  global: number;
  city: number | null;
}

export interface WorkingOutCount {
  workedOutToday: ActivityScopeCount;
  inProgress: ActivityScopeCount;
  cityName: string | null;
}
