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

const PersonPanel: React.FC<PersonPanelProps> = ({
  selectedPerson,
  branches,
  onSelect,
  onOpenRecord,
  onReset,
  showReset,
}) => {
  const branch = getBranchById(selectedPerson.branch) || branches[0];
  const relations = getFamilyRelations(selectedPerson.id);

  const relationGroups = [
    { label: 'Parents', people: relations.parents },
    { label: 'Spouse', people: relations.spouses },
    { label: 'Children', people: relations.children },
    { label: 'Siblings', people: relations.siblings },
  ].filter((g) => g.people.length > 0);

  const metaParts: string[] = [];
  if (selectedPerson.location) metaParts.push(selectedPerson.location);
  if (selectedPerson.years) metaParts.push(selectedPerson.years);

  return (
    <aside className="person-panel" aria-live="polite" aria-labelledby="panel-person-name">
      <span className="person-panel-tag">
        {selectedPerson.generation} · {recordStateLabel[selectedPerson.recordState]}
      </span>

      <p className="person-panel-name" id="panel-person-name">
        {selectedPerson.name}
      </p>

      <p className="person-panel-meta">
        {selectedPerson.role}
        {metaParts.length > 0 ? ` · ${metaParts.join(' · ')}` : ''}
      </p>

      {relationGroups.length > 0 ? (
        <>
          <hr className="person-panel-divider" />

          {relationGroups.map((group) => (
            <div key={group.label} className="relation-group">
              <span className="relation-label">{group.label}</span>
              <div className="relation-list">
                {group.people.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    className="relation-btn"
                    onClick={() => onSelect(person.id)}
                  >
                    {person.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      ) : null}

      <div className="person-panel-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onOpenRecord(selectedPerson.id)}
        >
          Open record
        </button>

        {showReset ? (
          <button type="button" className="btn btn-ghost" onClick={onReset}>
            Return to Daniel
          </button>
        ) : null}
      </div>
    </aside>
  );
};

export default PersonPanel;
