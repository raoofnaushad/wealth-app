import { create } from 'zustand'
import { adminApi } from '@/modules/admin/api'
import type {
  OrgUser,
  OrgProfile,
  OrgBranding,
  OrgPreferences,
  Invitation,
  InviteUserRequest,
  ModuleRoleAssignment,
} from '@/modules/admin/types'

interface AdminState {
  // Data
  users: OrgUser[]
  invitations: Invitation[]
  orgProfile: OrgProfile | null
  branding: OrgBranding | null
  preferences: OrgPreferences | null

  // Loading flags
  loadingUsers: boolean
  loadingInvitations: boolean
  loadingOrgProfile: boolean
  loadingBranding: boolean
  loadingPreferences: boolean

  // Actions — fetch
  fetchUsers: () => Promise<void>
  fetchInvitations: () => Promise<void>
  fetchOrgProfile: () => Promise<void>
  fetchBranding: () => Promise<void>
  fetchPreferences: () => Promise<void>

  // Actions — update
  updateOrgProfile: (data: Partial<OrgProfile>) => Promise<void>
  updateBranding: (data: Partial<OrgBranding>) => Promise<void>
  updatePreferences: (data: Partial<OrgPreferences>) => Promise<void>
  updateUserRoles: (userId: string, moduleRoles: ModuleRoleAssignment[]) => Promise<void>
  updateUserStatus: (userId: string, status: OrgUser['status']) => Promise<void>
  removeUser: (userId: string) => Promise<void>
  sendInvitation: (data: InviteUserRequest) => Promise<void>
  cancelInvitation: (invitationId: string) => Promise<void>
}

export const useAdminStore = create<AdminState>((set, get) => ({
  // Initial state
  users: [],
  invitations: [],
  orgProfile: null,
  branding: null,
  preferences: null,

  loadingUsers: false,
  loadingInvitations: false,
  loadingOrgProfile: false,
  loadingBranding: false,
  loadingPreferences: false,

  // Fetch actions
  fetchUsers: async () => {
    set({ loadingUsers: true })
    try {
      const users = await adminApi.listUsers()
      set({ users, loadingUsers: false })
    } catch {
      set({ loadingUsers: false })
    }
  },

  fetchInvitations: async () => {
    set({ loadingInvitations: true })
    try {
      const invitations = await adminApi.listInvitations()
      set({ invitations, loadingInvitations: false })
    } catch {
      set({ loadingInvitations: false })
    }
  },

  fetchOrgProfile: async () => {
    set({ loadingOrgProfile: true })
    try {
      const orgProfile = await adminApi.getOrganization()
      set({ orgProfile, loadingOrgProfile: false })
    } catch {
      set({ loadingOrgProfile: false })
    }
  },

  fetchBranding: async () => {
    set({ loadingBranding: true })
    try {
      const branding = await adminApi.getBranding()
      set({ branding, loadingBranding: false })
    } catch {
      set({ loadingBranding: false })
    }
  },

  fetchPreferences: async () => {
    set({ loadingPreferences: true })
    try {
      const preferences = await adminApi.getPreferences()
      set({ preferences, loadingPreferences: false })
    } catch {
      set({ loadingPreferences: false })
    }
  },

  // Update actions
  updateOrgProfile: async (data) => {
    const updated = await adminApi.updateOrganization(data)
    set({ orgProfile: updated })
  },

  updateBranding: async (data) => {
    const updated = await adminApi.updateBranding(data)
    set({ branding: updated })
  },

  updatePreferences: async (data) => {
    const updated = await adminApi.updatePreferences(data)
    set({ preferences: updated })
  },

  updateUserRoles: async (userId, moduleRoles) => {
    const updated = await adminApi.updateUser(userId, { moduleRoles })
    set({
      users: get().users.map((u) => (u.id === userId ? updated : u)),
    })
  },

  updateUserStatus: async (userId, status) => {
    const updated = await adminApi.updateUser(userId, { status })
    set({
      users: get().users.map((u) => (u.id === userId ? updated : u)),
    })
  },

  removeUser: async (userId) => {
    await adminApi.removeUser(userId)
    set({ users: get().users.filter((u) => u.id !== userId) })
  },

  sendInvitation: async (data) => {
    const invitation = await adminApi.sendInvitation(data)
    set({ invitations: [...get().invitations, invitation] })
  },

  cancelInvitation: async (invitationId) => {
    await adminApi.cancelInvitation(invitationId)
    set({ invitations: get().invitations.filter((i) => i.id !== invitationId) })
  },
}))
