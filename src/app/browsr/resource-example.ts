import type { ResourceDetail } from './resource-data';

/**
 * The made-up resource on the FHIR Resources page's welcome card. It has every part a real card has
 * (key and extra fields, a required one, a nested group, a sample) so newcomers see what to expect.
 * It is labelled as not real wherever it shows: there is no Example resource in FHIR.
 */
export const EXAMPLE_NAME = 'Example';

export const EXAMPLE_BLURB =
  "a made-up record, here to show the parts of every card. There's no Example resource in FHIR.";

export const EXAMPLE_NOTES: readonly string[] = [
  'Real cards have notes like this one: companion guides, common mix-ups, and where related data lives.',
];

export const EXAMPLE_DETAIL: ResourceDetail = {
  spec: '',
  example: '',
  schema: [
    {
      name: 'identifier',
      card: '0..*',
      type: 'Identifier',
      short: 'An ID for this record, like a record number',
      required: false,
      key: true,
    },
    {
      name: 'status',
      card: '1..1',
      type: 'code',
      short: 'draft | active | retired',
      required: true,
      key: true,
    },
    {
      name: 'subject',
      card: '0..1',
      type: 'Reference(Patient)',
      short: 'Who this record is about',
      required: false,
      key: true,
    },
    {
      name: 'item',
      card: '0..*',
      type: '',
      short: 'A list of items, each with its own fields',
      required: false,
      key: true,
      children: [
        {
          name: 'linkId',
          card: '1..1',
          type: 'string',
          short: 'A unique ID for this item',
          required: true,
        },
        {
          name: 'text',
          card: '0..1',
          type: 'string',
          short: 'The words shown for this item',
          required: false,
        },
        {
          name: 'item',
          card: '0..*',
          type: '',
          short: 'Items inside this item',
          required: false,
          sameAs: 'item',
        },
      ],
    },
    {
      name: 'date',
      card: '0..1',
      type: 'dateTime',
      short: 'When this record last changed',
      required: false,
      key: false,
    },
    {
      name: 'author',
      card: '0..1',
      type: 'Reference(Practitioner | Organization)',
      short: 'Who wrote it',
      required: false,
      key: false,
    },
  ],
  sample: {
    resourceType: 'Example',
    id: 'example-1',
    identifier: [{ system: 'http://example.org/records', value: '12345' }],
    status: 'active',
    subject: { reference: 'Patient/example' },
    item: [
      {
        linkId: '1',
        text: 'First item',
        item: [{ linkId: '1.1', text: 'An item inside the first' }],
      },
    ],
    date: '2026-10-27',
    author: { reference: 'Practitioner/example' },
  },
  relations: [
    {
      p: [
        {
          text: "Most real cards can open the spec's own notes on where a resource stops and others take over, like ",
        },
        { text: 'Observation', resource: 'Observation' },
        { text: ' versus ' },
        { text: 'DiagnosticReport', resource: 'DiagnosticReport' },
        { text: '. Resources with a card here link to it; the rest open in the spec.' },
      ],
    },
  ],
};
