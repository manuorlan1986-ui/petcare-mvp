export type Role = 'pet_parent' | 'caregiver' | 'admin';
export type ServiceType = 'walking' | 'daycare';
export type Caregiver = { id:string; display_name:string; city:string; state:string; bio:string; avatar_url?:string|null; rating:number; review_count:number; years_experience:number; services:ServiceType[]; hourly_rate:number; stripe_account_id?:string|null; stripe_onboarding_complete?:boolean };
export type Booking = { id:string; service_type:ServiceType; caregiver_id:string; customer_id:string; start_at:string; end_at:string; total_amount:number; platform_fee:number; caregiver_amount:number; status:string; caregiver?:Caregiver };
