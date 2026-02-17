import { EquipmentStatus, LoanReason, LoanStatus, MediaType, OwnerType } from '../types'
import type {
  Building,
  Equipment,
  EquipmentMedia,
  Level,
  LoanTransfer,
  Location,
  Person,
  Team,
  TeamMember,
} from '../types'

// ── UUIDs ──────────────────────────────────────────────────────────────────────
// Pre-generated so that cross-entity references are stable.

// Teams
const TEAM_SIM = 'a1b2c3d4-0001-4000-8000-000000000001'
const TEAM_TRAINING = 'a1b2c3d4-0002-4000-8000-000000000002'
const TEAM_CLINICAL = 'a1b2c3d4-0003-4000-8000-000000000003'
const TEAM_BIOMEDICAL = 'a1b2c3d4-0004-4000-8000-000000000004'

// Persons
const PERSON_ALICE = 'b1b2c3d4-0001-4000-8000-000000000001'
const PERSON_BOB = 'b1b2c3d4-0002-4000-8000-000000000002'
const PERSON_CAROL = 'b1b2c3d4-0003-4000-8000-000000000003'
const PERSON_DAN = 'b1b2c3d4-0004-4000-8000-000000000004'
const PERSON_EVE = 'b1b2c3d4-0005-4000-8000-000000000005'
const PERSON_FRANK = 'b1b2c3d4-0006-4000-8000-000000000006'
const PERSON_GRACE = 'b1b2c3d4-0007-4000-8000-000000000007'
const PERSON_HANK = 'b1b2c3d4-0008-4000-8000-000000000008'

// Buildings
const BUILDING_MAIN = 'c1b2c3d4-0001-4000-8000-000000000001'
const BUILDING_ANNEX = 'c1b2c3d4-0002-4000-8000-000000000002'

// Levels
const LEVEL_MAIN_G = 'd1b2c3d4-0001-4000-8000-000000000001'
const LEVEL_MAIN_1 = 'd1b2c3d4-0002-4000-8000-000000000002'
const LEVEL_MAIN_2 = 'd1b2c3d4-0003-4000-8000-000000000003'
const LEVEL_ANNEX_G = 'd1b2c3d4-0004-4000-8000-000000000004'

// Locations
const LOC_SIM_LAB = 'e1b2c3d4-0001-4000-8000-000000000001'
const LOC_TRAINING_ROOM = 'e1b2c3d4-0002-4000-8000-000000000002'
const LOC_STORE_ROOM = 'e1b2c3d4-0003-4000-8000-000000000003'
const LOC_SKILLS_LAB = 'e1b2c3d4-0004-4000-8000-000000000004'
const LOC_ANNEX_STORE = 'e1b2c3d4-0005-4000-8000-000000000005'
const LOC_WORKSHOP = 'e1b2c3d4-0006-4000-8000-000000000006'

// Equipment
const EQUIP_SIM_KIT = 'f1b2c3d4-0001-4000-8000-000000000001'
const EQUIP_MANIKIN = 'f1b2c3d4-0002-4000-8000-000000000002'
const EQUIP_DEFIB_TRAINER = 'f1b2c3d4-0003-4000-8000-000000000003'
const EQUIP_ULTRASOUND = 'f1b2c3d4-0004-4000-8000-000000000004'
const EQUIP_AIRWAY_KIT = 'f1b2c3d4-0005-4000-8000-000000000005'
const EQUIP_IV_ARM = 'f1b2c3d4-0006-4000-8000-000000000006'
const EQUIP_TASK_TRAINER = 'f1b2c3d4-0007-4000-8000-000000000007'
const EQUIP_BP_SIM = 'f1b2c3d4-0008-4000-8000-000000000008'
const EQUIP_SUTURE_PAD = 'f1b2c3d4-0009-4000-8000-000000000009'
const EQUIP_VENTILATOR = 'f1b2c3d4-0010-4000-8000-000000000010'
const EQUIP_PROJECTOR = 'f1b2c3d4-0011-4000-8000-000000000011'
const EQUIP_CAMERA = 'f1b2c3d4-0012-4000-8000-000000000012'

// Team Members
const TM_ALICE_SIM = 'h1b2c3d4-0001-4000-8000-000000000001'
const TM_DAN_SIM = 'h1b2c3d4-0002-4000-8000-000000000002'
const TM_BOB_TRN = 'h1b2c3d4-0003-4000-8000-000000000003'
const TM_EVE_TRN = 'h1b2c3d4-0004-4000-8000-000000000004'
const TM_CAROL_CSK = 'h1b2c3d4-0005-4000-8000-000000000005'
const TM_GRACE_CSK = 'h1b2c3d4-0006-4000-8000-000000000006'
const TM_FRANK_BME = 'h1b2c3d4-0007-4000-8000-000000000007'

// Loan Transfers
const LOAN_1 = 'g1b2c3d4-0001-4000-8000-000000000001'
const LOAN_2 = 'g1b2c3d4-0002-4000-8000-000000000002'
const LOAN_3 = 'g1b2c3d4-0003-4000-8000-000000000003'
const LOAN_4 = 'g1b2c3d4-0004-4000-8000-000000000004'

// ── Data ───────────────────────────────────────────────────────────────────────

export const mockTeams: Team[] = [
  {
    teamId: TEAM_SIM,
    teamCode: 'SIM',
    name: 'Simulation Team',
    mainContactPersonId: PERSON_ALICE,
    mainLocationId: LOC_SIM_LAB,
    active: true,
  },
  {
    teamId: TEAM_TRAINING,
    teamCode: 'TRN',
    name: 'Training Team',
    mainContactPersonId: PERSON_BOB,
    mainLocationId: LOC_TRAINING_ROOM,
    active: true,
  },
  {
    teamId: TEAM_CLINICAL,
    teamCode: 'CSK',
    name: 'Clinical Skills',
    mainContactPersonId: PERSON_CAROL,
    mainLocationId: LOC_SKILLS_LAB,
    active: true,
  },
  {
    teamId: TEAM_BIOMEDICAL,
    teamCode: 'BME',
    name: 'Biomedical Engineering',
    mainContactPersonId: PERSON_FRANK,
    mainLocationId: LOC_WORKSHOP,
    active: true,
  },
]

export const mockPersons: Person[] = [
  {
    personId: PERSON_ALICE,
    displayName: 'Alice Henderson',
    email: 'alice.henderson@health.qld.gov.au',
    phone: '07 3646 1001',
    teamId: TEAM_SIM,
    active: true,
  },
  {
    personId: PERSON_BOB,
    displayName: 'Bob Marsh',
    email: 'bob.marsh@health.qld.gov.au',
    phone: '07 3646 1002',
    teamId: TEAM_TRAINING,
    active: true,
  },
  {
    personId: PERSON_CAROL,
    displayName: 'Carol Nguyen',
    email: 'carol.nguyen@health.qld.gov.au',
    phone: '07 3646 1003',
    teamId: TEAM_CLINICAL,
    active: true,
  },
  {
    personId: PERSON_DAN,
    displayName: 'Dan Okafor',
    email: 'dan.okafor@health.qld.gov.au',
    phone: '07 3646 1004',
    teamId: TEAM_SIM,
    active: true,
  },
  {
    personId: PERSON_EVE,
    displayName: 'Eve Patterson',
    email: 'eve.patterson@health.qld.gov.au',
    phone: '07 3646 1005',
    teamId: TEAM_TRAINING,
    active: true,
  },
  {
    personId: PERSON_FRANK,
    displayName: 'Frank Reilly',
    email: 'frank.reilly@health.qld.gov.au',
    phone: '07 3646 1006',
    teamId: TEAM_BIOMEDICAL,
    active: true,
  },
  {
    personId: PERSON_GRACE,
    displayName: 'Grace Silva',
    email: 'grace.silva@health.qld.gov.au',
    phone: '07 3646 1007',
    teamId: TEAM_CLINICAL,
    active: true,
  },
  {
    personId: PERSON_HANK,
    displayName: 'Hank Williams',
    email: 'hank.williams@health.qld.gov.au',
    phone: '07 3646 1008',
    teamId: null,
    active: false,
  },
]

export const mockBuildings: Building[] = [
  {
    buildingId: BUILDING_MAIN,
    name: 'Main Education Centre',
    code: 'MEC',
  },
  {
    buildingId: BUILDING_ANNEX,
    name: 'Annex Building',
    code: 'ANX',
  },
]

export const mockLevels: Level[] = [
  {
    levelId: LEVEL_MAIN_G,
    buildingId: BUILDING_MAIN,
    name: 'Ground Floor',
    sortOrder: 0,
  },
  {
    levelId: LEVEL_MAIN_1,
    buildingId: BUILDING_MAIN,
    name: 'Level 1',
    sortOrder: 1,
  },
  {
    levelId: LEVEL_MAIN_2,
    buildingId: BUILDING_MAIN,
    name: 'Level 2',
    sortOrder: 2,
  },
  {
    levelId: LEVEL_ANNEX_G,
    buildingId: BUILDING_ANNEX,
    name: 'Ground Floor',
    sortOrder: 0,
  },
]

export const mockLocations: Location[] = [
  {
    locationId: LOC_SIM_LAB,
    buildingId: BUILDING_MAIN,
    levelId: LEVEL_MAIN_1,
    name: 'Simulation Laboratory',
    contactPersonId: PERSON_ALICE,
    description: 'Primary simulation lab with full AV setup',
  },
  {
    locationId: LOC_TRAINING_ROOM,
    buildingId: BUILDING_MAIN,
    levelId: LEVEL_MAIN_G,
    name: 'Training Room A',
    contactPersonId: PERSON_BOB,
    description: 'General-purpose training room, capacity 30',
  },
  {
    locationId: LOC_STORE_ROOM,
    buildingId: BUILDING_MAIN,
    levelId: LEVEL_MAIN_G,
    name: 'Equipment Store Room',
    contactPersonId: PERSON_DAN,
    description: 'Secure storage for simulation equipment',
  },
  {
    locationId: LOC_SKILLS_LAB,
    buildingId: BUILDING_MAIN,
    levelId: LEVEL_MAIN_2,
    name: 'Clinical Skills Lab',
    contactPersonId: PERSON_CAROL,
    description: 'Dedicated skills training space with task stations',
  },
  {
    locationId: LOC_ANNEX_STORE,
    buildingId: BUILDING_ANNEX,
    levelId: LEVEL_ANNEX_G,
    name: 'Annex Storage',
    contactPersonId: PERSON_FRANK,
    description: 'Overflow equipment storage in annex building',
  },
  {
    locationId: LOC_WORKSHOP,
    buildingId: BUILDING_ANNEX,
    levelId: LEVEL_ANNEX_G,
    name: 'Biomedical Workshop',
    contactPersonId: PERSON_FRANK,
    description: 'Repair and maintenance workshop',
  },
]

export const mockEquipment: Equipment[] = [
  // Parent: Sim Lab Kit (contains Manikin + Defib Trainer)
  {
    equipmentId: EQUIP_SIM_KIT,
    equipmentCode: 'SIM-KIT-001',
    name: 'Sim Lab Kit',
    description: 'Complete simulation lab equipment kit',
    ownerType: OwnerType.Team,
    ownerTeamId: TEAM_SIM,
    ownerPersonId: null,
    contactPersonId: PERSON_ALICE,
    homeLocationId: LOC_SIM_LAB,
    parentEquipmentId: null,
    keyImageUrl: '',
    quickStartFlowChartJson: '{}',
    contentsListJson: '["Manikin","Defibrillator Trainer"]',
    status: EquipmentStatus.Available,
    active: true,
  },
  // Child of Sim Lab Kit
  {
    equipmentId: EQUIP_MANIKIN,
    equipmentCode: 'SIM-MAN-001',
    name: 'Adult Manikin',
    description: 'Full-body adult patient simulator manikin',
    ownerType: OwnerType.Team,
    ownerTeamId: TEAM_SIM,
    ownerPersonId: null,
    contactPersonId: PERSON_ALICE,
    homeLocationId: LOC_SIM_LAB,
    parentEquipmentId: EQUIP_SIM_KIT,
    keyImageUrl: '',
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.Available,
    active: true,
  },
  // Child of Sim Lab Kit
  {
    equipmentId: EQUIP_DEFIB_TRAINER,
    equipmentCode: 'SIM-DEF-001',
    name: 'Defibrillator Trainer',
    description: 'AED training unit with visual prompts',
    ownerType: OwnerType.Team,
    ownerTeamId: TEAM_SIM,
    ownerPersonId: null,
    contactPersonId: PERSON_DAN,
    homeLocationId: LOC_SIM_LAB,
    parentEquipmentId: EQUIP_SIM_KIT,
    keyImageUrl: '',
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.InUse,
    active: true,
  },
  {
    equipmentId: EQUIP_ULTRASOUND,
    equipmentCode: 'TRN-US-001',
    name: 'Ultrasound Trainer',
    description: 'Portable ultrasound simulation trainer',
    ownerType: OwnerType.Team,
    ownerTeamId: TEAM_TRAINING,
    ownerPersonId: null,
    contactPersonId: PERSON_BOB,
    homeLocationId: LOC_TRAINING_ROOM,
    parentEquipmentId: null,
    keyImageUrl: 'https://placehold.co/400x300/5DADE2/ffffff?text=Ultrasound',
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.InUse,
    active: true,
  },
  {
    equipmentId: EQUIP_AIRWAY_KIT,
    equipmentCode: 'CSK-AIR-001',
    name: 'Airway Management Kit',
    description: 'Complete airway management training kit with intubation head',
    ownerType: OwnerType.Team,
    ownerTeamId: TEAM_CLINICAL,
    ownerPersonId: null,
    contactPersonId: PERSON_CAROL,
    homeLocationId: LOC_SKILLS_LAB,
    parentEquipmentId: null,
    keyImageUrl: 'https://placehold.co/400x300/2B9E9E/ffffff?text=Airway+Kit',
    quickStartFlowChartJson: JSON.stringify({
      version: 1,
      nodes: [
        { id: 'n1', type: 'start', position: { x: 250, y: 0 }, data: { label: 'Start' } },
        {
          id: 'n2',
          type: 'step',
          position: { x: 250, y: 100 },
          data: { label: 'Unpack Kit', description: 'Remove all components from carry case' },
        },
        {
          id: 'n3',
          type: 'step',
          position: { x: 250, y: 200 },
          data: { label: 'Inspect Head', description: 'Check intubation head for damage' },
        },
        { id: 'n4', type: 'decision', position: { x: 250, y: 300 }, data: { label: 'Head OK?' } },
        {
          id: 'n5',
          type: 'step',
          position: { x: 50, y: 400 },
          data: { label: 'Report Damage', description: 'Lodge maintenance request' },
        },
        {
          id: 'n6',
          type: 'step',
          position: { x: 250, y: 400 },
          data: {
            label: 'Attach Laryngoscope',
            description: 'Connect blade to handle, test light',
          },
        },
        {
          id: 'n7',
          type: 'step',
          position: { x: 250, y: 500 },
          data: { label: 'Position Airway Adjuncts', description: 'Lay out OPA/NPA sizes on tray' },
        },
        { id: 'n8', type: 'end', position: { x: 250, y: 600 }, data: { label: 'Ready' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', animated: true },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4' },
        { id: 'e4', source: 'n4', target: 'n5', label: 'No' },
        { id: 'e5', source: 'n4', target: 'n6', label: 'Yes' },
        { id: 'e6', source: 'n6', target: 'n7' },
        { id: 'e7', source: 'n7', target: 'n8' },
      ],
    }),
    contentsListJson: JSON.stringify([
      { id: 'c1', label: 'Intubation Head', checked: false, sortOrder: 0 },
      { id: 'c2', label: 'Laryngoscope Set', checked: false, sortOrder: 1 },
      { id: 'c3', label: 'Airway Adjuncts (OPA set)', checked: false, sortOrder: 2 },
      { id: 'c4', label: 'Airway Adjuncts (NPA set)', checked: false, sortOrder: 3 },
      { id: 'c5', label: 'Lubricant Gel', checked: false, sortOrder: 4 },
      { id: 'c6', label: 'Carry Case', checked: false, sortOrder: 5 },
    ]),
    status: EquipmentStatus.Available,
    active: true,
  },
  {
    equipmentId: EQUIP_IV_ARM,
    equipmentCode: 'CSK-IV-001',
    name: 'IV Training Arm',
    description: 'Injectable training arm for venepuncture practice',
    ownerType: OwnerType.Team,
    ownerTeamId: TEAM_CLINICAL,
    ownerPersonId: null,
    contactPersonId: PERSON_GRACE,
    homeLocationId: LOC_SKILLS_LAB,
    parentEquipmentId: null,
    keyImageUrl: '',
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.Available,
    active: true,
  },
  {
    equipmentId: EQUIP_TASK_TRAINER,
    equipmentCode: 'CSK-TT-001',
    name: 'Chest Drain Task Trainer',
    description: 'Procedural task trainer for chest drain insertion',
    ownerType: OwnerType.Person,
    ownerTeamId: null,
    ownerPersonId: PERSON_CAROL,
    contactPersonId: PERSON_CAROL,
    homeLocationId: LOC_SKILLS_LAB,
    parentEquipmentId: null,
    keyImageUrl: '',
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.UnderMaintenance,
    active: true,
  },
  {
    equipmentId: EQUIP_BP_SIM,
    equipmentCode: 'TRN-BP-001',
    name: 'Blood Pressure Simulator',
    description: 'Arm-mounted blood pressure auscultation simulator',
    ownerType: OwnerType.Team,
    ownerTeamId: TEAM_TRAINING,
    ownerPersonId: null,
    contactPersonId: PERSON_EVE,
    homeLocationId: LOC_TRAINING_ROOM,
    parentEquipmentId: null,
    keyImageUrl: '',
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.Available,
    active: true,
  },
  {
    equipmentId: EQUIP_SUTURE_PAD,
    equipmentCode: 'CSK-SP-001',
    name: 'Suture Practice Pad',
    description: 'Silicone wound closure practice pad',
    ownerType: OwnerType.Team,
    ownerTeamId: TEAM_CLINICAL,
    ownerPersonId: null,
    contactPersonId: PERSON_GRACE,
    homeLocationId: LOC_SKILLS_LAB,
    parentEquipmentId: null,
    keyImageUrl: '',
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.Available,
    active: true,
  },
  {
    equipmentId: EQUIP_VENTILATOR,
    equipmentCode: 'SIM-VENT-001',
    name: 'Ventilator Simulator',
    description: 'High-fidelity mechanical ventilator training unit',
    ownerType: OwnerType.Team,
    ownerTeamId: TEAM_SIM,
    ownerPersonId: null,
    contactPersonId: PERSON_DAN,
    homeLocationId: LOC_SIM_LAB,
    parentEquipmentId: null,
    keyImageUrl: '',
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.UnderMaintenance,
    active: true,
  },
  {
    equipmentId: EQUIP_PROJECTOR,
    equipmentCode: 'TRN-PROJ-001',
    name: 'Portable Projector',
    description: 'Short-throw projector for training room presentations',
    ownerType: OwnerType.Team,
    ownerTeamId: TEAM_TRAINING,
    ownerPersonId: null,
    contactPersonId: PERSON_BOB,
    homeLocationId: LOC_TRAINING_ROOM,
    parentEquipmentId: null,
    keyImageUrl: '',
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.Available,
    active: true,
  },
  {
    equipmentId: EQUIP_CAMERA,
    equipmentCode: 'SIM-CAM-001',
    name: 'Debrief Camera',
    description: 'Wide-angle camera for simulation recording and debrief',
    ownerType: OwnerType.Person,
    ownerTeamId: null,
    ownerPersonId: PERSON_DAN,
    contactPersonId: PERSON_DAN,
    homeLocationId: LOC_SIM_LAB,
    keyImageUrl: '',
    parentEquipmentId: null,
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.InUse,
    active: true,
  },
]

export const mockLoanTransfers: LoanTransfer[] = [
  // Active loan: ultrasound from Training -> Clinical Skills
  {
    loanTransferId: LOAN_1,
    equipmentId: EQUIP_ULTRASOUND,
    startDate: '2026-02-10',
    dueDate: '2026-02-24',
    originTeamId: TEAM_TRAINING,
    recipientTeamId: TEAM_CLINICAL,
    reasonCode: LoanReason.Training,
    approverPersonId: PERSON_BOB,
    isInternalTransfer: false,
    status: LoanStatus.Active,
    notes: 'Needed for procedural skills workshop week',
  },
  // Returned loan: defib trainer internal within Sim Team
  {
    loanTransferId: LOAN_2,
    equipmentId: EQUIP_DEFIB_TRAINER,
    startDate: '2026-01-05',
    dueDate: '2026-01-19',
    originTeamId: TEAM_SIM,
    recipientTeamId: TEAM_SIM,
    reasonCode: LoanReason.Simulation,
    approverPersonId: PERSON_ALICE,
    isInternalTransfer: true,
    status: LoanStatus.Returned,
    notes: 'Moved to annex for weekend sim event',
  },
  // Draft loan: BP Sim from Training -> Sim
  {
    loanTransferId: LOAN_3,
    equipmentId: EQUIP_BP_SIM,
    startDate: '2026-03-01',
    dueDate: '2026-03-15',
    originTeamId: TEAM_TRAINING,
    recipientTeamId: TEAM_SIM,
    reasonCode: LoanReason.Simulation,
    approverPersonId: PERSON_EVE,
    isInternalTransfer: false,
    status: LoanStatus.Draft,
    notes: 'Pending approval for March sim session',
  },
  // Active loan: camera from Sim -> Biomedical for service
  {
    loanTransferId: LOAN_4,
    equipmentId: EQUIP_CAMERA,
    startDate: '2026-02-14',
    dueDate: '2026-02-21',
    originTeamId: TEAM_SIM,
    recipientTeamId: TEAM_BIOMEDICAL,
    reasonCode: LoanReason.Service,
    approverPersonId: PERSON_DAN,
    isInternalTransfer: false,
    status: LoanStatus.Active,
    notes: 'Camera sent for firmware update',
  },
]

export const mockTeamMembers: TeamMember[] = [
  {
    teamMemberId: TM_ALICE_SIM,
    teamId: TEAM_SIM,
    personId: PERSON_ALICE,
    role: 'Team Lead',
  },
  {
    teamMemberId: TM_DAN_SIM,
    teamId: TEAM_SIM,
    personId: PERSON_DAN,
    role: 'Simulation Technician',
  },
  {
    teamMemberId: TM_BOB_TRN,
    teamId: TEAM_TRAINING,
    personId: PERSON_BOB,
    role: 'Training Coordinator',
  },
  {
    teamMemberId: TM_EVE_TRN,
    teamId: TEAM_TRAINING,
    personId: PERSON_EVE,
    role: 'Training Officer',
  },
  {
    teamMemberId: TM_CAROL_CSK,
    teamId: TEAM_CLINICAL,
    personId: PERSON_CAROL,
    role: 'Clinical Educator',
  },
  {
    teamMemberId: TM_GRACE_CSK,
    teamId: TEAM_CLINICAL,
    personId: PERSON_GRACE,
    role: 'Skills Instructor',
  },
  {
    teamMemberId: TM_FRANK_BME,
    teamId: TEAM_BIOMEDICAL,
    personId: PERSON_FRANK,
    role: 'Biomedical Engineer',
  },
]

// ── Equipment Media ─────────────────────────────────────────────────────────
// Mock media records — fileUrl uses placeholder image services for demo

export const mockEquipmentMedia: EquipmentMedia[] = [
  {
    equipmentMediaId: 'em-0001',
    equipmentId: EQUIP_AIRWAY_KIT,
    mediaType: MediaType.Image,
    fileName: 'airway-kit-overview.jpg',
    mimeType: 'image/jpeg',
    fileUrl: 'https://placehold.co/400x300/2B9E9E/ffffff?text=Airway+Kit',
    sortOrder: 0,
  },
  {
    equipmentMediaId: 'em-0002',
    equipmentId: EQUIP_AIRWAY_KIT,
    mediaType: MediaType.Image,
    fileName: 'laryngoscope-set.jpg',
    mimeType: 'image/jpeg',
    fileUrl: 'https://placehold.co/400x300/1B3A5F/ffffff?text=Laryngoscope',
    sortOrder: 1,
  },
  {
    equipmentMediaId: 'em-0003',
    equipmentId: EQUIP_AIRWAY_KIT,
    mediaType: MediaType.Attachment,
    fileName: 'airway-kit-manual.pdf',
    mimeType: 'application/pdf',
    fileUrl: '#',
    sortOrder: 2,
  },
  {
    equipmentMediaId: 'em-0004',
    equipmentId: EQUIP_SIM_KIT,
    mediaType: MediaType.Image,
    fileName: 'sim-kit-full.jpg',
    mimeType: 'image/jpeg',
    fileUrl: 'https://placehold.co/400x300/E55B64/ffffff?text=Sim+Lab+Kit',
    sortOrder: 0,
  },
  {
    equipmentMediaId: 'em-0005',
    equipmentId: EQUIP_SIM_KIT,
    mediaType: MediaType.Image,
    fileName: 'sim-kit-open.jpg',
    mimeType: 'image/jpeg',
    fileUrl: 'https://placehold.co/400x300/B8CC26/1B3A5F?text=Kit+Contents',
    sortOrder: 1,
  },
  {
    equipmentMediaId: 'em-0006',
    equipmentId: EQUIP_ULTRASOUND,
    mediaType: MediaType.Image,
    fileName: 'ultrasound-trainer.jpg',
    mimeType: 'image/jpeg',
    fileUrl: 'https://placehold.co/400x300/5DADE2/ffffff?text=Ultrasound',
    sortOrder: 0,
  },
]
