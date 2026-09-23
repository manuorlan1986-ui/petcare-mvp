import type { Caregiver, ServiceType } from './types';
export const services: {id:ServiceType; title:string; subtitle:string; icon:string; price:number}[] = [
 {id:'walking',title:'Paseo de perros',subtitle:'30 o 60 minutos de atención personalizada.',icon:'🐕',price:25},
 {id:'daycare',title:'Guardería',subtitle:'Un día de juego, compañía y supervisión.',icon:'🏡',price:45},
];
export const demoCaregivers: Caregiver[] = [
 {id:'demo-1',display_name:'Sofía Martínez',city:'Miami',state:'FL',bio:'Amante de los perros, con experiencia en paseos y rutinas activas.',rating:4.9,review_count:38,years_experience:4,services:['walking','daycare'],hourly_rate:25,stripe_onboarding_complete:false},
 {id:'demo-2',display_name:'Carlos Rivera',city:'Miami',state:'FL',bio:'Cuidador certificado en primeros auxilios para mascotas y con patio cercado.',rating:4.8,review_count:27,years_experience:6,services:['daycare'],hourly_rate:45,stripe_onboarding_complete:false},
 {id:'demo-3',display_name:'Emma Johnson',city:'Coral Gables',state:'FL',bio:'Paseos tranquilos, atención individual y comunicación clara con cada familia.',rating:5,review_count:19,years_experience:3,services:['walking'],hourly_rate:28,stripe_onboarding_complete:false},
 {id:'demo-4',display_name:'Daniela Torres',city:'Doral',state:'FL',bio:'Experiencia con perros pequeños y medianos. Disponible entre semana.',rating:4.9,review_count:44,years_experience:5,services:['walking','daycare'],hourly_rate:30,stripe_onboarding_complete:false},
];
