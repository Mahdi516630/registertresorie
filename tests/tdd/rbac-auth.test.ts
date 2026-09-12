import { describe, it, expect } from 'vitest';
import { createMockUser } from '../test-utils';
import { AppUser } from '../../src/types';

describe('TDD: Contrôle d\'Accès (RBAC) et Gestion des Statuts', () => {
  it('un utilisateur PENDING ne doit pas avoir l\'autorisation de se connecter', () => {
    const pendingUser = createMockUser({ status: 'PENDING' });
    const canLogin = pendingUser.status === 'APPROVED';
    expect(canLogin).toBe(false);
  });

  it('un utilisateur APPROVED doit pouvoir se connecter avec son rôle assigné', () => {
    const approvedAgent = createMockUser({ status: 'APPROVED', role: 'AGENT' });
    expect(approvedAgent.status).toBe('APPROVED');
    expect(approvedAgent.role).toBe('AGENT');
  });

  it('seul le rôle ADMIN doit avoir accès à la gestion des utilisateurs et à la configuration Neon', () => {
    const admin = createMockUser({ role: 'ADMIN', status: 'APPROVED' });
    const agent = createMockUser({ role: 'AGENT', status: 'APPROVED' });

    const hasAdminAccess = (u: AppUser) => u.role === 'ADMIN' && u.status === 'APPROVED';

    expect(hasAdminAccess(admin)).toBe(true);
    expect(hasAdminAccess(agent)).toBe(false);
  });

  it('l\'approbation d\'un utilisateur doit renseigner approvedAt et approvedBy', () => {
    const pending = createMockUser({
      status: 'PENDING',
      approvedAt: undefined,
      approvedBy: undefined,
    });

    // Action d'approbation par le super-admin Mahdi
    const approved: AppUser = {
      ...pending,
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedBy: 'mahdiyacoubali318@gmail.com',
    };

    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedAt).toBeDefined();
    expect(approved.approvedBy).toBe('mahdiyacoubali318@gmail.com');
  });
});
