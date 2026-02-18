import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePowerContext } from '../hooks/usePowerContext'
import { useServices } from './ServiceContext'
import type { Person, TeamMember } from '../types'

const ADMIN_UPNS = ['sean.wing@health.qld.gov.au']

export interface AuthUser {
  upn: string
  fullName: string
  objectId: string
  isAdmin: boolean
  /** Resolved Person record from Dataverse (null if not found) */
  person: Person | null
  /** Team IDs this user belongs to */
  teamIds: string[]
}

interface AuthContextValue {
  user: AuthUser | null
  isAdmin: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const powerCtx = usePowerContext()
  const { personService, teamMemberService } = useServices()
  const [resolvedPerson, setResolvedPerson] = useState<Person | null>(null)
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const upn = powerCtx?.user?.userPrincipalName ?? null

  const resolveUser = useCallback(async () => {
    if (!upn) {
      setLoading(false)
      return
    }

    try {
      // Look up Person record by matching email to UPN
      const result = await personService.getAll({
        filter: `email eq '${upn}'`,
        top: 1,
      })
      const person = result.data[0] ?? null
      setResolvedPerson(person)

      // Look up team memberships if we found a person
      if (person) {
        const memberships = await teamMemberService.getAll({
          filter: `personId eq '${person.personId}'`,
          top: 100,
        })
        setTeamIds(memberships.data.map((m: TeamMember) => m.teamId))
      }
    } catch {
      // If lookup fails, proceed without person context
    } finally {
      setLoading(false)
    }
  }, [upn, personService, teamMemberService])

  useEffect(() => {
    void resolveUser()
  }, [resolveUser])

  const value = useMemo<AuthContextValue>(() => {
    if (!upn) return { user: null, isAdmin: false, loading }

    const isAdmin = ADMIN_UPNS.some(
      (admin) => admin.toLowerCase() === upn.toLowerCase(),
    )

    return {
      user: {
        upn,
        fullName: powerCtx?.user?.fullName ?? upn,
        objectId: powerCtx?.user?.objectId ?? '',
        isAdmin,
        person: resolvedPerson,
        teamIds,
      },
      isAdmin,
      loading,
    }
  }, [upn, powerCtx, resolvedPerson, teamIds, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

/**
 * Check whether the current user can edit an equipment record.
 * Admin can edit anything; otherwise user must own the equipment
 * (directly as a person or via team membership).
 */
export function canEditEquipment(
  user: AuthUser | null,
  ownerPersonId: string | null,
  ownerTeamId: string | null,
): boolean {
  if (!user) return false
  if (user.isAdmin) return true

  // Direct person ownership
  if (ownerPersonId && user.person?.personId === ownerPersonId) return true

  // Team ownership - user is a member of the owning team
  if (ownerTeamId && user.teamIds.includes(ownerTeamId)) return true

  return false
}
