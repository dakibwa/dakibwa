import React from 'react';
import type { BranchProfile, FamilyPerson } from '../data/familyTree';
import { getBranchById, getFamilyRelations, recordStateLabel } from '../data/familyTree';

interface TreePreviewProps {
  person: FamilyPerson | null;
  branches: BranchProfile[];
  isHovering: boolean;
  onSelect: (id: string) => void;
  onOpenRecord: (id: string) => void;
}

const TreePreview: React.FC<TreePreviewProps> = ({
  person,
  branches,
  isHovering,
  onSelect,
  onOpenRecord,
}) => {
  if (!person) {
    return (
      <aside className="tree-preview" aria-live="polite">
        <div className="tree-preview-topline">
          <span className="tree-preview-mode">Hover to inspect</span>
          <span className="tree-preview-state">Quiet mode</span>
        </div>

        <h2 className="tree-preview-name">Family tree</h2>
        <p className="tree-preview-role">
          Start with any person node. Hover shows a quick card, and clicking pins that record in place.
        </p>

        <div className="tree-preview-meta">
          <span>Tree-first layout</span>
          <span>Living records kept minimal</span>
          <span>Only verified additions go deeper</span>
        </div>

        <p className="tree-preview-empty">
          I also ran a cautious public-record pass before expanding this branch. No extra relatives have been
          attached without stronger evidence.
        </p>
      </aside>
    );
  }

  const branch = getBranchById(person.branch) || branches[0];
  const relations = getFamilyRelations(person.id);

  const relationGroups = [
    { label: 'Parents', people: relations.parents },
    { label: 'Spouse', people: relations.spouses },
    { label: 'Children', people: relations.children },
    { label: 'Siblings', people: relations.siblings },
  ].filter((group) => group.people.length > 0);

  return (
    <aside className="tree-preview" aria-live="polite">
      <div className="tree-preview-topline">
        <span className="tree-preview-mode">{isHovering ? 'Hover preview' : 'Pinned person'}</span>
        <span className="tree-preview-state">{recordStateLabel[person.recordState]}</span>
      </div>

      <h2 className="tree-preview-name">{person.name}</h2>
      <p className="tree-preview-role">{person.summary}</p>

      <div className="tree-preview-meta">
        <span>{person.generation}</span>
        <span>{person.location || 'Location unknown'}</span>
        <span>{person.years || 'Years unknown'}</span>
      </div>

      <div className="tree-preview-branch">
        <div className="tree-preview-branch-bar" style={{ background: branch.accent }} />
        <div>
          <p className="tree-preview-branch-name">{branch.label}</p>
          <p className="tree-preview-branch-copy">{branch.strapline}</p>
          <p className="tree-preview-branch-copy">{branch.description}</p>
        </div>
      </div>

      <div className="tree-preview-facts">
        {person.facts.map((fact) => (
          <div key={`${person.id}:${fact.label}`} className="tree-preview-fact">
            <p className="tree-preview-fact-label">{fact.label}</p>
            <p className="tree-preview-fact-value">{fact.value}</p>
          </div>
        ))}
      </div>

      {relationGroups.length > 0 ? (
        <div className="tree-preview-relations">
          {relationGroups.map((group) => (
            <div key={group.label} className="tree-preview-group">
              <p className="tree-preview-group-label">{group.label}</p>
              <div className="tree-preview-group-list">
                {group.people.map((relative) => (
                  <button
                    key={relative.id}
                    type="button"
                    className="tree-preview-chip"
                    onClick={() => onSelect(relative.id)}
                  >
                    {relative.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="tree-preview-empty">No linked relatives have been added for this record yet.</p>
      )}

      <div className="tree-preview-research">
        <p className="tree-preview-group-label">Research note</p>
        <p className="tree-preview-research-copy">{person.researchNote}</p>
        {person.sources.length > 0 ? (
          <div className="tree-preview-source-list">
            {person.sources.map((source) => (
              <a
                key={`${person.id}:${source.url}`}
                className="tree-preview-source"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                <span>{source.label}</span>
                <span>{source.note}</span>
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <div className="tree-preview-actions">
        <button type="button" className="btn btn-primary" onClick={() => onOpenRecord(person.id)}>
          Open record
        </button>
        <p className="tree-preview-hint">Hover to browse. Click a node to keep it pinned.</p>
      </div>
    </aside>
  );
};

export default TreePreview;
