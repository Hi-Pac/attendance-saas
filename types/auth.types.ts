export type UserRole = 'admin' | 'employee'

export interface UserMetadata {
  role: UserRole
  company_id?: string
}
