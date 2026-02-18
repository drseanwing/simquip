import type { Equipment, Location, Person, Team } from '../types'
import type { DataService, ListOptions, PagedResult } from './dataService'
import { validateEquipment } from './validators'

/** Extended equipment record with resolved owner and location details. */
export interface EquipmentWithDetails {
  equipment: Equipment
  ownerTeam: Team | null
  ownerPerson: Person | null
  contactPerson: Person | null
  homeLocation: Location | null
}

/**
 * Equipment-specific service that wraps a generic {@link DataService<Equipment>}
 * and adds domain-level convenience methods.
 */
export class EquipmentService {
  private readonly equipmentDataService: DataService<Equipment>
  private readonly teamDataService: DataService<Team>
  private readonly personDataService: DataService<Person>
  private readonly locationDataService: DataService<Location>

  constructor(
    equipmentDataService: DataService<Equipment>,
    teamDataService: DataService<Team>,
    personDataService: DataService<Person>,
    locationDataService: DataService<Location>,
  ) {
    this.equipmentDataService = equipmentDataService
    this.teamDataService = teamDataService
    this.personDataService = personDataService
    this.locationDataService = locationDataService
  }

  /** Delegates to the underlying data service. */
  getAll(options?: ListOptions): Promise<PagedResult<Equipment>> {
    return this.equipmentDataService.getAll(options)
  }

  /** Delegates to the underlying data service. */
  getById(id: string): Promise<Equipment> {
    return this.equipmentDataService.getById(id)
  }

  /** Delegates to the underlying data service. */
  delete(id: string): Promise<void> {
    return this.equipmentDataService.delete(id)
  }

  /**
   * Fetches an equipment record together with its resolved owner, contact
   * person, and home location.
   *
   * Related entities that cannot be found are returned as `null` rather than
   * throwing, because a dangling FK should not prevent viewing the equipment.
   */
  async getEquipmentWithDetails(id: string): Promise<EquipmentWithDetails> {
    const equipment = await this.equipmentDataService.getById(id)

    const [ownerTeam, ownerPerson, contactPerson, homeLocation] = await Promise.all([
      equipment.ownerTeamId ? this.safeGetById(this.teamDataService, equipment.ownerTeamId) : null,
      equipment.ownerPersonId
        ? this.safeGetById(this.personDataService, equipment.ownerPersonId)
        : null,
      this.safeGetById(this.personDataService, equipment.contactPersonId),
      this.safeGetById(this.locationDataService, equipment.homeLocationId),
    ])

    return { equipment, ownerTeam, ownerPerson, contactPerson, homeLocation }
  }

  /**
   * Returns all equipment whose `parentEquipmentId` matches the given id.
   */
  async getChildEquipment(parentId: string): Promise<Equipment[]> {
    const sanitizedId = parentId.replace(/'/g, "''")
    const result = await this.equipmentDataService.getAll({
      filter: `parentEquipmentId eq '${sanitizedId}'`,
    })
    return result.data
  }

  /**
   * Validates an equipment record then creates it.
   * Throws a `ValidationError` (with the first failure) when validation
   * does not pass.
   */
  async validateAndCreate(equipment: Partial<Equipment>): Promise<Equipment> {
    const errors = validateEquipment(equipment)
    if (errors.length > 0) {
      throw errors[0]
    }
    return this.equipmentDataService.create(equipment)
  }

  /**
   * Validates a partial equipment update then applies it.
   * The update is merged with the existing record before validation so that
   * required-field checks see the full picture.
   */
  async validateAndUpdate(id: string, updates: Partial<Equipment>): Promise<Equipment> {
    const existing = await this.equipmentDataService.getById(id)
    const merged = { ...existing, ...updates }

    const errors = validateEquipment(merged)
    if (errors.length > 0) {
      throw errors[0]
    }
    return this.equipmentDataService.update(id, updates)
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Attempts to fetch a record by id; returns `null` instead of throwing when
   * the record does not exist.
   */
  private async safeGetById<U>(service: DataService<U>, id: string): Promise<U | null> {
    try {
      return await service.getById(id)
    } catch {
      return null
    }
  }
}
