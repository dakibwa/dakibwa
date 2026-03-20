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
          <p className="section-kicker">Person record</p>
          <h1>{person.name}</h1>
          <p>{person.summary}</p>
        </div>

        <div className="record-meta-grid">
          <div className="fact-card">
            <span className="fact-label">Role</span>
            <strong>{person.role}</strong>
          </div>
          <div className="fact-card">
            <span className="fact-label">Years</span>
            <strong>{person.years}</strong>
          </div>
          <div className="fact-card">
            <span className="fact-label">Place</span>
            <strong>{person.location}</strong>
          </div>
          <div className="fact-card">
            <span className="fact-label">Occupation</span>
            <strong>{person.occupation}</strong>
          </div>
        </div>
      </section>

      <section className="record-layout">
        <div className="record-main">
          <section className="panel record-section">
            <div className="block-heading">
              <h2>Profile note</h2>
              <p>This page is public-facing and intentionally calm on private detail.</p>
            </div>
            <p className="archive-copy">{person.archiveNote}</p>
            <div className="tag-row">
              {person.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section className="panel record-section">
            <div className="block-heading">
              <h2>Archive trail</h2>
              <p>First-pass notes showing how fuller documents and memories will sit in later versions.</p>
            </div>
            <div className="timeline-list">
              {person.records.map((record) => (
                <article key={`${person.id}-${record.year}-${record.label}`} className="timeline-card">
                  <span className="note-year">{record.year}</span>
                  <strong>{record.label}</strong>
                  <p>{record.detail}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="record-sidebar">
          {relationGroups.length ? (
            <section className="panel record-section">
              <div className="block-heading">
                <h2>Family links</h2>
                <p>Move between related records without leaving the public view.</p>
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
              <p>Both family branches stay visible, even when a single record is open.</p>
            </div>
            <div className="branch-context-grid">
              {branchCards.map((branchCard) => (
                <article key={branchCard.id} className={`branch-card branch-card--${branchCard.id}`}>
                  <span className="branch-card-label">{branchCard.label}</span>
                  <strong>{branchCard.strapline}</strong>
                  <p>{branchCard.description}</p>
                  <div className="place-row">
                    {branchCard.places.map((place) => (
                      <span key={place} className="place-pill">
                        {place}
                      </span>
                    ))}
                  </div>
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
