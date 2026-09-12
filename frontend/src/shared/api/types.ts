/* Declares shared API response shapes consumed across the frontend.
   Feature-specific types can extend these closer to their own folders later. */
export interface ErrorEnvelope {
  error: string;
  detail: string | null;
}
