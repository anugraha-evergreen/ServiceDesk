export const CONSTRUCTION_RULES_VERSION = '16 Nov 2026';

export const ASSOCIATION_FULL_NAME = 'Anugraha Evergreen Owners Welfare Association (AEOWA)';

export const CONSTRUCTION_RULES_TITLE =
  'Anugraha Evergreen Owners Welfare Association (AEOWA) Mandatory Construction Rules and Guidelines (16 Nov 2026)';

export interface RuleSection {
  title: string;
  points: string[];
}

export const CONSTRUCTION_RULES: RuleSection[] = [
  {
    title: '1. Association Membership & Pre-Requisites',
    points: [
      'Plot owner must be an active member of Anugraha Evergreen Owners Welfare Association (AEOWA) with the one-time membership fee of ₹1,000 cleared.',
      'All pending layout maintenance dues up to the current quarter must be fully cleared before applying for Construction NOC.',
      'A refundable Security Deposit of ₹20,000 must be deposited into the AEOWA escrow bank account. The transaction reference (UTR) and date must be submitted during NOC verification.',
    ],
  },
  {
    title: '2. Working Hours & Noise Regulations',
    points: [
      'Permitted construction hours are strictly between 8:00 AM and 6:00 PM, Monday through Saturday.',
      'No heavy machinery, concrete mixers, stone cutting, or noisy construction activities are permitted on Sundays or layout-designated public holidays.',
      'Ready-Mix Concrete (RMC) trucks and delivery trailers must only enter the layout during permitted daylight hours with prior security notification.',
    ],
  },
  {
    title: '3. Worker Sanitation & Temporary Facilities',
    points: [
      'A temporary functioning toilet and bathroom connected to the underground drainage (UGD) inspection chamber or septic tank must be constructed on-site before commencing any primary construction.',
      'Open defecation or urination by construction labourers anywhere within the layout premises or adjacent plots is strictly prohibited and will attract a penalty of ₹5,000 per violation from the deposit.',
      'All on-site labourers must be registered with the site supervisor and layout security desk with valid identification.',
    ],
  },
  {
    title: '4. Setbacks, Debris & Common Infrastructure Protection',
    points: [
      'Building plans must strictly conform to local planning authority approved setbacks. Construction must not encroach into roads, footpaths, or neighbouring plot boundaries.',
      'Building materials (sand, blue metal, bricks) must be stored inside plot boundaries. Stacking materials on asphalt roads or pedestrian walkways without prior Association written permission is prohibited.',
      'Cement mixing directly on layout asphalt roads is strictly banned. A metal mixing tray or tarp must be placed underneath at all times.',
      'Any damage caused to asphalt roads, culverts, streetlights, storm water drains, or underground utilities by delivery trucks or earthmovers must be repaired at the owner’s cost, deductible from the ₹20,000 security deposit.',
    ],
  },
  {
    title: '5. Water & Electricity Connections',
    points: [
      'Temporary construction electricity must be legally obtained through BESCOM. Drawing unauthorized power from streetlights or neighbouring connections is illegal and will lead to an immediate NOC cancellation.',
      'Borewell drilling requires prior Association notification to coordinate heavy rig movement.',
    ],
  },
  {
    title: '6. Rainwater Harvesting & Completion Clearance',
    points: [
      'Rainwater harvesting (RWH) setup with a dedicated groundwater recharge pit of prescribed capacity is mandatory under Bangalore Water Supply and Sewerage Board (BWSSB) regulations and layout sustainability norms.',
      'Upon completion of construction, the Managing Committee will conduct a physical inspection to verify total debris removal, road/drain condition, and RWH installation before processing the ₹20,000 security deposit refund.',
    ],
  },
];
