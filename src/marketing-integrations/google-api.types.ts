export type GoogleProperty = {
  propertyId: string;
  propertyName: string;
  accountId: string;
  accountName: string;
};
export type GoogleTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};
export type GoogleReport = {
  dimensionHeaders?: { name: string }[];
  metricHeaders?: { name: string }[];
  rows?: {
    dimensionValues?: { value: string }[];
    metricValues?: { value: string }[];
  }[];
  metadata?: {
    timeZone?: string;
    subjectToThresholding?: boolean;
    dataLossFromOtherRow?: boolean;
  };
};
export type ReportQuery = {
  dateRanges: { startDate: string; endDate: string }[];
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  orderBys?: (
    | { dimension: { dimensionName: string }; desc?: boolean }
    | { metric: { metricName: string }; desc?: boolean }
  )[];
  limit?: number;
};

export class GoogleApiError extends Error {
  constructor(
    readonly status: number,
    readonly expired = false,
  ) {
    super('Falha na comunicação com o Google.');
  }
}
