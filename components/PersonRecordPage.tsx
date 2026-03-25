import React from 'react';
import type { BranchProfile, FamilyPerson } from '../data/familyTree';
import { getBranchById, getFamilyRelations, primaryBranches, recordStateLabel } from '../data/familyTree';

interface PersonRecordPageProps {
  person: FamilyPerson;
  branches: BranchProfile[];
  onBack: (id: string) => void;
  onSelect: (id: string) => void;
}

const branchAccentColor: Record<string, string> = {
  atkinson: '#2f5d50',
  nealon: '#99633d',
  shared: '#345061',
};

const PersonRecordPage: React.FC<PersonRecordPageProps> = ({ person, branches, onBack, onSelect }) => {
  const branch = getBranchById(person.branch) || branches[0];
  const relations = getFamilyRelations(person.id);

  const relationGroups = [
    { label: 'Parents', people: relations.parents },
    { label: 'Spouse', people: relations.spouses },
    { label: 'Children', people: relations.children },
    { label: 'Siblings', people: relations.siblings },
  ].filter((g) => g.people.length > 0);

  const branchCards = person.branch === 'shared' ? primaryBranches : [branch];

  const recordNote =
    person.recordState === 'placeholder'
      ? 'A living-person record kept intentionally minimal.'
      : 'Identity and relationships confirmed. Additional detail is added only when it is verified.';

  return (
    <main id="main-content">
      <button type="button" className="record-back btn-ghost btn" onClick={() => onBack(person.id)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to tree
      </button>

      <div className="record-header">
        <p className="record-eyebrow">
          {person.generation} · {branch.label} · {recordStateLabel[person.recordState]}
        </p>

        <h1 className="record-name">{person.name}</h1>

        <div className="record-facts">
          <div>
            <p className="record-fact-label">Role</p>
            <p className="record-fact-value">{person.role}</p>
          </div>

          <div>
            <p className="record-fact-label">Place</p>
            <p className={`record-fact-value${person.location ? '' : ' record-fact-value--empty'}`}>
              {person.location || 'Unknown'}
            </p>
          </div>

          <div>
            <p className="record-fact-label">Years</p>
            <p className={`record-fact-value${person.years ? '' : ' record-fact-value--empty'}`}>
              {person.years || 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      <div className="record-layout">
        <div>
          <p className="record-section-label">About this record</p>
          <p className="record-about-text">{recordNote}</p>
        </div>

        <div>
          {relationGroups.length > 0 ? (
            <div className="record-sidebar-section">
              <p className="record-section-label">Family</p>
              {relationGroups.map((group) => (
                <div key={group.label} className="record-relation-group">
                  <p className="record-relation-label">{group.label}</p>
                  <div className="record-relation-list">
                    {group.people.map((relative) => (
                      <button
                        key={relative.id}
                        type="button"
                        className="record-relation-btn"
                        onClick={() => onSelect(relative.id)}
                      >
                        {relative.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="record-sidebar-section">
            <p className="record-section-label">Branch</p>
            {branchCards.map((bc) => (
              <div key={bc.id} className="record-branch-item">
                <div
                  className="record-branch-accent"
                  style={{ background: branchAccentColor[bc.id] || '#888' }}
                />
                <p className="record-branch-name">{bc.label}</p>
                <p className="record-branch-strapline">{bc.strapline}</p>
                <p className="record-branch-desc">{bc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default PersonRecordPage;
