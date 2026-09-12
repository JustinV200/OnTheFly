/* Declares the /api/demo/status response shape (backend app/services/demo/status.py). */
export interface DemoStatus {
  financial: {
    transaction_source: string;
    provenance: string[];
    has_production_data: boolean;
  };
  offers: {
    total: number;
    genuine: number;
    captured_off_platform: number;
    demo: number;
    all_simulated: boolean;
  };
}
