/* Declares public profile response shapes local to the profile feature. */
import type { PublicListingProjection } from '../publish/types';

export interface ProfileResponse {
  handle: string;
  business_name: string;
  service_area: string;
  listings: PublicListingProjection[];
}
