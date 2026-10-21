import type { Recipe } from './recipe.js';
export const sampleCsv = 'Name,Email,Customer ID\n Maya Khan , MAYA@example.com ,0012\nMaya duplicate,maya@example.com,0013\n Sami Roy , SAMI@example.com ,0007\nNo email,,0009\nAnother no email,,0010\n,,\n';
export const secondCsv = 'Customer ID,Email,Name\n0021, RINA@example.com , Rina Das \n0022,rina@example.com,Rina duplicate\n0023,LEE@example.com, Lee Park \n';
export const sampleRecipe: Recipe = {
  version: 1, title: 'A little less contact cleanup', requiredHeaders: ['Name', 'Email', 'Customer ID'],
  operations: [
    { type: 'trim', column: 'Name', references: ['instruction'] },
    { type: 'trim', column: 'Email', references: ['instruction'] },
    { type: 'lowercase', column: 'Email', references: ['instruction'] },
    { type: 'remove_empty_rows', references: ['instruction'] },
    { type: 'deduplicate', key: ['Email'], keep: 'first', references: ['instruction'] },
  ],
  assumptions: ['Rows with blank deduplication keys are kept separately.', 'This is a fictional, hand-authored sample; no AI call is made.'],
  sources: [{ id: 'instruction', label: 'Fictional sample instructions: trim Name and Email, lowercase Email, remove empty rows, deduplicate Email keeping first.', kind: 'instruction' }],
  model: { id: 'fictional-hand-authored-sample', provider: 'none', upstream: 'none' },
};
