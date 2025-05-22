const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  EXECUTIVE: 'Executive',
  PROPERTY_OWNER: 'Property Owner',
  TENANT: 'Tenant',
};

const COMPLAINT_CATEGORIES = [
  "Security",
  "Utilities", // e.g., Power, Water
  "Maintenance", // e.g., Plumbing, Electrical, Building Structure
  "Admin/Management",
  "Noise Complaint",
  "Waste Management",
  "Parking",
  "Other",
];

const COMPLAINT_STATUSES = [
  'Submitted',
  'Under Review',
  'In Progress',
  'Resolved',
  'Closed', // Final state, issue resolved and verified or cannot be resolved
  'Rejected', // Invalid complaint or out of scope
];


module.exports = {
  ROLES,
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
};
