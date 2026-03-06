
export const MOCK_COLUMN_CONFIG = [
  {
    field: 'priority',
    headerName: 'Priority',
    width: 110,
    type: 'dropdown',
    options: ['Urgent', 'High', 'Medium', 'Low'],
    cellClass: (params) => {
      switch (params.value) {
        case 'Urgent':
          return 'text-red-700 font-bold bg-red-100 rounded-md px-2 py-0.5 inline-block';
        case 'High':
          return 'text-orange-700 font-semibold bg-orange-100 rounded-md px-2 py-0.5 inline-block';
        case 'Medium':
          return 'text-blue-700 bg-blue-100 rounded-md px-2 py-0.5 inline-block';
        default:
          return 'text-gray-600 bg-gray-100 rounded-md px-2 py-0.5 inline-block';
      }
    },
  },
  {
    field: 'type',
    headerName: 'Type',
    width: 180,
    type: 'dropdown',
    options: [
      'Existing - Attrition',
      'Existing - New Roles',
      'Closed Won - New Work',
      'Closed Won - Extension',
      'Pipeline - New Work',
      'Pipeline - Extensions',
      'Prospective Demand',
    ],
  },
  {
    field: 'client',
    headerName: 'Client',
    width: 150,
    type: 'text',
    // If you still want an “➕ Add New Client” inline option, add it here:
    options: ['Citibank', 'Wells Fargo', 'Chase', 'Acme Corp', 'Google', 'Amazon', 'Facebook', 'Netflix'],
  },
  { field: 'opportunity',  headerName: 'Opportunity/Project',    width: 200, type: 'text' },
  { field: 'probability',  headerName: 'Probability - %',        width: 130, type: 'number' },
  { field: 'estStartDate', headerName: 'Estimated Start Date',   width: 160, type: 'date' },
  { field: 'estEndDate',   headerName: 'Estimated End Date',     width: 160, type: 'date' },

  { field: 'serviceLine',  headerName: 'Service Line',           width: 150, type: 'dropdown',
    options: ['App Dev', 'Data', 'Cloud', 'QA', 'Management'] },

  { field: 'practice',     headerName: 'Practice',               width: 150, type: 'dropdown',
    options: ['Banking', 'Healthcare', 'Retail', 'Auto'] },

  // NEW: Delivery Unit
  { field: 'deliveryUnit', headerName: 'Delivery Unit',          width: 150, type: 'dropdown',
    options: ['ADM', 'CIS', 'Data', 'Digital', 'Oracle'] },

  // Role (Job Title)
  { field: 'role',         headerName: 'Role',                   width: 180, type: 'text' },

  { field: 'careerLevel',  headerName: 'Career Level (Sr, Jr, Lead)', width: 180, type: 'dropdown',
    options: ['Sr', 'Jr', 'Lead', 'Principal', 'Manager'] },

  { field: 'location',     headerName: 'Location',               width: 120, type: 'dropdown',
    options: ['US', 'India', 'LatAm', 'Remote'] },

  { field: 'skill',        headerName: 'Skill',                  width: 180, type: 'text' },

  { field: 'fulfillment',  headerName: 'Fulfillment',            width: 130, type: 'dropdown',
    options: ['Internal', 'External'] },

  { field: 'status',       headerName: 'Status',                 width: 110, type: 'dropdown',
    options: ['Open', 'Closed', 'On Hold'],
    cellClass: (params) => (params.value === 'Open' ? 'text-green-600 font-medium' : 'text-gray-500') },

  { field: 'externalReqId', headerName: 'External Req in System', width: 180, type: 'text' },

  // NEW: Create Date
  { field: 'createDate',   headerName: 'Create Date',            width: 140, type: 'date' },

  { field: 'notes',        headerName: 'Notes',                  width: 250, type: 'text' },
];

export default MOCK_COLUMN_CONFIG;