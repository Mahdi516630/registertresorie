import { AppUser } from '../types';

export const ADMIN_EMAIL = 'mahdiyacoubali318@gmail.com';
export const ADMIN_DEFAULT_PASS = 'MAHDI8006';

export const INITIAL_USERS: AppUser[] = [
  {
    id: 'usr-admin-01',
    name: 'Mahdi Yacoub Ali',
    email: 'mahdiyacoubali318@gmail.com',
    password: 'MAHDI8006',
    role: 'ADMIN',
    status: 'APPROVED',
    createdAt: '2026-01-01T08:00:00Z',
    approvedAt: '2026-01-01T08:00:00Z',
    approvedBy: 'Système',
    department: 'Trésorie De La Préfecture De Djibouti • Djibouti',
    phone: '+253 77 00 00 01',
  },
];
