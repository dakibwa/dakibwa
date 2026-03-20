import React from 'react';
import type { BranchProfile, FamilyPerson } from '../data/familyTree';
import { getBranchById, getFamilyRelations, primaryBranches, recordStateLabel } from '../data/familyTree';

interface PersonRecordPageProps {
  person: FamilyPerson;
  branches: BranchProfile[];
  onBack: (id: string) => void;
  onSelect: (id: string) => void;
}

const PersonRecordPage: React.FC<PersonRecordPageProps> = ({ person, branches, onBack, onSelect }) => {
  const branch = getBranchById(person.branch) || branches[0];
  const relations = getFamilyRelations(person.id);
  const relationGroups = [
    { label: 'Parents', people: relations.parents },
    { label: 'Spouse', people: relations.spouses },
    { label: 'Children', people: relations.children },
    { label: 'Siblings', people: relations.siblings },
  ].filter((group) => group.people.length > 0);
  const branchCards = person.branch === 'shared' ? primaryBranches : [branch];

  const recordNote =
    person.recordState === 'placeholder'
      ? 'A living-person record, kept intentionally spare.'
      : 'Name and relationships confirmed. Further detail will be added as research continues.';

  return (
    <main id="main-content" className="record-view">
      <section className="record-hero panel">
        <div className="record-topline">
          <button type="button" className="button button-ghost" onClick={() => onBack(person.id)}>
            Back to tree
          </button>
          <span className={`branch-pill branch-pill--${person.branch}`}>{branch.label}</span>
          <span className="record-state-pill">{recordStateLabel[person.recordState]}</span>
        </div>

        <div className="record-hero-copy">
          <p className="section-kicker">{person.generation} · Person record</p>
          <h1>{person.name}</h1>
        </div>

        <div className="record-meta-grid">
          <div className="fact-card">
            <span className="fact-label">Role</span>
            <strong>{person.role}</strong>
          </div>
          <div className="fact-card">
            <span className="fact-label">Years</span>
            <strong>{person.years || '—'}</strong>
          </div>
          <div className="fact-card">
            <span className="fact-label">Place</span>
            <strong>{person.location || '—'}</strong>
          </div>
        </div>
      </section>

      <section className="record-layout">
        <div className="record-main">
          <section className="panel record-section">
            <div className="block-heading">
              <h2>About this record</h2>
            </div>
            <p className="archive-copy">{recordNote}</p>
          </section>
        </div>

        <aside className="record-sidebar">
          {relationGroups.length ? (
            <section className="panel record-section">
              <div className="block-heading">
                <h2>Family links</h2>
              </div>
              <div className="relation-groups">
                {relationGroups.map((group) => (
                  <div key={group.label} className="relation-group">
                    <span className="relation-label">{group.label}</span>
                    <div className="relation-row">
                      {group.people.map((relative) => (
                        <button key={relative.id} type="button" className="relation-chip" onClick={() => onSelect(relative.id)}>
                          {relative.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="panel record-section">
            <div className="block-heading">
              <h2>Branch context</h2>
            </div>
            <div className="branch-context-grid">
              {branchCards.map((branchCard) => (
                <article key={branchCard.id} className={`branch-card branch-card--${branchCard.id}`}>
                  <span className="branch-card-label">{branchCard.label}</span>
                  <strong>{branchCard.strapline}</strong>
                  <p>{branchCard.description}</p>
                  {branchCard.places.length > 0 && (
                    <div className="place-row">
                      {branchCard.places.map((place) => (
                        <span key={place} className="place-pill">
                          {place}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
};

export default PersonRecordPage;
