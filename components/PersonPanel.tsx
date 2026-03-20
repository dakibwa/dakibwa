import React from 'react';
import type { BranchProfile, FamilyPerson } from '../data/familyTree';
import { getBranchById, getFamilyRelations, recordStateLabel } from '../data/familyTree';

interface PersonPanelProps {
  selectedPerson: FamilyPerson;
  branches: BranchProfile[];
  onSelect: (id: string) => void;
  onOpenRecord: (id: string) => void;
  onReset: () => void;
  showReset: boolean;
}

const PersonPanel: React.FC<PersonPanelProps> = ({ selectedPerson, branches, onSelect, onOpenRecord, onReset, showReset }) => {
  const branch = getBranchById(selectedPerson.branch) || branches[0];
  const relations = getFamilyRelations(selectedPerson.id);

  const relationGroups = [
    { label: 'Parents', people: relations.parents },
    { label: 'Spouse', people: relations.spouses },
    { label: 'Children', people: relations.children },
    { label: 'Siblings', people: relations.siblings },
  ].filter((group) => group.people.length > 0);

  return (
    <aside className="detail-panel panel" aria-live="polite" aria-labelledby="selected-person-heading">
      <div className="panel-eyebrow-row">
        <span className={`branch-pill branch-pill--${selectedPerson.branch}`}>{branch.label}</span>
        <span className="record-state-pill">{recordStateLabel[selectedPerson.recordState]}</span>
      </div>

      <div className="detail-heading">
        <p className="section-kicker">Selected record</p>
        <h2 id="selected-person-heading">{selectedPerson.name}</h2>
      </div>

      <div className="fact-grid">
        <div className="fact-card">
          <span className="fact-label">Role</span>
          <strong>{selectedPerson.role}</strong>
        </div>
        <div className="fact-card">
          <span className="fact-label">Years</span>
          <strong>{selectedPerson.years || '—'}</strong>
        </div>
        <div className="fact-card">
          <span className="fact-label">Place</span>
          <strong>{selectedPerson.location || '—'}</strong>
        </div>
      </div>

      {relationGroups.length ? (
        <div className="panel-block">
          <div className="block-heading">
            <h3>Connected people</h3>
          </div>
          <div className="relation-groups">
            {relationGroups.map((group) => (
              <div key={group.label} className="relation-group">
                <span className="relation-label">{group.label}</span>
                <div className="relation-row">
                  {group.people.map((person) => (
                    <button key={person.id} type="button" className="relation-chip" onClick={() => onSelect(person.id)}>
                      {person.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="panel-actions">
        <button type="button" className="button button-primary" onClick={() => onOpenRecord(selectedPerson.id)}>
          Open full record
        </button>
        {showReset ? (
          <button type="button" className="button button-ghost" onClick={onReset}>
            Return to Daniel
          </button>
        ) : null}
      </div>
    </aside>
  );
};

export default PersonPanel;
