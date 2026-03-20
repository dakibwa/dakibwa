import React from 'react';
import type { FamilyPerson } from '../data/familyTree';
import { getFamilyRelations } from '../data/familyTree';

interface FamilyTreeProps {
  people: FamilyPerson[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const TREE_WIDTH = 880;
const TREE_HEIGHT = 560;
const NODE_WIDTH = 104;
const NODE_HEIGHT = 76;

const generationRows = [
  { label: 'Grandparents', y: 0.18 },
  { label: 'Parents', y: 0.5 },
  { label: 'Current', y: 0.82 },
];

const toPoint = (person: FamilyPerson) => ({
  x: person.position.x * TREE_WIDTH,
  y: person.position.y * TREE_HEIGHT,
});

const FamilyTree: React.FC<FamilyTreeProps> = ({ people, selectedId, onSelect }) => {
  const selectedPerson = people.find((person) => person.id === selectedId) || people[0];
  const relations = getFamilyRelations(selectedPerson.id);
  const connectedIds = new Set([
    selectedPerson.id,
    ...relations.parents.map((person) => person.id),
    ...relations.spouses.map((person) => person.id),
    ...relations.children.map((person) => person.id),
    ...relations.siblings.map((person) => person.id),
  ]);

  const spouseEdges: Array<{ key: string; source: FamilyPerson; target: FamilyPerson }> = [];
  const parentEdges: Array<{ key: string; source: FamilyPerson; target: FamilyPerson }> = [];

  people.forEach((person) => {
    person.spouseIds.forEach((spouseId) => {
      if (person.id < spouseId) {
        const spouse = people.find((candidate) => candidate.id === spouseId);
        if (spouse) {
          spouseEdges.push({ key: `${person.id}:${spouse.id}`, source: person, target: spouse });
        }
      }
    });

    person.parentIds.forEach((parentId) => {
      const parent = people.find((candidate) => candidate.id === parentId);
      if (parent) {
        parentEdges.push({ key: `${parent.id}:${person.id}`, source: parent, target: person });
      }
    });
  });

  return (
    <div className="tree-shell">
      <div className="tree-scroll">
        <div className="tree-stage" style={{ width: TREE_WIDTH, height: TREE_HEIGHT }}>
          <div className="tree-ribbon tree-ribbon--atkinson" />
          <div className="tree-ribbon tree-ribbon--nealon" />
          <div className="tree-ribbon tree-ribbon--shared" />

          {generationRows.map((row) => (
            <div key={row.label} className="generation-label" style={{ top: row.y * TREE_HEIGHT }}>
              {row.label}
            </div>
          ))}

          <svg
            className="tree-svg"
            viewBox={`0 0 ${TREE_WIDTH} ${TREE_HEIGHT}`}
            role="img"
            aria-label="Clickable family tree spanning both main family branches"
          >
            {spouseEdges.map((edge) => {
              const source = toPoint(edge.source);
              const target = toPoint(edge.target);
              const active = connectedIds.has(edge.source.id) || connectedIds.has(edge.target.id);

              return (
                <line
                  key={edge.key}
                  className={`tree-edge tree-edge--spouse ${active ? 'is-active' : ''}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                />
              );
            })}

            {parentEdges.map((edge) => {
              const source = toPoint(edge.source);
              const target = toPoint(edge.target);
              const startY = source.y + NODE_HEIGHT / 2 - 6;
              const endY = target.y - NODE_HEIGHT / 2 + 6;
              const controlY = startY + (endY - startY) * 0.42;
              const active = edge.source.id === selectedId || edge.target.id === selectedId || connectedIds.has(edge.source.id) || connectedIds.has(edge.target.id);
              const path = `M ${source.x} ${startY} C ${source.x} ${controlY}, ${target.x} ${controlY}, ${target.x} ${endY}`;

              return <path key={edge.key} className={`tree-edge tree-edge--family ${active ? 'is-active' : ''}`} d={path} />;
            })}
          </svg>

          {people.map((person) => {
            const point = toPoint(person);
            const isSelected = person.id === selectedId;
            const isConnected = connectedIds.has(person.id);

            return (
              <button
                key={person.id}
                type="button"
                className={`tree-node branch-${person.branch} ${isSelected ? 'is-selected' : ''} ${!isSelected && isConnected ? 'is-connected' : ''}`}
                style={{
                  left: point.x - NODE_WIDTH / 2,
                  top: point.y - NODE_HEIGHT / 2,
                  width: NODE_WIDTH,
                  minHeight: NODE_HEIGHT,
                }}
                onClick={() => onSelect(person.id)}
                aria-pressed={isSelected}
                title={`${person.name} — ${person.role}`}
              >
                <span className="tree-node-name">{person.shortName}</span>
                <span className="tree-node-years">{person.years}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="tree-note">
        Click any person to inspect the record. On smaller screens the tree keeps its full shape and can be panned sideways.
      </p>
    </div>
  );
};

export default FamilyTree;
