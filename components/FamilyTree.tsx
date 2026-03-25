import React from 'react';
import type { FamilyPerson } from '../data/familyTree';
import { getFamilyRelations } from '../data/familyTree';

interface FamilyTreeProps {
  people: FamilyPerson[];
  selectedId: string;
  hoveredId?: string | null;
  onSelect: (id: string) => void;
  onHover?: (id: string | null) => void;
}

const W = 1040;
const H = 620;
const R = 13;
const PAD = 72;

const cx = (person: FamilyPerson) => PAD + person.position.x * (W - PAD * 2);
const cy = (person: FamilyPerson) => PAD + person.position.y * (H - PAD * 2);

const generationRows = [
  { label: 'Grandparents', y: 0.18 },
  { label: 'Parents', y: 0.5 },
  { label: 'Current', y: 0.82 },
];

const FamilyTree: React.FC<FamilyTreeProps> = ({ people, selectedId, hoveredId, onSelect, onHover }) => {
  const focusId = hoveredId || selectedId;
  const selectedPerson = people.find((p) => p.id === focusId) || people[0];
  const relations = getFamilyRelations(selectedPerson.id);
  const connectedIds = new Set([
    selectedPerson.id,
    ...relations.parents.map((p) => p.id),
    ...relations.spouses.map((p) => p.id),
    ...relations.children.map((p) => p.id),
    ...relations.siblings.map((p) => p.id),
  ]);

  const spouseEdges: Array<{ key: string; a: FamilyPerson; b: FamilyPerson }> = [];
  const parentEdges: Array<{ key: string; parent: FamilyPerson; child: FamilyPerson }> = [];

  people.forEach((person) => {
    person.spouseIds.forEach((sid) => {
      if (person.id < sid) {
        const spouse = people.find((p) => p.id === sid);
        if (spouse) spouseEdges.push({ key: `${person.id}:${sid}`, a: person, b: spouse });
      }
    });
    person.parentIds.forEach((pid) => {
      const parent = people.find((p) => p.id === pid);
      if (parent) parentEdges.push({ key: `${pid}:${person.id}`, parent, child: person });
    });
  });

  return (
    <div>
      <div className="tree-stage-wrap">
        <svg
          className="tree-svg"
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          role="img"
          aria-label="Family tree showing three generations"
        >
          {/* Generation labels */}
          {generationRows.map((row) => (
            <text
              key={row.label}
              className="tree-gen-label"
              x={8}
              y={PAD + row.y * (H - PAD * 2) + 4}
            >
              {row.label}
            </text>
          ))}

          {/* Spouse edges */}
          {spouseEdges.map(({ key, a, b }) => {
            const ax = cx(a);
            const ay = cy(a);
            const bx = cx(b);
            const active = connectedIds.has(a.id) && connectedIds.has(b.id);
            return (
              <line
                key={key}
                className={`tree-edge${active ? ' is-active' : ''}`}
                x1={ax + R}
                y1={ay}
                x2={bx - R}
                y2={ay}
              />
            );
          })}

          {/* Parent→child edges */}
          {parentEdges.map(({ key, parent, child }) => {
            const px = cx(parent);
            const py = cy(parent);
            const chx = cx(child);
            const chy = cy(child);
            const sy = py + R;
            const ey = chy - R;
            const my = sy + (ey - sy) * 0.45;
            const path = `M ${px} ${sy} C ${px} ${my}, ${chx} ${my}, ${chx} ${ey}`;
            const active =
              connectedIds.has(parent.id) && connectedIds.has(child.id);
            return (
              <path
                key={key}
                className={`tree-edge${active ? ' is-active' : ''}`}
                d={path}
              />
            );
          })}

          {/* Nodes */}
          {people.map((person) => {
            const x = cx(person);
            const y = cy(person);
            const isSelected = person.id === selectedId;
            const isHovered = person.id === hoveredId;
            const isConnected = !isSelected && connectedIds.has(person.id);
            const parts = person.shortName.split(' ');
            const firstName = parts[0];
            const lastName = parts.slice(1).join(' ');

            return (
              <g
                key={person.id}
                className={`tree-node-group${isSelected ? ' is-selected' : ''}${isHovered ? ' is-hovered' : ''}${isConnected ? ' is-connected' : ''}`}
                onClick={() => onSelect(person.id)}
                onMouseEnter={() => onHover?.(person.id)}
                onMouseLeave={() => onHover?.(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(person.id);
                  }
                }}
                onFocus={() => onHover?.(person.id)}
                onBlur={() => onHover?.(null)}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${person.name}, ${person.role}`}
              >
                {(isSelected || isHovered) ? (
                  <circle className="tree-node-halo" cx={x} cy={y} r={R + 12} />
                ) : null}
                <circle className="tree-node-circle" cx={x} cy={y} r={R} />
                <text className="tree-node-name-text" x={x} y={y + R + 15}>
                  {firstName}
                </text>
                {lastName ? (
                  <text className="tree-node-name-text" x={x} y={y + R + 27}>
                    {lastName}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      <p className="tree-note">
        Hover any node to inspect it, click to pin it, and use Tab plus Enter if you prefer the keyboard.
      </p>
    </div>
  );
};

export default FamilyTree;
