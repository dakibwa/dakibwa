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
        <p className="detail-summary">{selectedPerson.summary}</p>
      </div>

      <div className="fact-grid">
        <div className="fact-card">
          <span className="fact-label">Role</span>
          <strong>{selectedPerson.role}</strong>
        </div>
        <div className="fact-card">
          <span className="fact-label">Years</span>
          <strong>{selectedPerson.years}</strong>
        </div>
        <div className="fact-card">
          <span className="fact-label">Place</span>
          <strong>{selectedPerson.location}</strong>
        </div>
        <div className="fact-card">
          <span className="fact-label">Occupation</span>
          <strong>{selectedPerson.occupation}</strong>
        </div>
      </div>

      <div className="panel-block">
        <div className="block-heading">
          <h3>Archive note</h3>
          <p>Enough context for V1, with room to deepen the record later on.</p>
        </div>
        <p className="archive-copy">{selectedPerson.archiveNote}</p>
        <div className="tag-row">
          {selectedPerson.tags.map((tag) => (
            <span key={tag} className="tag-chip">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {relationGroups.length ? (
        <div className="panel-block">
          <div className="block-heading">
            <h3>Connected people</h3>
            <p>Jump around the tree without losing your place.</p>
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

      <div className="panel-block">
        <div className="block-heading">
          <h3>Recent notes</h3>
          <p>Short record fragments carried into the public build.</p>
        </div>
        <div className="note-list">
          {selectedPerson.records.slice(0, 3).map((record) => (
            <div key={`${selectedPerson.id}-${record.year}-${record.label}`} className="note-card">
              <span className="note-year">{record.year}</span>
              <strong>{record.label}</strong>
              <p>{record.detail}</p>
            </div>
          ))}
        </div>
      </div>

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
